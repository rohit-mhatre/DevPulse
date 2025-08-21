#!/usr/bin/env tsx

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { PerformanceMonitor, formatBytes, formatDuration } from '../utils/benchmark-utils';
import cron from 'node-cron';

const config = require('../../benchmark.config.js');

interface PerformanceAlert {
  timestamp: Date;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'response_time';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  metadata?: Record<string, any>;
}

interface PerformanceSnapshot {
  timestamp: Date;
  system: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  application: {
    processes: Array<{
      pid: number;
      name: string;
      cpu: number;
      memory: number;
    }>;
    apiResponseTimes: number[];
    databaseQueryTimes: number[];
  };
  alerts: PerformanceAlert[];
}

class ContinuousPerformanceMonitor {
  private monitor: PerformanceMonitor;
  private isRunning = false;
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private snapshotInterval?: NodeJS.Timeout;
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  constructor() {
    this.monitor = new PerformanceMonitor();
  }

  start(): void {
    if (this.isRunning) {
      console.log(chalk.yellow('⚠️  Performance monitor is already running'));
      return;
    }

    console.log(chalk.blue('📊 Starting continuous performance monitoring...'));
    this.isRunning = true;
    
    // Start system monitoring
    this.monitor.startMonitoring(config.monitoring.interval);
    
    // Start periodic snapshots
    this.snapshotInterval = setInterval(() => {
      this.takeSnapshot().catch(error => {
        console.error('Error taking performance snapshot:', error);
      });
    }, config.monitoring.interval * 5); // Take snapshot every 5 monitoring cycles

    // Setup scheduled reports
    this.setupScheduledReports();

    console.log(chalk.green('✅ Performance monitoring started'));
    console.log(chalk.gray(`   Monitoring interval: ${config.monitoring.interval}ms`));
    console.log(chalk.gray(`   Snapshot interval: ${config.monitoring.interval * 5}ms`));
  }

  stop(): void {
    if (!this.isRunning) {
      console.log(chalk.yellow('⚠️  Performance monitor is not running'));
      return;
    }

    console.log(chalk.blue('📊 Stopping performance monitoring...'));
    this.isRunning = false;

    this.monitor.stopMonitoring();
    
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }

    console.log(chalk.green('✅ Performance monitoring stopped'));
    this.generateStopReport();
  }

  private async takeSnapshot(): Promise<void> {
    try {
      const si = await import('systeminformation');
      const pidUsage = await import('pidusage').catch(() => null);

      // Get system metrics
      const [cpu, memory, disk, network, processes] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.disksIO(),
        si.networkStats(),
        si.processes()
      ]);

      // Get DevPulse processes
      const devPulseProcesses = processes.list
        .filter(proc => 
          proc.name?.toLowerCase().includes('devpulse') || 
          proc.name?.toLowerCase().includes('electron') ||
          proc.command?.toLowerCase().includes('devpulse')
        )
        .slice(0, 10); // Limit to 10 processes

      const applicationProcesses = [];
      
      if (pidUsage) {
        for (const proc of devPulseProcesses) {
          try {
            const stats = await pidUsage.stat(proc.pid);
            applicationProcesses.push({
              pid: proc.pid,
              name: proc.name || 'Unknown',
              cpu: stats.cpu,
              memory: stats.memory
            });
          } catch (error) {
            // Process might have terminated
          }
        }
      }

      // Test API response times if dashboard is available
      const apiResponseTimes = await this.measureApiResponseTimes();
      
      // Create snapshot
      const snapshot: PerformanceSnapshot = {
        timestamp: new Date(),
        system: {
          cpu: cpu.currentLoad,
          memory: (memory.used / memory.total) * 100,
          disk: disk.rIO + disk.wIO,
          network: network.reduce((sum, iface) => sum + iface.rx_bytes + iface.tx_bytes, 0)
        },
        application: {
          processes: applicationProcesses,
          apiResponseTimes,
          databaseQueryTimes: [] // Would be populated by database monitoring
        },
        alerts: []
      };

      // Check for alerts
      const newAlerts = this.checkForAlerts(snapshot);
      snapshot.alerts = newAlerts;
      this.alerts.push(...newAlerts);

      // Trigger alert callbacks
      newAlerts.forEach(alert => {
        this.alertCallbacks.forEach(callback => callback(alert));
      });

      this.snapshots.push(snapshot);

      // Keep only last 1000 snapshots to prevent memory issues
      if (this.snapshots.length > 1000) {
        this.snapshots = this.snapshots.slice(-1000);
      }

      // Log critical alerts immediately
      newAlerts.forEach(alert => {
        if (alert.severity === 'critical') {
          console.log(chalk.red(`🚨 CRITICAL ALERT: ${alert.message}`));
          console.log(chalk.red(`   Value: ${alert.value}, Threshold: ${alert.threshold}`));
        }
      });

    } catch (error) {
      console.error('Error taking performance snapshot:', error);
    }
  }

  private async measureApiResponseTimes(): Promise<number[]> {
    const responseTimes: number[] = [];
    const endpoints = ['/api/health', '/api/activity'];

    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await fetch(`${config.api.baseUrl}${endpoint}`);
        const responseTime = Date.now() - start;
        
        if (response.ok) {
          responseTimes.push(responseTime);
        }
      } catch (error) {
        // API not available, skip
      }
    }

    return responseTimes;
  }

  private checkForAlerts(snapshot: PerformanceSnapshot): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const now = new Date();

    // CPU usage alerts
    if (snapshot.system.cpu > config.monitoring.alerts.cpuUsage) {
      alerts.push({
        timestamp: now,
        type: 'cpu',
        severity: snapshot.system.cpu > 95 ? 'critical' : 'warning',
        message: `High CPU usage detected: ${snapshot.system.cpu.toFixed(1)}%`,
        value: snapshot.system.cpu,
        threshold: config.monitoring.alerts.cpuUsage
      });
    }

    // Memory usage alerts
    if (snapshot.system.memory > config.monitoring.alerts.memoryUsage) {
      alerts.push({
        timestamp: now,
        type: 'memory',
        severity: snapshot.system.memory > 95 ? 'critical' : 'warning',
        message: `High memory usage detected: ${snapshot.system.memory.toFixed(1)}%`,
        value: snapshot.system.memory,
        threshold: config.monitoring.alerts.memoryUsage
      });
    }

    // API response time alerts
    const avgResponseTime = snapshot.application.apiResponseTimes.length > 0 
      ? snapshot.application.apiResponseTimes.reduce((sum, time) => sum + time, 0) / snapshot.application.apiResponseTimes.length
      : 0;

    if (avgResponseTime > config.monitoring.alerts.responseTime) {
      alerts.push({
        timestamp: now,
        type: 'response_time',
        severity: avgResponseTime > config.monitoring.alerts.responseTime * 2 ? 'critical' : 'warning',
        message: `Slow API response time detected: ${avgResponseTime.toFixed(0)}ms`,
        value: avgResponseTime,
        threshold: config.monitoring.alerts.responseTime
      });
    }

    // Process-specific alerts
    snapshot.application.processes.forEach(proc => {
      if (proc.cpu > 50) { // Individual process using >50% CPU
        alerts.push({
          timestamp: now,
          type: 'cpu',
          severity: proc.cpu > 80 ? 'critical' : 'warning',
          message: `High CPU usage in process ${proc.name} (PID ${proc.pid}): ${proc.cpu.toFixed(1)}%`,
          value: proc.cpu,
          threshold: 50,
          metadata: { pid: proc.pid, name: proc.name }
        });
      }

      if (proc.memory > 500 * 1024 * 1024) { // Individual process using >500MB
        alerts.push({
          timestamp: now,
          type: 'memory',
          severity: proc.memory > 1024 * 1024 * 1024 ? 'critical' : 'warning',
          message: `High memory usage in process ${proc.name} (PID ${proc.pid}): ${formatBytes(proc.memory)}`,
          value: proc.memory,
          threshold: 500 * 1024 * 1024,
          metadata: { pid: proc.pid, name: proc.name }
        });
      }
    });

    return alerts;
  }

  private setupScheduledReports(): void {
    // Hourly summary report
    cron.schedule('0 * * * *', () => {
      this.generateHourlyReport();
    });

    // Daily comprehensive report
    cron.schedule('0 0 * * *', () => {
      this.generateDailyReport();
    });

    console.log(chalk.gray('📅 Scheduled reports configured (hourly & daily)'));
  }

  private generateHourlyReport(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSnapshots = this.snapshots.filter(s => s.timestamp > oneHourAgo);
    const recentAlerts = this.alerts.filter(a => a.timestamp > oneHourAgo);

    if (recentSnapshots.length === 0) return;

    const avgCpu = recentSnapshots.reduce((sum, s) => sum + s.system.cpu, 0) / recentSnapshots.length;
    const avgMemory = recentSnapshots.reduce((sum, s) => sum + s.system.memory, 0) / recentSnapshots.length;
    const maxCpu = Math.max(...recentSnapshots.map(s => s.system.cpu));
    const maxMemory = Math.max(...recentSnapshots.map(s => s.system.memory));

    console.log(chalk.cyan('\n📊 HOURLY PERFORMANCE SUMMARY'));
    console.log(`   Time Range: ${oneHourAgo.toLocaleTimeString()} - ${new Date().toLocaleTimeString()}`);
    console.log(`   Average CPU: ${avgCpu.toFixed(1)}% (Peak: ${maxCpu.toFixed(1)}%)`);
    console.log(`   Average Memory: ${avgMemory.toFixed(1)}% (Peak: ${maxMemory.toFixed(1)}%)`);
    console.log(`   Alerts: ${recentAlerts.length} (${recentAlerts.filter(a => a.severity === 'critical').length} critical)`);

    if (recentAlerts.length > 0) {
      console.log(chalk.yellow('\n⚠️  Recent Alerts:'));
      recentAlerts.slice(-5).forEach(alert => {
        const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`   ${icon} ${alert.message} (${alert.timestamp.toLocaleTimeString()})`);
      });
    }
  }

  private generateDailyReport(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailySnapshots = this.snapshots.filter(s => s.timestamp > oneDayAgo);
    const dailyAlerts = this.alerts.filter(a => a.timestamp > oneDayAgo);

    if (dailySnapshots.length === 0) return;

    const report = {
      date: new Date().toISOString().split('T')[0],
      summary: {
        snapshots: dailySnapshots.length,
        alerts: dailyAlerts.length,
        criticalAlerts: dailyAlerts.filter(a => a.severity === 'critical').length,
        uptime: '24h' // Assuming continuous monitoring
      },
      metrics: {
        cpu: {
          average: dailySnapshots.reduce((sum, s) => sum + s.system.cpu, 0) / dailySnapshots.length,
          peak: Math.max(...dailySnapshots.map(s => s.system.cpu)),
          minimum: Math.min(...dailySnapshots.map(s => s.system.cpu))
        },
        memory: {
          average: dailySnapshots.reduce((sum, s) => sum + s.system.memory, 0) / dailySnapshots.length,
          peak: Math.max(...dailySnapshots.map(s => s.system.memory)),
          minimum: Math.min(...dailySnapshots.map(s => s.system.memory))
        }
      },
      topAlerts: dailyAlerts
        .reduce((acc, alert) => {
          const key = `${alert.type}-${alert.message.split(':')[0]}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
    };

    // Save daily report
    const reportsDir = './reports/daily';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = path.join(reportsDir, `performance-report-${report.date}.json`);
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    console.log(chalk.cyan('\n📋 DAILY PERFORMANCE REPORT GENERATED'));
    console.log(`   Saved to: ${filename}`);
    console.log(`   Snapshots: ${report.summary.snapshots}`);
    console.log(`   Alerts: ${report.summary.alerts} (${report.summary.criticalAlerts} critical)`);
    console.log(`   Peak CPU: ${report.metrics.cpu.peak.toFixed(1)}%`);
    console.log(`   Peak Memory: ${report.metrics.memory.peak.toFixed(1)}%`);
  }

  private generateStopReport(): void {
    if (this.snapshots.length === 0) return;

    const sessionStart = this.snapshots[0].timestamp;
    const sessionEnd = this.snapshots[this.snapshots.length - 1].timestamp;
    const duration = sessionEnd.getTime() - sessionStart.getTime();

    console.log(chalk.cyan('\n📊 MONITORING SESSION SUMMARY'));
    console.log(`   Duration: ${formatDuration(duration)}`);
    console.log(`   Snapshots: ${this.snapshots.length}`);
    console.log(`   Alerts: ${this.alerts.length}`);
    console.log(`   Critical Alerts: ${this.alerts.filter(a => a.severity === 'critical').length}`);

    if (this.alerts.length > 0) {
      const alertsByType = this.alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(chalk.yellow('\n⚠️  Alert Summary:'));
      Object.entries(alertsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }

    // Save session summary
    const sessionSummary = {
      sessionStart: sessionStart.toISOString(),
      sessionEnd: sessionEnd.toISOString(),
      duration,
      snapshots: this.snapshots.length,
      alerts: this.alerts.length,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
      metrics: this.snapshots.length > 0 ? {
        avgCpu: this.snapshots.reduce((sum, s) => sum + s.system.cpu, 0) / this.snapshots.length,
        avgMemory: this.snapshots.reduce((sum, s) => sum + s.system.memory, 0) / this.snapshots.length,
        peakCpu: Math.max(...this.snapshots.map(s => s.system.cpu)),
        peakMemory: Math.max(...this.snapshots.map(s => s.system.memory))
      } : null
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `./reports/monitoring-session-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(sessionSummary, null, 2));
    console.log(chalk.green(`📄 Session summary saved to: ${filename}`));
  }

  // Public methods for external integration
  getRecentSnapshots(count: number = 10): PerformanceSnapshot[] {
    return this.snapshots.slice(-count);
  }

  getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-count);
  }

  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  getCurrentMetrics(): PerformanceSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  getStatus(): { isRunning: boolean; uptime: number; snapshots: number; alerts: number } {
    const firstSnapshot = this.snapshots[0];
    const uptime = firstSnapshot ? Date.now() - firstSnapshot.timestamp.getTime() : 0;

    return {
      isRunning: this.isRunning,
      uptime,
      snapshots: this.snapshots.length,
      alerts: this.alerts.length
    };
  }
}

// CLI interface
async function main() {
  const monitor = new ContinuousPerformanceMonitor();

  // Setup alert handler
  monitor.onAlert((alert) => {
    if (alert.severity === 'critical') {
      console.log(chalk.red(`🚨 CRITICAL: ${alert.message}`));
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⏹️  Received interrupt signal, stopping monitor...'));
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n⏹️  Received terminate signal, stopping monitor...'));
    monitor.stop();
    process.exit(0);
  });

  console.log(chalk.cyan('🚀 DevPulse Continuous Performance Monitor'));
  console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'));

  monitor.start();

  // Keep the process alive
  setInterval(() => {
    const status = monitor.getStatus();
    process.title = `DevPulse Monitor - Uptime: ${formatDuration(status.uptime)}`;
  }, 30000); // Update every 30 seconds
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('❌ Performance monitor failed:'), error);
    process.exit(1);
  });
}

export { ContinuousPerformanceMonitor };
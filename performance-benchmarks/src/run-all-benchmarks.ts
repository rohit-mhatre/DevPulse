#!/usr/bin/env tsx

import chalk from 'chalk';
import { DatabaseBenchmarks } from './database/run-database-benchmarks';
import { ApiBenchmarks } from './api/run-api-benchmarks';
import { FrontendBenchmarks } from './frontend/run-frontend-benchmarks';
import { SystemBenchmarks } from './system/run-system-benchmarks';
import { BenchmarkRunner, PerformanceMonitor, formatDuration } from './utils/benchmark-utils';
import * as fs from 'fs';
import * as path from 'path';

const config = require('../benchmark.config.js');

interface BenchmarkSuite {
  name: string;
  runner: () => Promise<void>;
  enabled: boolean;
}

class ComprehensiveBenchmarks {
  private suites: BenchmarkSuite[] = [];
  private overallRunner: BenchmarkRunner;
  private systemMonitor: PerformanceMonitor;
  private startTime: number = 0;

  constructor() {
    this.overallRunner = new BenchmarkRunner();
    this.systemMonitor = new PerformanceMonitor();
    
    this.suites = [
      {
        name: 'Database Performance',
        runner: async () => {
          const benchmarks = new DatabaseBenchmarks();
          await benchmarks.runAllBenchmarks();
          benchmarks.cleanup();
        },
        enabled: true
      },
      {
        name: 'API Performance',
        runner: async () => {
          const benchmarks = new ApiBenchmarks();
          await benchmarks.runAllBenchmarks();
        },
        enabled: true
      },
      {
        name: 'Frontend Performance',
        runner: async () => {
          const benchmarks = new FrontendBenchmarks();
          await benchmarks.runAllBenchmarks();
        },
        enabled: true
      },
      {
        name: 'System Performance',
        runner: async () => {
          const benchmarks = new SystemBenchmarks();
          await benchmarks.runAllBenchmarks();
        },
        enabled: true
      }
    ];
  }

  async runAllBenchmarks(): Promise<void> {
    console.log(chalk.cyan('🚀 DEVPULSE COMPREHENSIVE PERFORMANCE BENCHMARKS\n'));
    console.log(chalk.gray('Testing all components of the DevPulse productivity tracking system\n'));
    
    this.startTime = Date.now();
    this.systemMonitor.startMonitoring(2000); // Monitor every 2 seconds

    const results = {
      suites: [],
      summary: {},
      systemMetrics: {},
      timestamp: new Date().toISOString(),
      duration: 0
    };

    try {
      // Check prerequisites
      await this.checkPrerequisites();

      // Run each benchmark suite
      for (const suite of this.suites) {
        if (!suite.enabled) {
          console.log(chalk.gray(`⏭️  Skipping ${suite.name}`));
          continue;
        }

        console.log(chalk.blue(`\n🔄 Running ${suite.name}...`));
        const suiteStartTime = Date.now();
        
        try {
          await suite.runner();
          const suiteDuration = Date.now() - suiteStartTime;
          
          console.log(chalk.green(`✅ ${suite.name} completed in ${formatDuration(suiteDuration)}`));
          
          (results.suites as any).push({
            name: suite.name,
            status: 'completed',
            duration: suiteDuration
          });
          
        } catch (error) {
          const suiteDuration = Date.now() - suiteStartTime;
          console.error(chalk.red(`❌ ${suite.name} failed after ${formatDuration(suiteDuration)}:`), error);
          
          (results.suites as any).push({
            name: suite.name,
            status: 'failed',
            duration: suiteDuration,
            error: error.message
          });
        }
      }

      // Generate comprehensive report
      await this.generateComprehensiveReport(results);

    } catch (error) {
      console.error(chalk.red('❌ Benchmark suite failed:'), error);
      process.exit(1);
    } finally {
      const systemMetrics = this.systemMonitor.stopMonitoring();
      results.systemMetrics = this.analyzeSystemMetrics(systemMetrics);
      results.duration = Date.now() - this.startTime;
      
      console.log(chalk.cyan(`\n🏁 All benchmarks completed in ${formatDuration(results.duration)}`));
      this.saveComprehensiveResults(results);
    }
  }

  private async checkPrerequisites(): Promise<void> {
    console.log(chalk.blue('🔍 Checking prerequisites...'));
    
    // Check if dashboard is running
    try {
      const response = await fetch(`${config.api.baseUrl}/api/health`);
      if (response.ok) {
        console.log(chalk.green('✅ Dashboard server is running'));
      } else {
        throw new Error(`Dashboard returned status ${response.status}`);
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Dashboard server not accessible. Some tests may fail.'));
      console.log(chalk.gray(`   Please ensure the dashboard is running at ${config.api.baseUrl}`));
    }

    // Check if desktop app database exists
    const desktopDbPath = path.join(process.env.HOME || '', 'Library', 'Application Support', 'DevPulse Desktop', 'devpulse.db');
    if (fs.existsSync(desktopDbPath)) {
      console.log(chalk.green('✅ Desktop app database found'));
    } else {
      console.log(chalk.yellow('⚠️  Desktop app database not found. Database tests will use in-memory DB.'));
    }

    // Check system resources
    const si = await import('systeminformation');
    const [cpu, memory] = await Promise.all([
      si.currentLoad(),
      si.mem()
    ]);

    console.log(chalk.blue('💻 System Information:'));
    console.log(`   CPU Load: ${cpu.currentLoad.toFixed(1)}%`);
    console.log(`   Memory Usage: ${((memory.used / memory.total) * 100).toFixed(1)}%`);
    console.log(`   Available Memory: ${(memory.available / 1024 / 1024 / 1024).toFixed(1)} GB`);

    if (cpu.currentLoad > 80) {
      console.log(chalk.yellow('⚠️  High CPU load detected. Results may be affected.'));
    }

    if ((memory.used / memory.total) > 0.9) {
      console.log(chalk.yellow('⚠️  High memory usage detected. Results may be affected.'));
    }

    console.log('');
  }

  private analyzeSystemMetrics(metrics: any[]): any {
    if (metrics.length === 0) return {};

    const avgMetrics = metrics.reduce(
      (acc, metric) => ({
        cpu: acc.cpu + metric.cpu,
        memory: acc.memory + metric.memory,
        disk: acc.disk + metric.disk,
        network: acc.network + metric.network
      }),
      { cpu: 0, memory: 0, disk: 0, network: 0 }
    );

    const count = metrics.length;
    avgMetrics.cpu /= count;
    avgMetrics.memory /= count;
    avgMetrics.disk /= count;
    avgMetrics.network /= count;

    const maxMetrics = {
      cpu: Math.max(...metrics.map(m => m.cpu)),
      memory: Math.max(...metrics.map(m => m.memory)),
      disk: Math.max(...metrics.map(m => m.disk)),
      network: Math.max(...metrics.map(m => m.network))
    };

    console.log(chalk.blue('\n📊 Overall System Resource Usage:'));
    console.log(`   Average CPU: ${avgMetrics.cpu.toFixed(1)}% (Peak: ${maxMetrics.cpu.toFixed(1)}%)`);
    console.log(`   Average Memory: ${avgMetrics.memory.toFixed(1)}% (Peak: ${maxMetrics.memory.toFixed(1)}%)`);
    console.log(`   Average Disk I/O: ${(avgMetrics.disk / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`   Average Network: ${(avgMetrics.network / 1024 / 1024).toFixed(2)} MB/s`);

    return {
      average: avgMetrics,
      peak: maxMetrics,
      samples: count,
      duration: metrics.length > 0 ? 
        new Date(metrics[metrics.length - 1].timestamp).getTime() - new Date(metrics[0].timestamp).getTime() : 0
    };
  }

  private async generateComprehensiveReport(results: any): Promise<void> {
    console.log(chalk.cyan('\n📋 COMPREHENSIVE PERFORMANCE REPORT\n'));

    // Summary statistics
    const completedSuites = results.suites.filter((s: any) => s.status === 'completed').length;
    const failedSuites = results.suites.filter((s: any) => s.status === 'failed').length;
    const totalDuration = results.suites.reduce((sum: number, s: any) => sum + s.duration, 0);

    console.log(chalk.green(`✅ Benchmark Suites Completed: ${completedSuites}/${this.suites.length}`));
    if (failedSuites > 0) {
      console.log(chalk.red(`❌ Failed Suites: ${failedSuites}`));
    }
    console.log(chalk.blue(`⏱️  Total Test Duration: ${formatDuration(totalDuration)}`));

    // Suite breakdown
    console.log(chalk.cyan('\n📊 Suite Performance:'));
    for (const suite of results.suites) {
      const statusIcon = suite.status === 'completed' ? '✅' : '❌';
      const duration = formatDuration(suite.duration);
      console.log(`   ${statusIcon} ${suite.name}: ${duration}`);
      if (suite.error) {
        console.log(chalk.red(`      Error: ${suite.error}`));
      }
    }

    // Performance targets analysis
    console.log(chalk.cyan('\n🎯 Performance Target Analysis:'));
    console.log(`   Desktop Activity Monitoring: Target <${config.targets.desktop.activityMonitoringCycle}ms`);
    console.log(`   Database Queries: Target <${config.targets.desktop.databaseQuery}ms`);
    console.log(`   API Response Time: Target <${config.targets.dashboard.apiResponse}ms`);
    console.log(`   Page Load Time: Target <${config.targets.dashboard.pageLoad}ms`);
    console.log(`   Memory Usage: Target <${config.targets.desktop.memoryUsage}MB (Desktop), <${config.targets.dashboard.memoryUsage}MB (Dashboard)`);

    // Recommendations
    this.generateRecommendations(results);
  }

  private generateRecommendations(results: any): void {
    console.log(chalk.cyan('\n💡 Performance Recommendations:\n'));

    const recommendations = [];

    // System resource recommendations
    if (results.systemMetrics.peak?.cpu > 80) {
      recommendations.push('High CPU usage detected. Consider optimizing CPU-intensive operations or scaling resources.');
    }

    if (results.systemMetrics.peak?.memory > 85) {
      recommendations.push('High memory usage detected. Review memory allocation and consider implementing memory pooling.');
    }

    // Suite-specific recommendations
    const failedSuites = results.suites.filter((s: any) => s.status === 'failed');
    if (failedSuites.length > 0) {
      recommendations.push(`${failedSuites.length} test suite(s) failed. Review error logs and fix critical issues.`);
    }

    // Duration-based recommendations
    const slowSuites = results.suites.filter((s: any) => s.duration > 120000); // 2 minutes
    if (slowSuites.length > 0) {
      recommendations.push('Some test suites took longer than expected. Consider optimizing test efficiency or reducing test scope.');
    }

    // Database recommendations
    recommendations.push('Implement connection pooling if not already present to improve database performance.');
    recommendations.push('Consider adding database query caching for frequently accessed data.');
    recommendations.push('Review database indexes and optimize slow queries identified in benchmarks.');

    // API recommendations
    recommendations.push('Implement API response caching for static or slowly-changing data.');
    recommendations.push('Consider request rate limiting to prevent API overload.');
    recommendations.push('Add API response compression to reduce bandwidth usage.');

    // Frontend recommendations
    recommendations.push('Implement code splitting to reduce initial bundle size.');
    recommendations.push('Add service worker for offline functionality and caching.');
    recommendations.push('Optimize images and implement lazy loading for better performance.');

    // General recommendations
    recommendations.push('Set up continuous performance monitoring in production.');
    recommendations.push('Implement performance budgets in CI/CD pipeline.');
    recommendations.push('Consider implementing performance alerts for regression detection.');

    recommendations.forEach((rec, index) => {
      console.log(chalk.yellow(`${index + 1}. ${rec}`));
    });
  }

  private saveComprehensiveResults(results: any): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `./reports/comprehensive-benchmark-${timestamp}.json`;
    
    // Ensure reports directory exists
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Enhanced results with metadata
    const enhancedResults = {
      ...results,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        config: config,
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'development',
          CI: process.env.CI || false
        }
      }
    };

    fs.writeFileSync(filename, JSON.stringify(enhancedResults, null, 2));
    console.log(chalk.green(`\n📊 Comprehensive results saved to: ${filename}`));

    // Generate HTML report
    this.generateHtmlReport(enhancedResults, timestamp);
  }

  private generateHtmlReport(results: any, timestamp: string): void {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevPulse Performance Benchmark Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .card { background: white; border-radius: 10px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; color: #667eea; }
        .metric-label { font-size: 0.9em; color: #666; }
        .status-pass { color: #28a745; }
        .status-warn { color: #ffc107; }
        .status-fail { color: #dc3545; }
        .suite-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .suite-card { background: white; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea; }
        .suite-failed { border-left-color: #dc3545; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; }
        .recommendations h3 { color: #856404; margin-top: 0; }
        .recommendations li { margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .chart-placeholder { height: 300px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 DevPulse Performance Report</h1>
            <p>Comprehensive benchmark results generated on ${new Date(results.timestamp).toLocaleString()}</p>
        </div>

        <div class="card">
            <h2>📊 Executive Summary</h2>
            <div class="metric">
                <div class="metric-value">${results.suites.filter((s: any) => s.status === 'completed').length}/${results.suites.length}</div>
                <div class="metric-label">Suites Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(results.duration / 60000).toFixed(1)}m</div>
                <div class="metric-label">Total Duration</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.systemMetrics.peak?.cpu?.toFixed(1) || 'N/A'}%</div>
                <div class="metric-label">Peak CPU</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.systemMetrics.peak?.memory?.toFixed(1) || 'N/A'}%</div>
                <div class="metric-label">Peak Memory</div>
            </div>
        </div>

        <div class="card">
            <h2>🧪 Test Suite Results</h2>
            <div class="suite-grid">
                ${results.suites.map((suite: any) => `
                    <div class="suite-card ${suite.status === 'failed' ? 'suite-failed' : ''}">
                        <h3>${suite.status === 'completed' ? '✅' : '❌'} ${suite.name}</h3>
                        <p><strong>Duration:</strong> ${(suite.duration / 1000).toFixed(1)}s</p>
                        <p><strong>Status:</strong> <span class="status-${suite.status === 'completed' ? 'pass' : 'fail'}">${suite.status.toUpperCase()}</span></p>
                        ${suite.error ? `<p><strong>Error:</strong> ${suite.error}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="card">
            <h2>📈 System Resource Usage</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Average</th>
                        <th>Peak</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>CPU Usage</td>
                        <td>${results.systemMetrics.average?.cpu?.toFixed(1) || 'N/A'}%</td>
                        <td>${results.systemMetrics.peak?.cpu?.toFixed(1) || 'N/A'}%</td>
                        <td><span class="status-${(results.systemMetrics.peak?.cpu || 0) < 80 ? 'pass' : 'warn'}">${(results.systemMetrics.peak?.cpu || 0) < 80 ? 'GOOD' : 'HIGH'}</span></td>
                    </tr>
                    <tr>
                        <td>Memory Usage</td>
                        <td>${results.systemMetrics.average?.memory?.toFixed(1) || 'N/A'}%</td>
                        <td>${results.systemMetrics.peak?.memory?.toFixed(1) || 'N/A'}%</td>
                        <td><span class="status-${(results.systemMetrics.peak?.memory || 0) < 85 ? 'pass' : 'warn'}">${(results.systemMetrics.peak?.memory || 0) < 85 ? 'GOOD' : 'HIGH'}</span></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="card recommendations">
            <h3>💡 Performance Recommendations</h3>
            <ul>
                <li>Implement performance monitoring in production environment</li>
                <li>Set up automated performance regression testing</li>
                <li>Consider implementing request caching for API endpoints</li>
                <li>Optimize database queries identified as slow in benchmarks</li>
                <li>Implement code splitting for frontend bundle optimization</li>
                <li>Add performance budgets to CI/CD pipeline</li>
                <li>Monitor memory usage trends to prevent memory leaks</li>
                <li>Consider implementing CDN for static assets</li>
            </ul>
        </div>

        <div class="card">
            <h2>🔧 Environment Information</h2>
            <table>
                <tbody>
                    <tr><td><strong>Node.js Version</strong></td><td>${results.metadata.nodeVersion}</td></tr>
                    <tr><td><strong>Platform</strong></td><td>${results.metadata.platform}</td></tr>
                    <tr><td><strong>Architecture</strong></td><td>${results.metadata.arch}</td></tr>
                    <tr><td><strong>Test Duration</strong></td><td>${(results.duration / 60000).toFixed(1)} minutes</td></tr>
                    <tr><td><strong>Timestamp</strong></td><td>${new Date(results.timestamp).toLocaleString()}</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

    const htmlFilename = `./reports/benchmark-report-${timestamp}.html`;
    fs.writeFileSync(htmlFilename, htmlContent);
    console.log(chalk.green(`📄 HTML report saved to: ${htmlFilename}`));
  }
}

async function main() {
  const benchmarks = new ComprehensiveBenchmarks();
  await benchmarks.runAllBenchmarks();
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('❌ Benchmark execution failed:'), error);
    process.exit(1);
  });
}

export { ComprehensiveBenchmarks };
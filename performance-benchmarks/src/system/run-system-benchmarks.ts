#!/usr/bin/env tsx

import { BenchmarkRunner, PerformanceMonitor, formatDuration, formatBytes } from '../utils/benchmark-utils';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const config = require('../../benchmark.config.js');

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  command: string;
}

interface SystemHealth {
  cpu: {
    usage: number;
    loadAverage: number[];
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    usage: number;
    readSpeed: number;
    writeSpeed: number;
  };
  network: {
    rx: number;
    tx: number;
    interfaces: number;
  };
  processes: {
    total: number;
    devPulseProcesses: ProcessInfo[];
  };
}

class SystemBenchmarks {
  private runner: BenchmarkRunner;
  private monitor: PerformanceMonitor;

  constructor() {
    this.runner = new BenchmarkRunner();
    this.monitor = new PerformanceMonitor();
  }

  async runAllBenchmarks(): Promise<void> {
    console.log(chalk.cyan('\n💻 SYSTEM PERFORMANCE BENCHMARKS\n'));
    
    this.monitor.startMonitoring(500); // High frequency monitoring for system tests

    try {
      // System health assessment
      await this.assessSystemHealth();
      
      // Resource usage benchmarks
      await this.benchmarkResourceUsage();
      
      // Process monitoring
      await this.benchmarkProcessPerformance();
      
      // File system performance
      await this.benchmarkFileSystemPerformance();
      
      // Network performance
      await this.benchmarkNetworkPerformance();
      
      // System stress testing
      await this.runSystemStressTests();
      
      // DevPulse specific monitoring
      await this.monitorDevPulseProcesses();
      
    } finally {
      const systemMetrics = this.monitor.stopMonitoring();
      this.analyzeSystemMetrics(systemMetrics);
      this.generateReport();
    }
  }

  private async assessSystemHealth(): Promise<void> {
    console.log(chalk.blue('\n🏥 System Health Assessment'));

    const si = await import('systeminformation');
    
    const [cpu, memory, disk, network, processes, osInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.processes(),
      si.osInfo()
    ]);

    console.log(chalk.green('✓ System Information:'));
    console.log(`  OS: ${osInfo.distro} ${osInfo.release} (${osInfo.arch})`);
    console.log(`  CPU: ${cpu.currentLoad.toFixed(1)}% (${os.cpus().length} cores)`);
    console.log(`  Memory: ${((memory.used / memory.total) * 100).toFixed(1)}% (${formatBytes(memory.used)}/${formatBytes(memory.total)})`);
    console.log(`  Load Average: ${os.loadavg().map(l => l.toFixed(2)).join(', ')}`);

    if (disk.length > 0) {
      const mainDisk = disk[0];
      console.log(`  Disk: ${((mainDisk.used / mainDisk.size) * 100).toFixed(1)}% (${formatBytes(mainDisk.used)}/${formatBytes(mainDisk.size)})`);
    }

    console.log(`  Processes: ${processes.all}`);
    console.log(`  Uptime: ${formatDuration(os.uptime() * 1000)}`);

    // System health score
    const healthScore = this.calculateHealthScore(cpu.currentLoad, (memory.used / memory.total) * 100, disk[0] ? ((disk[0].used / disk[0].size) * 100) : 0);
    console.log(`  Health Score: ${healthScore}/100 ${this.getHealthStatus(healthScore)}`);
  }

  private calculateHealthScore(cpuUsage: number, memoryUsage: number, diskUsage: number): number {
    let score = 100;
    
    // CPU penalty
    if (cpuUsage > 80) score -= 30;
    else if (cpuUsage > 60) score -= 15;
    else if (cpuUsage > 40) score -= 5;
    
    // Memory penalty
    if (memoryUsage > 90) score -= 25;
    else if (memoryUsage > 80) score -= 15;
    else if (memoryUsage > 70) score -= 5;
    
    // Disk penalty
    if (diskUsage > 95) score -= 20;
    else if (diskUsage > 85) score -= 10;
    else if (diskUsage > 75) score -= 5;
    
    return Math.max(0, score);
  }

  private getHealthStatus(score: number): string {
    if (score >= 80) return chalk.green('🟢 Excellent');
    if (score >= 60) return chalk.yellow('🟡 Good');
    if (score >= 40) return chalk.orange('🟠 Fair');
    return chalk.red('🔴 Poor');
  }

  private async benchmarkResourceUsage(): Promise<void> {
    console.log(chalk.blue('\n📊 Resource Usage Benchmarks'));

    const si = await import('systeminformation');

    // CPU usage measurement
    await this.runner.runBenchmark(
      'CPU Usage Measurement',
      async () => {
        const start = Date.now();
        const cpuData = await si.currentLoad();
        const duration = Date.now() - start;
        
        if (cpuData.currentLoad > config.targets.system.maxCpuUsage) {
          throw new Error(`High CPU usage: ${cpuData.currentLoad.toFixed(1)}%`);
        }
        
        return duration;
      },
      {
        iterations: 50,
        unit: 'ms',
        target: 10
      }
    );

    // Memory usage measurement
    await this.runner.runBenchmark(
      'Memory Usage Measurement',
      async () => {
        const start = Date.now();
        const memData = await si.mem();
        const duration = Date.now() - start;
        
        const usagePercent = (memData.used / memData.total) * 100;
        if (usagePercent > 90) {
          throw new Error(`High memory usage: ${usagePercent.toFixed(1)}%`);
        }
        
        return duration;
      },
      {
        iterations: 50,
        unit: 'ms',
        target: 5
      }
    );

    // Disk I/O measurement
    await this.runner.runBenchmark(
      'Disk I/O Measurement',
      async () => {
        const start = Date.now();
        const diskData = await si.disksIO();
        const duration = Date.now() - start;
        
        const ioRate = diskData.rIO + diskData.wIO;
        if (ioRate > config.targets.system.diskIoRate * 1024 * 1024) {
          console.warn(`High disk I/O: ${(ioRate / 1024 / 1024).toFixed(2)} MB/s`);
        }
        
        return duration;
      },
      {
        iterations: 30,
        unit: 'ms',
        target: 15
      }
    );
  }

  private async benchmarkProcessPerformance(): Promise<void> {
    console.log(chalk.blue('\n🔧 Process Performance'));

    // Process enumeration speed
    await this.runner.runBenchmark(
      'Process Enumeration',
      async () => {
        const start = Date.now();
        
        if (process.platform === 'darwin') {
          await execAsync('ps aux');
        } else if (process.platform === 'win32') {
          await execAsync('tasklist');
        } else {
          await execAsync('ps aux');
        }
        
        return Date.now() - start;
      },
      {
        iterations: 20,
        unit: 'ms',
        target: 100
      }
    );

    // Memory allocation performance
    await this.runner.runBenchmark(
      'Memory Allocation (100MB)',
      () => {
        const start = Date.now();
        
        // Allocate 100MB of memory
        const largeArray = new Array(100 * 1024 * 1024 / 8); // 8 bytes per number
        for (let i = 0; i < largeArray.length; i++) {
          largeArray[i] = Math.random();
        }
        
        // Clear the array
        largeArray.length = 0;
        
        return Date.now() - start;
      },
      {
        iterations: 10,
        unit: 'ms',
        target: 100
      }
    );

    // CPU intensive task
    await this.runner.runBenchmark(
      'CPU Intensive Task (Prime Calculation)',
      () => {
        const start = Date.now();
        
        // Calculate primes up to 10000
        const isPrime = (n: number): boolean => {
          if (n < 2) return false;
          for (let i = 2; i <= Math.sqrt(n); i++) {
            if (n % i === 0) return false;
          }
          return true;
        };
        
        let primeCount = 0;
        for (let i = 2; i < 10000; i++) {
          if (isPrime(i)) primeCount++;
        }
        
        return Date.now() - start;
      },
      {
        iterations: 5,
        unit: 'ms',
        target: 200
      }
    );
  }

  private async benchmarkFileSystemPerformance(): Promise<void> {
    console.log(chalk.blue('\n💾 File System Performance'));

    const testDir = path.join(os.tmpdir(), 'devpulse-fs-test');
    const testFile = path.join(testDir, 'test-file.bin');

    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    try {
      // File write performance
      await this.runner.runBenchmark(
        'File Write (1MB)',
        () => {
          const start = Date.now();
          const data = Buffer.alloc(1024 * 1024, 'a'); // 1MB of 'a'
          fs.writeFileSync(testFile, data);
          return Date.now() - start;
        },
        {
          iterations: 10,
          unit: 'ms',
          target: 50
        }
      );

      // File read performance
      await this.runner.runBenchmark(
        'File Read (1MB)',
        () => {
          const start = Date.now();
          fs.readFileSync(testFile);
          return Date.now() - start;
        },
        {
          iterations: 20,
          unit: 'ms',
          target: 20
        }
      );

      // Directory operations
      await this.runner.runBenchmark(
        'Directory Listing',
        () => {
          const start = Date.now();
          fs.readdirSync(os.tmpdir());
          return Date.now() - start;
        },
        {
          iterations: 50,
          unit: 'ms',
          target: 10
        }
      );

      // File stat operations
      await this.runner.runBenchmark(
        'File Stat Operations',
        () => {
          const start = Date.now();
          fs.statSync(testFile);
          return Date.now() - start;
        },
        {
          iterations: 100,
          unit: 'ms',
          target: 5
        }
      );

    } finally {
      // Cleanup
      try {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
        if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
      } catch (error) {
        console.warn('Failed to cleanup test files:', error);
      }
    }
  }

  private async benchmarkNetworkPerformance(): Promise<void> {
    console.log(chalk.blue('\n🌐 Network Performance'));

    // DNS resolution
    await this.runner.runBenchmark(
      'DNS Resolution (google.com)',
      async () => {
        const start = Date.now();
        const dns = await import('dns').then(m => m.promises);
        await dns.lookup('google.com');
        return Date.now() - start;
      },
      {
        iterations: 10,
        unit: 'ms',
        target: 100
      }
    );

    // Local HTTP request (if dashboard is running)
    try {
      const response = await fetch(`${config.api.baseUrl}/api/health`);
      if (response.ok) {
        await this.runner.runBenchmark(
          'Local HTTP Request',
          async () => {
            const start = Date.now();
            await fetch(`${config.api.baseUrl}/api/health`);
            return Date.now() - start;
          },
          {
            iterations: 20,
            unit: 'ms',
            target: 50
          }
        );
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Skipping local HTTP test - dashboard not available'));
    }

    // Network interface enumeration
    await this.runner.runBenchmark(
      'Network Interface Enumeration',
      () => {
        const start = Date.now();
        os.networkInterfaces();
        return Date.now() - start;
      },
      {
        iterations: 100,
        unit: 'ms',
        target: 5
      }
    );
  }

  private async runSystemStressTests(): Promise<void> {
    console.log(chalk.blue('\n🔥 System Stress Tests'));

    // CPU stress test
    console.log(chalk.yellow('Running CPU stress test for 10 seconds...'));
    const cpuStressStart = Date.now();
    const cpuStressEnd = cpuStressStart + 10000; // 10 seconds

    while (Date.now() < cpuStressEnd) {
      // CPU intensive calculation
      Math.sqrt(Math.random() * 1000000);
    }

    console.log(chalk.green(`✓ CPU stress test completed in ${Date.now() - cpuStressStart}ms`));

    // Memory stress test
    console.log(chalk.yellow('Running memory stress test...'));
    const memoryStressStart = Date.now();
    const largeArrays: number[][] = [];

    try {
      // Allocate memory in chunks until we reach a reasonable limit
      for (let i = 0; i < 10; i++) {
        const chunk = new Array(1024 * 1024).fill(Math.random()); // ~8MB per chunk
        largeArrays.push(chunk);
      }

      console.log(chalk.green(`✓ Memory stress test completed in ${Date.now() - memoryStressStart}ms`));
    } finally {
      // Clear memory
      largeArrays.length = 0;
    }

    // I/O stress test
    console.log(chalk.yellow('Running I/O stress test...'));
    const ioStressStart = Date.now();
    const testDir = path.join(os.tmpdir(), 'devpulse-io-stress');

    try {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Create multiple files concurrently
      const filePromises = Array.from({ length: 10 }, (_, i) => {
        return new Promise<void>((resolve) => {
          const filePath = path.join(testDir, `stress-file-${i}.txt`);
          const data = 'x'.repeat(100 * 1024); // 100KB
          fs.writeFile(filePath, data, () => {
            fs.readFile(filePath, () => {
              fs.unlink(filePath, () => resolve());
            });
          });
        });
      });

      await Promise.all(filePromises);
      console.log(chalk.green(`✓ I/O stress test completed in ${Date.now() - ioStressStart}ms`));

    } finally {
      // Cleanup
      try {
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn('Failed to cleanup stress test files:', error);
      }
    }
  }

  private async monitorDevPulseProcesses(): Promise<void> {
    console.log(chalk.blue('\n🔍 DevPulse Process Monitoring'));

    try {
      const pidUsage = await import('pidusage');
      const si = await import('systeminformation');
      
      const processes = await si.processes();
      const devPulseProcesses = processes.list.filter(proc => 
        proc.name?.toLowerCase().includes('devpulse') || 
        proc.name?.toLowerCase().includes('electron') ||
        proc.command?.toLowerCase().includes('devpulse')
      );

      if (devPulseProcesses.length === 0) {
        console.log(chalk.yellow('⚠️  No DevPulse processes found'));
        return;
      }

      console.log(chalk.green(`✓ Found ${devPulseProcesses.length} DevPulse-related processes:`));

      for (const proc of devPulseProcesses) {
        try {
          const stats = await pidUsage(proc.pid);
          console.log(`  PID ${proc.pid}: ${proc.name}`);
          console.log(`    CPU: ${stats.cpu.toFixed(1)}%`);
          console.log(`    Memory: ${formatBytes(stats.memory)}`);
          console.log(`    Uptime: ${formatDuration(stats.elapsed)}`);

          // Add process monitoring results
          this.runner.getResults().push({
            name: `DevPulse Process CPU (${proc.name})`,
            mean: stats.cpu,
            median: stats.cpu,
            min: stats.cpu,
            max: stats.cpu,
            p95: stats.cpu,
            p99: stats.cpu,
            stdDev: 0,
            iterations: 1,
            timestamp: new Date(),
            unit: '%',
            target: config.targets.desktop.cpuMonitoring,
            status: stats.cpu <= config.targets.desktop.cpuMonitoring ? 'pass' : 'warn',
            metadata: {
              pid: proc.pid,
              memory: stats.memory,
              uptime: stats.elapsed
            }
          });

        } catch (error) {
          console.log(`    Error getting stats: ${error.message}`);
        }
      }

    } catch (error) {
      console.log(chalk.yellow('⚠️  Process monitoring not available:', error.message));
    }
  }

  private analyzeSystemMetrics(metrics: any[]): void {
    if (metrics.length === 0) return;

    const avgMetrics = metrics.reduce(
      (acc, metric) => ({
        cpu: acc.cpu + metric.cpu,
        memory: acc.memory + metric.memory,
        disk: acc.disk + metric.disk,
        network: acc.network + metric.network
      }),
      { cpu: 0, memory: 0, disk: 0, network: 0 }
    );

    avgMetrics.cpu /= metrics.length;
    avgMetrics.memory /= metrics.length;
    avgMetrics.disk /= metrics.length;
    avgMetrics.network /= metrics.length;

    console.log(chalk.blue('\n📊 System Resource Usage During System Tests:'));
    console.log(`  Average CPU: ${avgMetrics.cpu.toFixed(1)}%`);
    console.log(`  Average Memory: ${avgMetrics.memory.toFixed(1)}%`);
    console.log(`  Average Disk I/O: ${(avgMetrics.disk / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`  Average Network: ${(avgMetrics.network / 1024 / 1024).toFixed(2)} MB/s`);
    
    const maxCpu = Math.max(...metrics.map(m => m.cpu));
    const maxMemory = Math.max(...metrics.map(m => m.memory));
    
    console.log(`  Peak CPU: ${maxCpu.toFixed(1)}%`);
    console.log(`  Peak Memory: ${maxMemory.toFixed(1)}%`);

    // System recommendations
    if (maxCpu > 90) {
      console.log(chalk.red('⚠️  High CPU usage detected during tests'));
    }
    if (maxMemory > 95) {
      console.log(chalk.red('⚠️  High memory usage detected during tests'));
    }
  }

  private generateReport(): void {
    console.log(chalk.cyan('\n📋 SYSTEM BENCHMARK RESULTS\n'));
    console.log(this.runner.generateReport());
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.runner.saveResults(`./reports/system-benchmark-${timestamp}.json`);
  }
}

async function main() {
  const benchmarks = new SystemBenchmarks();
  
  try {
    await benchmarks.runAllBenchmarks();
  } catch (error) {
    console.error(chalk.red('❌ System benchmarks failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SystemBenchmarks };
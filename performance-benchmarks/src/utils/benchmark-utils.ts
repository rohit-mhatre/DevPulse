import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import { table } from 'table';
import chalk from 'chalk';

export interface BenchmarkResult {
  name: string;
  mean: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  stdDev: number;
  iterations: number;
  timestamp: Date;
  unit: string;
  target?: number;
  status: 'pass' | 'fail' | 'warn';
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: Date;
}

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  async runBenchmark<T>(
    name: string,
    testFn: () => Promise<T> | T,
    options: {
      iterations?: number;
      warmup?: number;
      unit?: string;
      target?: number;
    } = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmup = 10,
      unit = 'ms',
      target
    } = options;

    console.log(chalk.blue(`🔄 Running benchmark: ${name}`));

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      await testFn();
    }

    // Actual benchmark runs
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await testFn();
      const end = performance.now();
      times.push(end - start);
    }

    // Calculate statistics
    times.sort((a, b) => a - b);
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const median = times[Math.floor(times.length / 2)];
    const min = times[0];
    const max = times[times.length - 1];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];
    
    const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    // Determine status
    let status: 'pass' | 'fail' | 'warn' = 'pass';
    if (target) {
      if (p95 > target * 1.5) status = 'fail';
      else if (p95 > target) status = 'warn';
    }

    const result: BenchmarkResult = {
      name,
      mean,
      median,
      min,
      max,
      p95,
      p99,
      stdDev,
      iterations,
      timestamp: new Date(),
      unit,
      target,
      status
    };

    this.results.push(result);
    this.printResult(result);
    return result;
  }

  private printResult(result: BenchmarkResult): void {
    const statusColor = result.status === 'pass' ? chalk.green : 
                       result.status === 'warn' ? chalk.yellow : chalk.red;
    
    console.log(statusColor(`  ✓ ${result.name}`));
    console.log(`    Mean: ${result.mean.toFixed(2)}${result.unit}`);
    console.log(`    P95:  ${result.p95.toFixed(2)}${result.unit}`);
    
    if (result.target) {
      const targetStatus = result.p95 <= result.target ? '✓' : '✗';
      console.log(`    Target: ${result.target}${result.unit} ${targetStatus}`);
    }
    console.log('');
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  generateReport(): string {
    const headers = ['Test', 'Mean', 'P95', 'Target', 'Status'];
    const data = this.results.map(result => [
      result.name,
      `${result.mean.toFixed(2)}${result.unit}`,
      `${result.p95.toFixed(2)}${result.unit}`,
      result.target ? `${result.target}${result.unit}` : 'N/A',
      result.status.toUpperCase()
    ]);

    return table([headers, ...data], {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      }
    });
  }

  saveResults(filename: string): void {
    const reportData = {
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.status === 'pass').length,
        warnings: this.results.filter(r => r.status === 'warn').length,
        failed: this.results.filter(r => r.status === 'fail').length,
        timestamp: new Date().toISOString()
      },
      results: this.results
    };

    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filename, JSON.stringify(reportData, null, 2));
    console.log(chalk.green(`📊 Results saved to: ${filename}`));
  }
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private interval?: NodeJS.Timeout;

  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.interval = setInterval(async () => {
      const metrics = await this.collectMetrics();
      this.metrics.push(metrics);
    }, intervalMs);

    console.log(chalk.blue('📊 Performance monitoring started'));
  }

  stopMonitoring(): PerformanceMetrics[] {
    if (!this.isMonitoring) return [];

    this.isMonitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
    }

    console.log(chalk.blue('📊 Performance monitoring stopped'));
    return [...this.metrics];
  }

  private async collectMetrics(): Promise<PerformanceMetrics> {
    // Get system information
    const si = await import('systeminformation');
    
    const [cpu, memory, disk, network] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.disksIO(),
      si.networkStats()
    ]);

    return {
      cpu: cpu.currentLoad,
      memory: (memory.used / memory.total) * 100,
      disk: disk.rIO + disk.wIO,
      network: network.reduce((sum, iface) => sum + iface.rx_bytes + iface.tx_bytes, 0),
      timestamp: new Date()
    };
  }

  getAverageMetrics(): PerformanceMetrics | null {
    if (this.metrics.length === 0) return null;

    const avg = this.metrics.reduce(
      (acc, metric) => ({
        cpu: acc.cpu + metric.cpu,
        memory: acc.memory + metric.memory,
        disk: acc.disk + metric.disk,
        network: acc.network + metric.network
      }),
      { cpu: 0, memory: 0, disk: 0, network: 0 }
    );

    return {
      cpu: avg.cpu / this.metrics.length,
      memory: avg.memory / this.metrics.length,
      disk: avg.disk / this.metrics.length,
      network: avg.network / this.metrics.length,
      timestamp: new Date()
    };
  }
}

export function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * (percentile / 100));
  return sorted[index];
}

export function generateLoadPattern(type: 'constant' | 'ramp-up' | 'spike' | 'sustained', duration: number) {
  const patterns = {
    constant: (progress: number) => 1,
    'ramp-up': (progress: number) => progress,
    spike: (progress: number) => progress < 0.1 ? progress * 10 : progress > 0.9 ? (1 - progress) * 10 : 1,
    sustained: (progress: number) => progress < 0.2 ? progress * 5 : 1
  };

  return patterns[type];
}

export class LoadTester {
  async runLoadTest(
    testFn: () => Promise<any>,
    options: {
      duration: number;
      maxConcurrency: number;
      pattern: 'constant' | 'ramp-up' | 'spike' | 'sustained';
    }
  ): Promise<{ requests: number; errors: number; avgResponseTime: number }> {
    const { duration, maxConcurrency, pattern } = options;
    const startTime = Date.now();
    const patternFn = generateLoadPattern(pattern, duration);
    
    let requests = 0;
    let errors = 0;
    let totalResponseTime = 0;
    const activeRequests = new Set<Promise<any>>();

    console.log(chalk.blue(`🚀 Starting load test (${pattern}) for ${duration}ms`));

    while (Date.now() - startTime < duration) {
      const progress = (Date.now() - startTime) / duration;
      const targetConcurrency = Math.floor(maxConcurrency * patternFn(progress));
      
      while (activeRequests.size < targetConcurrency) {
        const requestStart = Date.now();
        const request = testFn()
          .then(() => {
            requests++;
            totalResponseTime += Date.now() - requestStart;
          })
          .catch(() => {
            errors++;
          })
          .finally(() => {
            activeRequests.delete(request);
          });
        
        activeRequests.add(request);
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Wait for remaining requests
    await Promise.allSettled(activeRequests);

    return {
      requests,
      errors,
      avgResponseTime: requests > 0 ? totalResponseTime / requests : 0
    };
  }
}
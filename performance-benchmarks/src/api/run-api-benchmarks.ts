#!/usr/bin/env tsx

import { BenchmarkRunner, LoadTester, PerformanceMonitor, formatDuration } from '../utils/benchmark-utils';
import chalk from 'chalk';
import * as http from 'http';

const config = require('../../benchmark.config.js');

interface ApiResponse {
  status: number;
  responseTime: number;
  contentLength: number;
  error?: string;
}

interface EndpointTest {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

class ApiBenchmarks {
  private runner: BenchmarkRunner;
  private loadTester: LoadTester;
  private monitor: PerformanceMonitor;
  private baseUrl: string;

  constructor() {
    this.runner = new BenchmarkRunner();
    this.loadTester = new LoadTester();
    this.monitor = new PerformanceMonitor();
    this.baseUrl = config.api.baseUrl;
  }

  async runAllBenchmarks(): Promise<void> {
    console.log(chalk.cyan('\n🌐 API PERFORMANCE BENCHMARKS\n'));
    
    // Check if API is available
    const isAvailable = await this.checkApiAvailability();
    if (!isAvailable) {
      console.error(chalk.red('❌ API is not available. Please start the dashboard server.'));
      process.exit(1);
    }

    this.monitor.startMonitoring(1000);

    try {
      // Endpoint response time benchmarks
      await this.benchmarkEndpointResponseTimes();
      
      // Load testing
      await this.runLoadTests();
      
      // Concurrent request handling
      await this.benchmarkConcurrentRequests();
      
      // Error handling and recovery
      await this.benchmarkErrorHandling();
      
      // API throughput tests
      await this.benchmarkThroughput();
      
    } finally {
      const systemMetrics = this.monitor.stopMonitoring();
      this.analyzeSystemMetrics(systemMetrics);
      this.generateReport();
    }
  }

  private async checkApiAvailability(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/api/health');
      return response.status < 400;
    } catch (error) {
      return false;
    }
  }

  private async makeRequest(
    method: string, 
    path: string, 
    body?: any, 
    headers?: Record<string, string>
  ): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const startTime = Date.now();
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DevPulse-Benchmark/1.0',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve({
            status: res.statusCode || 0,
            responseTime,
            contentLength: Buffer.byteLength(data, 'utf8'),
            error: res.statusCode && res.statusCode >= 400 ? data : undefined
          });
        });
      });

      req.on('error', (error) => {
        reject({
          status: 0,
          responseTime: Date.now() - startTime,
          contentLength: 0,
          error: error.message
        });
      });

      if (body && method !== 'GET') {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  private async benchmarkEndpointResponseTimes(): Promise<void> {
    console.log(chalk.blue('\n⚡ Endpoint Response Times'));

    const endpoints: EndpointTest[] = [
      { name: 'Health Check', path: '/api/health', method: 'GET' },
      { name: 'Activity Data', path: '/api/activity', method: 'GET' },
      { name: 'AI Insights', path: '/api/ai/insights?startDate=2024-01-01&endDate=2024-12-31&type=comprehensive', method: 'GET' },
      { name: 'Export CSV', path: '/api/export/csv', method: 'POST', body: { format: 'csv', dateRange: 'week' } },
      { name: 'GitHub Activity', path: '/api/github/activity', method: 'GET' },
    ];

    for (const endpoint of endpoints) {
      await this.runner.runBenchmark(
        `${endpoint.name} (${endpoint.method})`,
        async () => {
          const response = await this.makeRequest(endpoint.method, endpoint.path, endpoint.body, endpoint.headers);
          if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}: ${response.error}`);
          }
          return response;
        },
        {
          iterations: 100,
          warmup: 5,
          unit: 'ms',
          target: config.targets.dashboard.apiResponse
        }
      );
    }
  }

  private async runLoadTests(): Promise<void> {
    console.log(chalk.blue('\n🚀 Load Testing'));

    const testEndpoint = () => this.makeRequest('GET', '/api/activity');

    // Constant load test
    const constantLoad = await this.loadTester.runLoadTest(testEndpoint, {
      duration: 30000, // 30 seconds
      maxConcurrency: 10,
      pattern: 'constant'
    });

    console.log(chalk.green(`✓ Constant Load Test (10 concurrent)`));
    console.log(`  Requests: ${constantLoad.requests}`);
    console.log(`  Errors: ${constantLoad.errors}`);
    console.log(`  Avg Response Time: ${constantLoad.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Error Rate: ${((constantLoad.errors / constantLoad.requests) * 100).toFixed(2)}%`);

    // Ramp-up test
    const rampUpLoad = await this.loadTester.runLoadTest(testEndpoint, {
      duration: 60000, // 1 minute
      maxConcurrency: 25,
      pattern: 'ramp-up'
    });

    console.log(chalk.green(`✓ Ramp-up Load Test (0-25 concurrent)`));
    console.log(`  Requests: ${rampUpLoad.requests}`);
    console.log(`  Errors: ${rampUpLoad.errors}`);
    console.log(`  Avg Response Time: ${rampUpLoad.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Error Rate: ${((rampUpLoad.errors / rampUpLoad.requests) * 100).toFixed(2)}%`);

    // Spike test
    const spikeLoad = await this.loadTester.runLoadTest(testEndpoint, {
      duration: 30000, // 30 seconds
      maxConcurrency: 50,
      pattern: 'spike'
    });

    console.log(chalk.green(`✓ Spike Load Test (sudden spike to 50 concurrent)`));
    console.log(`  Requests: ${spikeLoad.requests}`);
    console.log(`  Errors: ${spikeLoad.errors}`);
    console.log(`  Avg Response Time: ${spikeLoad.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Error Rate: ${((spikeLoad.errors / spikeLoad.requests) * 100).toFixed(2)}%`);
  }

  private async benchmarkConcurrentRequests(): Promise<void> {
    console.log(chalk.blue('\n🔄 Concurrent Request Handling'));

    const concurrencyLevels = [1, 5, 10, 25, 50];

    for (const concurrency of concurrencyLevels) {
      await this.runner.runBenchmark(
        `Concurrent Requests (${concurrency} parallel)`,
        async () => {
          const requests = Array.from({ length: concurrency }, () => 
            this.makeRequest('GET', '/api/activity')
          );
          
          const responses = await Promise.allSettled(requests);
          const successful = responses.filter(r => r.status === 'fulfilled').length;
          const failed = responses.filter(r => r.status === 'rejected').length;
          
          if (failed > concurrency * 0.1) { // Allow 10% failure rate
            throw new Error(`Too many failures: ${failed}/${concurrency}`);
          }
          
          return { successful, failed };
        },
        {
          iterations: 50,
          unit: 'ms',
          target: config.targets.dashboard.apiResponse * concurrency
        }
      );
    }
  }

  private async benchmarkErrorHandling(): Promise<void> {
    console.log(chalk.blue('\n🚨 Error Handling & Recovery'));

    // Test non-existent endpoint
    await this.runner.runBenchmark(
      'Non-existent Endpoint (404)',
      async () => {
        const response = await this.makeRequest('GET', '/api/nonexistent');
        if (response.status !== 404) {
          throw new Error(`Expected 404, got ${response.status}`);
        }
        return response;
      },
      {
        iterations: 50,
        unit: 'ms',
        target: config.targets.dashboard.apiResponse
      }
    );

    // Test malformed request
    await this.runner.runBenchmark(
      'Malformed Request Body',
      async () => {
        const response = await this.makeRequest('POST', '/api/export/csv', 'invalid-json');
        if (response.status < 400) {
          throw new Error(`Expected error status, got ${response.status}`);
        }
        return response;
      },
      {
        iterations: 50,
        unit: 'ms',
        target: config.targets.dashboard.apiResponse
      }
    );

    // Test rate limiting response
    await this.runner.runBenchmark(
      'Rapid Sequential Requests',
      async () => {
        const requests = Array.from({ length: 20 }, () => 
          this.makeRequest('GET', '/api/activity')
        );
        
        const responses = await Promise.allSettled(requests);
        return responses.length;
      },
      {
        iterations: 10,
        unit: 'ms',
        target: config.targets.dashboard.apiResponse * 20
      }
    );
  }

  private async benchmarkThroughput(): Promise<void> {
    console.log(chalk.blue('\n📊 API Throughput'));

    const testDuration = 30000; // 30 seconds
    const startTime = Date.now();
    let requestCount = 0;
    let errorCount = 0;
    let totalResponseTime = 0;

    console.log(chalk.yellow(`Running throughput test for ${testDuration / 1000} seconds...`));

    while (Date.now() - startTime < testDuration) {
      const batchPromises = Array.from({ length: 5 }, async () => {
        try {
          const response = await this.makeRequest('GET', '/api/activity');
          totalResponseTime += response.responseTime;
          requestCount++;
          
          if (response.status >= 400) {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
          requestCount++;
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const actualDuration = Date.now() - startTime;
    const requestsPerSecond = (requestCount / actualDuration) * 1000;
    const avgResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
    const errorRate = (errorCount / requestCount) * 100;

    console.log(chalk.green(`✓ Throughput Test Results:`));
    console.log(`  Total Requests: ${requestCount}`);
    console.log(`  Duration: ${formatDuration(actualDuration)}`);
    console.log(`  Requests/sec: ${requestsPerSecond.toFixed(2)}`);
    console.log(`  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Error Rate: ${errorRate.toFixed(2)}%`);

    // Add synthetic benchmark result
    this.runner.getResults().push({
      name: 'API Throughput',
      mean: requestsPerSecond,
      median: requestsPerSecond,
      min: requestsPerSecond,
      max: requestsPerSecond,
      p95: requestsPerSecond,
      p99: requestsPerSecond,
      stdDev: 0,
      iterations: 1,
      timestamp: new Date(),
      unit: 'req/s',
      target: 50, // Target 50 requests per second
      status: requestsPerSecond >= 50 ? 'pass' : requestsPerSecond >= 25 ? 'warn' : 'fail',
      metadata: {
        totalRequests: requestCount,
        errorRate,
        avgResponseTime
      }
    });
  }

  private analyzeSystemMetrics(metrics: any[]): void {
    if (metrics.length === 0) return;

    const avgMetrics = metrics.reduce(
      (acc, metric) => ({
        cpu: acc.cpu + metric.cpu,
        memory: acc.memory + metric.memory,
        network: acc.network + metric.network
      }),
      { cpu: 0, memory: 0, network: 0 }
    );

    avgMetrics.cpu /= metrics.length;
    avgMetrics.memory /= metrics.length;
    avgMetrics.network /= metrics.length;

    console.log(chalk.blue('\n📊 System Resource Usage During API Tests:'));
    console.log(`  Average CPU: ${avgMetrics.cpu.toFixed(1)}%`);
    console.log(`  Average Memory: ${avgMetrics.memory.toFixed(1)}%`);
    console.log(`  Network Activity: ${(avgMetrics.network / 1024 / 1024).toFixed(2)} MB/s`);
    
    const maxCpu = Math.max(...metrics.map(m => m.cpu));
    const maxMemory = Math.max(...metrics.map(m => m.memory));
    
    console.log(`  Peak CPU: ${maxCpu.toFixed(1)}%`);
    console.log(`  Peak Memory: ${maxMemory.toFixed(1)}%`);
  }

  private generateReport(): void {
    console.log(chalk.cyan('\n📋 API BENCHMARK RESULTS\n'));
    console.log(this.runner.generateReport());
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.runner.saveResults(`./reports/api-benchmark-${timestamp}.json`);
  }
}

async function main() {
  const benchmarks = new ApiBenchmarks();
  
  try {
    await benchmarks.runAllBenchmarks();
  } catch (error) {
    console.error(chalk.red('❌ API benchmarks failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ApiBenchmarks };
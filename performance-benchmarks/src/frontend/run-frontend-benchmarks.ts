#!/usr/bin/env tsx

import puppeteer, { Browser, Page } from 'puppeteer';
import { BenchmarkRunner, PerformanceMonitor, formatDuration, formatBytes } from '../utils/benchmark-utils';
import chalk from 'chalk';

const config = require('../../benchmark.config.js');

interface WebVitals {
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  tti: number;
}

interface PerformanceEntry {
  name: string;
  duration: number;
  startTime: number;
  entryType: string;
}

interface ResourceTiming {
  name: string;
  size: number;
  duration: number;
  type: string;
}

class FrontendBenchmarks {
  private runner: BenchmarkRunner;
  private monitor: PerformanceMonitor;
  private browser?: Browser;
  private baseUrl: string;

  constructor() {
    this.runner = new BenchmarkRunner();
    this.monitor = new PerformanceMonitor();
    this.baseUrl = config.api.baseUrl;
  }

  async runAllBenchmarks(): Promise<void> {
    console.log(chalk.cyan('\n🌐 FRONTEND PERFORMANCE BENCHMARKS\n'));
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    this.monitor.startMonitoring(1000);

    try {
      // Page load performance
      await this.benchmarkPageLoadPerformance();
      
      // Web Vitals measurement
      await this.measureWebVitals();
      
      // JavaScript execution performance
      await this.benchmarkJavaScriptPerformance();
      
      // Component rendering performance
      await this.benchmarkComponentRendering();
      
      // Memory usage and leak detection
      await this.benchmarkMemoryUsage();
      
      // Bundle size analysis
      await this.analyzeBundleSize();
      
      // Interactive performance
      await this.benchmarkInteractivePerformance();
      
    } finally {
      await this.browser?.close();
      const systemMetrics = this.monitor.stopMonitoring();
      this.analyzeSystemMetrics(systemMetrics);
      this.generateReport();
    }
  }

  private async benchmarkPageLoadPerformance(): Promise<void> {
    console.log(chalk.blue('\n⚡ Page Load Performance'));

    const pages = config.frontend.pages;

    for (const pageConfig of pages) {
      await this.runner.runBenchmark(
        `${pageConfig.name} - Page Load`,
        async () => {
          const page = await this.browser!.newPage();
          
          try {
            const startTime = Date.now();
            
            await page.goto(pageConfig.url, { 
              waitUntil: 'networkidle0',
              timeout: 30000 
            });
            
            const loadTime = Date.now() - startTime;
            
            // Wait for any dynamic content to load
            await page.waitForTimeout(2000);
            
            return loadTime;
          } finally {
            await page.close();
          }
        },
        {
          iterations: 10,
          warmup: 2,
          unit: 'ms',
          target: config.targets.dashboard.pageLoad
        }
      );
    }
  }

  private async measureWebVitals(): Promise<void> {
    console.log(chalk.blue('\n📊 Web Vitals Measurement'));

    const page = await this.browser!.newPage();
    
    try {
      // Navigate to main dashboard
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

      // Inject Web Vitals library
      await page.addScriptTag({
        url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js'
      });

      // Measure Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise<WebVitals>((resolve) => {
          const vitals: Partial<WebVitals> = {};
          let metricsReceived = 0;
          const expectedMetrics = 6;

          function onVital(metric: any) {
            vitals[metric.name.toLowerCase() as keyof WebVitals] = metric.value;
            metricsReceived++;
            
            if (metricsReceived >= expectedMetrics) {
              resolve(vitals as WebVitals);
            }
          }

          // @ts-ignore
          webVitals.getFCP(onVital);
          // @ts-ignore
          webVitals.getLCP(onVital);
          // @ts-ignore
          webVitals.getFID(onVital);
          // @ts-ignore
          webVitals.getCLS(onVital);
          // @ts-ignore
          webVitals.getTTFB(onVital);
          // @ts-ignore
          webVitals.getTTI?.(onVital);

          // Fallback timeout
          setTimeout(() => {
            resolve(vitals as WebVitals);
          }, 10000);
        });
      });

      // Report Web Vitals
      console.log(chalk.green('✓ Web Vitals Measured:'));
      if (webVitals.fcp) console.log(`  FCP: ${webVitals.fcp.toFixed(1)}ms`);
      if (webVitals.lcp) console.log(`  LCP: ${webVitals.lcp.toFixed(1)}ms`);
      if (webVitals.fid) console.log(`  FID: ${webVitals.fid.toFixed(1)}ms`);
      if (webVitals.cls) console.log(`  CLS: ${webVitals.cls.toFixed(3)}`);
      if (webVitals.ttfb) console.log(`  TTFB: ${webVitals.ttfb.toFixed(1)}ms`);
      if (webVitals.tti) console.log(`  TTI: ${webVitals.tti.toFixed(1)}ms`);

      // Add Web Vitals to benchmark results
      this.addWebVitalsResults(webVitals);

    } finally {
      await page.close();
    }
  }

  private addWebVitalsResults(vitals: WebVitals): void {
    if (vitals.lcp) {
      this.runner.getResults().push({
        name: 'Largest Contentful Paint (LCP)',
        mean: vitals.lcp,
        median: vitals.lcp,
        min: vitals.lcp,
        max: vitals.lcp,
        p95: vitals.lcp,
        p99: vitals.lcp,
        stdDev: 0,
        iterations: 1,
        timestamp: new Date(),
        unit: 'ms',
        target: 2500, // Good LCP threshold
        status: vitals.lcp <= 2500 ? 'pass' : vitals.lcp <= 4000 ? 'warn' : 'fail'
      });
    }

    if (vitals.fid) {
      this.runner.getResults().push({
        name: 'First Input Delay (FID)',
        mean: vitals.fid,
        median: vitals.fid,
        min: vitals.fid,
        max: vitals.fid,
        p95: vitals.fid,
        p99: vitals.fid,
        stdDev: 0,
        iterations: 1,
        timestamp: new Date(),
        unit: 'ms',
        target: 100, // Good FID threshold
        status: vitals.fid <= 100 ? 'pass' : vitals.fid <= 300 ? 'warn' : 'fail'
      });
    }

    if (vitals.cls) {
      this.runner.getResults().push({
        name: 'Cumulative Layout Shift (CLS)',
        mean: vitals.cls,
        median: vitals.cls,
        min: vitals.cls,
        max: vitals.cls,
        p95: vitals.cls,
        p99: vitals.cls,
        stdDev: 0,
        iterations: 1,
        timestamp: new Date(),
        unit: '',
        target: 0.1, // Good CLS threshold
        status: vitals.cls <= 0.1 ? 'pass' : vitals.cls <= 0.25 ? 'warn' : 'fail'
      });
    }
  }

  private async benchmarkJavaScriptPerformance(): Promise<void> {
    console.log(chalk.blue('\n🚀 JavaScript Execution Performance'));

    const page = await this.browser!.newPage();
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

      // Benchmark DOM manipulation
      await this.runner.runBenchmark(
        'DOM Manipulation (1000 elements)',
        async () => {
          await page.evaluate(() => {
            const container = document.createElement('div');
            document.body.appendChild(container);
            
            const start = performance.now();
            
            for (let i = 0; i < 1000; i++) {
              const element = document.createElement('div');
              element.textContent = `Element ${i}`;
              element.className = 'test-element';
              container.appendChild(element);
            }
            
            const end = performance.now();
            container.remove();
            
            return end - start;
          });
        },
        {
          iterations: 50,
          unit: 'ms',
          target: 16 // 60fps threshold
        }
      );

      // Benchmark JSON parsing
      await this.runner.runBenchmark(
        'JSON Parsing (large dataset)',
        async () => {
          await page.evaluate(() => {
            const largeObject = {
              activities: Array.from({ length: 1000 }, (_, i) => ({
                id: `activity-${i}`,
                timestamp: Date.now() - i * 1000,
                app_name: `App ${i % 10}`,
                activity_type: ['code', 'browsing', 'communication'][i % 3],
                duration_seconds: Math.floor(Math.random() * 3600),
                metadata: { index: i, test: true }
              }))
            };
            
            const start = performance.now();
            const json = JSON.stringify(largeObject);
            const parsed = JSON.parse(json);
            const end = performance.now();
            
            return end - start;
          });
        },
        {
          iterations: 100,
          unit: 'ms',
          target: 10
        }
      );

      // Benchmark array operations
      await this.runner.runBenchmark(
        'Array Operations (filter/map/reduce)',
        async () => {
          await page.evaluate(() => {
            const data = Array.from({ length: 10000 }, (_, i) => ({
              id: i,
              value: Math.random() * 100,
              category: ['A', 'B', 'C'][i % 3]
            }));
            
            const start = performance.now();
            
            const filtered = data.filter(item => item.value > 50);
            const mapped = filtered.map(item => ({ ...item, doubled: item.value * 2 }));
            const reduced = mapped.reduce((sum, item) => sum + item.doubled, 0);
            
            const end = performance.now();
            
            return end - start;
          });
        },
        {
          iterations: 100,
          unit: 'ms',
          target: 5
        }
      );

    } finally {
      await page.close();
    }
  }

  private async benchmarkComponentRendering(): Promise<void> {
    console.log(chalk.blue('\n⚛️  Component Rendering Performance'));

    const page = await this.browser!.newPage();
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

      // Wait for React to load
      await page.waitForFunction(() => window.React !== undefined, { timeout: 10000 }).catch(() => {
        console.log('React not detected, skipping React-specific tests');
      });

      // Benchmark chart rendering (if charts are present)
      await this.runner.runBenchmark(
        'Chart Rendering Performance',
        async () => {
          await page.evaluate(() => {
            // Simulate chart data update
            const chartContainer = document.querySelector('[data-testid="activity-chart"]') || 
                                 document.querySelector('.recharts-wrapper') ||
                                 document.createElement('div');
            
            const start = performance.now();
            
            // Trigger a re-render by dispatching a custom event
            const event = new CustomEvent('data-update', {
              detail: {
                data: Array.from({ length: 100 }, (_, i) => ({
                  time: Date.now() - i * 3600000,
                  value: Math.random() * 100
                }))
              }
            });
            
            chartContainer.dispatchEvent(event);
            
            // Wait for potential reflows
            return new Promise(resolve => {
              requestAnimationFrame(() => {
                const end = performance.now();
                resolve(end - start);
              });
            });
          });
        },
        {
          iterations: 20,
          unit: 'ms',
          target: 16 // 60fps
        }
      );

      // Benchmark list rendering
      await this.runner.runBenchmark(
        'List Rendering (1000 items)',
        async () => {
          await page.evaluate(() => {
            const container = document.createElement('div');
            container.style.cssText = 'position: absolute; top: -9999px; left: -9999px;';
            document.body.appendChild(container);
            
            const start = performance.now();
            
            for (let i = 0; i < 1000; i++) {
              const item = document.createElement('div');
              item.className = 'list-item';
              item.innerHTML = `
                <div class="item-header">Item ${i}</div>
                <div class="item-content">Content for item ${i}</div>
                <div class="item-meta">Meta data ${i}</div>
              `;
              container.appendChild(item);
            }
            
            const end = performance.now();
            container.remove();
            
            return end - start;
          });
        },
        {
          iterations: 50,
          unit: 'ms',
          target: 50
        }
      );

    } finally {
      await page.close();
    }
  }

  private async benchmarkMemoryUsage(): Promise<void> {
    console.log(chalk.blue('\n💾 Memory Usage & Leak Detection'));

    const page = await this.browser!.newPage();
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

      // Initial memory measurement
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });

      if (initialMemory) {
        console.log(chalk.yellow(`Initial Memory Usage:`));
        console.log(`  Used JS Heap: ${formatBytes(initialMemory.usedJSHeapSize)}`);
        console.log(`  Total JS Heap: ${formatBytes(initialMemory.totalJSHeapSize)}`);
      }

      // Simulate memory-intensive operations
      await page.evaluate(() => {
        // Create and destroy large objects to test memory management
        for (let i = 0; i < 10; i++) {
          const largeArray = new Array(100000).fill(0).map((_, index) => ({
            id: index,
            data: `Large string data ${index}`.repeat(10),
            timestamp: Date.now()
          }));
          
          // Process the array
          largeArray.forEach(item => {
            item.processed = true;
          });
          
          // Clear reference
          (largeArray as any) = null;
        }
        
        // Force garbage collection if available
        if ('gc' in window) {
          (window as any).gc();
        }
      });

      // Final memory measurement
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });

      if (initialMemory && finalMemory) {
        const memoryDiff = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        console.log(chalk.yellow(`Final Memory Usage:`));
        console.log(`  Used JS Heap: ${formatBytes(finalMemory.usedJSHeapSize)}`);
        console.log(`  Memory Difference: ${formatBytes(memoryDiff)}`);
        
        // Add memory usage result
        this.runner.getResults().push({
          name: 'Memory Usage After Operations',
          mean: finalMemory.usedJSHeapSize / 1024 / 1024, // MB
          median: finalMemory.usedJSHeapSize / 1024 / 1024,
          min: finalMemory.usedJSHeapSize / 1024 / 1024,
          max: finalMemory.usedJSHeapSize / 1024 / 1024,
          p95: finalMemory.usedJSHeapSize / 1024 / 1024,
          p99: finalMemory.usedJSHeapSize / 1024 / 1024,
          stdDev: 0,
          iterations: 1,
          timestamp: new Date(),
          unit: 'MB',
          target: config.targets.dashboard.memoryUsage,
          status: (finalMemory.usedJSHeapSize / 1024 / 1024) <= config.targets.dashboard.memoryUsage ? 'pass' : 'warn'
        });
      }

    } finally {
      await page.close();
    }
  }

  private async analyzeBundleSize(): Promise<void> {
    console.log(chalk.blue('\n📦 Bundle Size Analysis'));

    const page = await this.browser!.newPage();
    
    try {
      // Enable request interception to measure resource sizes
      await page.setRequestInterception(true);
      
      const resources: ResourceTiming[] = [];
      
      page.on('request', request => {
        request.continue();
      });
      
      page.on('response', async response => {
        const url = response.url();
        if (url.includes('.js') || url.includes('.css') || url.includes('.html')) {
          try {
            const headers = response.headers();
            const contentLength = headers['content-length'];
            
            resources.push({
              name: url.split('/').pop() || url,
              size: contentLength ? parseInt(contentLength) : 0,
              duration: 0, // Will be calculated later
              type: url.includes('.js') ? 'javascript' : url.includes('.css') ? 'css' : 'html'
            });
          } catch (error) {
            // Ignore errors for resource analysis
          }
        }
      });

      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

      // Analyze bundle sizes
      const jsResources = resources.filter(r => r.type === 'javascript');
      const cssResources = resources.filter(r => r.type === 'css');
      
      const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);
      const totalCssSize = cssResources.reduce((sum, r) => sum + r.size, 0);
      const totalSize = totalJsSize + totalCssSize;

      console.log(chalk.green('✓ Bundle Size Analysis:'));
      console.log(`  Total JavaScript: ${formatBytes(totalJsSize)}`);
      console.log(`  Total CSS: ${formatBytes(totalCssSize)}`);
      console.log(`  Total Bundle: ${formatBytes(totalSize)}`);
      console.log(`  JavaScript Files: ${jsResources.length}`);
      console.log(`  CSS Files: ${cssResources.length}`);

      // Add bundle size results
      this.runner.getResults().push({
        name: 'Total Bundle Size',
        mean: totalSize / 1024, // KB
        median: totalSize / 1024,
        min: totalSize / 1024,
        max: totalSize / 1024,
        p95: totalSize / 1024,
        p99: totalSize / 1024,
        stdDev: 0,
        iterations: 1,
        timestamp: new Date(),
        unit: 'KB',
        target: config.targets.dashboard.bundleSize,
        status: (totalSize / 1024) <= config.targets.dashboard.bundleSize ? 'pass' : 'warn'
      });

    } finally {
      await page.close();
    }
  }

  private async benchmarkInteractivePerformance(): Promise<void> {
    console.log(chalk.blue('\n🖱️  Interactive Performance'));

    const page = await this.browser!.newPage();
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

      // Benchmark button click response
      await this.runner.runBenchmark(
        'Button Click Response',
        async () => {
          await page.evaluate(() => {
            const button = document.querySelector('button') || document.createElement('button');
            const start = performance.now();
            
            button.click();
            
            return new Promise(resolve => {
              requestAnimationFrame(() => {
                const end = performance.now();
                resolve(end - start);
              });
            });
          });
        },
        {
          iterations: 50,
          unit: 'ms',
          target: 16 // 60fps response
        }
      );

      // Benchmark input response
      await this.runner.runBenchmark(
        'Input Field Response',
        async () => {
          await page.evaluate(() => {
            const input = document.querySelector('input') || document.createElement('input');
            document.body.appendChild(input);
            
            const start = performance.now();
            
            input.value = 'Test input value';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            return new Promise(resolve => {
              requestAnimationFrame(() => {
                const end = performance.now();
                resolve(end - start);
              });
            });
          });
        },
        {
          iterations: 50,
          unit: 'ms',
          target: 16 // 60fps response
        }
      );

      // Benchmark scroll performance
      await this.runner.runBenchmark(
        'Scroll Performance',
        async () => {
          await page.evaluate(() => {
            const start = performance.now();
            
            window.scrollTo(0, 1000);
            
            return new Promise(resolve => {
              requestAnimationFrame(() => {
                const end = performance.now();
                window.scrollTo(0, 0); // Reset
                resolve(end - start);
              });
            });
          });
        },
        {
          iterations: 30,
          unit: 'ms',
          target: 16 // 60fps scrolling
        }
      );

    } finally {
      await page.close();
    }
  }

  private analyzeSystemMetrics(metrics: any[]): void {
    if (metrics.length === 0) return;

    const avgMetrics = metrics.reduce(
      (acc, metric) => ({
        cpu: acc.cpu + metric.cpu,
        memory: acc.memory + metric.memory
      }),
      { cpu: 0, memory: 0 }
    );

    avgMetrics.cpu /= metrics.length;
    avgMetrics.memory /= metrics.length;

    console.log(chalk.blue('\n📊 System Resource Usage During Frontend Tests:'));
    console.log(`  Average CPU: ${avgMetrics.cpu.toFixed(1)}%`);
    console.log(`  Average Memory: ${avgMetrics.memory.toFixed(1)}%`);
    
    const maxCpu = Math.max(...metrics.map(m => m.cpu));
    const maxMemory = Math.max(...metrics.map(m => m.memory));
    
    console.log(`  Peak CPU: ${maxCpu.toFixed(1)}%`);
    console.log(`  Peak Memory: ${maxMemory.toFixed(1)}%`);
  }

  private generateReport(): void {
    console.log(chalk.cyan('\n📋 FRONTEND BENCHMARK RESULTS\n'));
    console.log(this.runner.generateReport());
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.runner.saveResults(`./reports/frontend-benchmark-${timestamp}.json`);
  }
}

async function main() {
  const benchmarks = new FrontendBenchmarks();
  
  try {
    await benchmarks.runAllBenchmarks();
  } catch (error) {
    console.error(chalk.red('❌ Frontend benchmarks failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { FrontendBenchmarks };
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private readonly maxSamples = 100;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const samples = this.metrics.get(name)!;
    samples.push(value);
    
    // Keep only recent samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  getMetricStats(name: string): {
    avg: number;
    min: number;
    max: number;
    p95: number;
    count: number;
  } | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      avg: samples.reduce((sum, val) => sum + val, 0) / samples.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index],
      count: samples.length
    };
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name);
    }
    return result;
  }

  recordWebVital(name: string, value: number): void {
    this.recordMetric(`web_vital_${name}`, value);
    
    // Log significant web vitals
    if (name === 'LCP' && value > 2500) {
      console.warn(`Poor LCP detected: ${value}ms (target: <2500ms)`);
    }
    if (name === 'FID' && value > 100) {
      console.warn(`Poor FID detected: ${value}ms (target: <100ms)`);
    }
    if (name === 'CLS' && value > 0.1) {
      console.warn(`Poor CLS detected: ${value} (target: <0.1)`);
    }
  }

  startApiTimer(endpoint: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(`api_${endpoint}`, duration);
      
      // Log slow APIs
      if (duration > 1000) {
        console.warn(`Slow API detected: ${endpoint} took ${duration}ms`);
      }
    };
  }

  getHealthCheck(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: Record<string, any>;
    alerts: string[];
  } {
    const alerts: string[] = [];
    const metrics = this.getAllMetrics();
    
    // Check API performance
    const apiActivity = this.getMetricStats('api_activity');
    if (apiActivity && apiActivity.p95 > 1000) {
      alerts.push(`API response time P95: ${apiActivity.p95}ms (high)`);
    }

    // Check web vitals
    const lcp = this.getMetricStats('web_vital_LCP');
    if (lcp && lcp.avg > 2500) {
      alerts.push(`LCP average: ${lcp.avg}ms (poor)`);
    }

    const status = alerts.length === 0 ? 'healthy' : 
                  alerts.length <= 2 ? 'warning' : 'critical';

    return { status, metrics, alerts };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
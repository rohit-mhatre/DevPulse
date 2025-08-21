module.exports = {
  // Performance Targets
  targets: {
    desktop: {
      activityMonitoringCycle: 50, // ms p95
      databaseQuery: 10, // ms p95
      memoryUsage: 150, // MB baseline
      cpuIdle: 5, // % when idle
      cpuMonitoring: 15, // % when monitoring
    },
    dashboard: {
      apiResponse: 200, // ms p95
      pageLoad: 2000, // ms LCP
      memoryUsage: 100, // MB
      bundleSize: 500, // KB gzipped
    },
    system: {
      maxCpuUsage: 20, // % total system
      maxMemoryUsage: 250, // MB total
      diskIoRate: 10, // MB/s
    }
  },

  // Test Configuration
  tests: {
    // Duration for sustained load tests
    loadTestDuration: 60000, // 1 minute
    
    // Number of iterations for performance tests
    iterations: 1000,
    
    // Concurrency levels for API tests
    concurrency: [1, 5, 10, 25, 50],
    
    // Sample sizes for statistical analysis
    sampleSize: 100,
    
    // Warmup iterations before measurement
    warmupIterations: 10,
  },

  // Database Test Configuration
  database: {
    // Number of records to test with
    recordCounts: [100, 1000, 10000, 50000],
    
    // Query complexity levels
    queryTypes: ['simple', 'complex', 'aggregation', 'join'],
    
    // Concurrent connection tests
    connectionCounts: [1, 5, 10, 20],
  },

  // API Test Configuration
  api: {
    baseUrl: 'http://localhost:3001',
    endpoints: [
      { path: '/api/activity', method: 'GET' },
      { path: '/api/health', method: 'GET' },
      { path: '/api/ai/insights', method: 'GET' },
      { path: '/api/export/csv', method: 'POST' },
    ],
    
    // Request patterns
    patterns: ['constant', 'ramp-up', 'spike', 'sustained'],
  },

  // Frontend Test Configuration
  frontend: {
    // URLs to test
    pages: [
      { name: 'Dashboard', url: 'http://localhost:3001' },
      { name: 'Analytics', url: 'http://localhost:3001/ai-analytics' },
      { name: 'Focus', url: 'http://localhost:3001/focus' },
      { name: 'Health', url: 'http://localhost:3001/health' },
    ],
    
    // Device emulation
    devices: ['desktop', 'laptop', 'tablet'],
    
    // Network conditions
    networks: ['fast-3g', 'slow-3g', 'offline'],
  },

  // System Monitoring Configuration
  monitoring: {
    // Interval for collecting metrics (ms)
    interval: 1000,
    
    // Metrics to collect
    metrics: [
      'cpu',
      'memory',
      'disk',
      'network',
      'processes',
      'temperature'
    ],
    
    // Alert thresholds
    alerts: {
      cpuUsage: 80, // %
      memoryUsage: 85, // %
      diskUsage: 90, // %
      responseTime: 1000, // ms
    }
  },

  // Reporting Configuration
  reporting: {
    // Output formats
    formats: ['json', 'html', 'csv'],
    
    // Include detailed metrics
    detailed: true,
    
    // Generate charts
    charts: true,
    
    // Export location
    outputDir: './reports',
    
    // Retention period (days)
    retention: 30,
  },

  // Load Testing Configuration
  loadTesting: {
    // Ramp-up patterns
    rampUp: {
      duration: 30000, // 30s
      steps: 10,
    },
    
    // Sustained load
    sustained: {
      duration: 120000, // 2 minutes
      connections: 50,
    },
    
    // Spike testing
    spike: {
      duration: 10000, // 10s
      connections: 200,
    },
  },

  // Memory Leak Detection
  memoryLeak: {
    // Test duration
    duration: 300000, // 5 minutes
    
    // Sample interval
    sampleInterval: 5000, // 5s
    
    // Memory growth threshold
    growthThreshold: 10, // MB
  },

  // Performance Budget
  budget: {
    // Time budgets (ms)
    time: {
      pageLoad: 3000,
      apiResponse: 500,
      databaseQuery: 50,
      componentRender: 16, // 60fps
    },
    
    // Size budgets (KB)
    size: {
      totalBundle: 1000,
      jsBundle: 500,
      cssBundle: 100,
      images: 2000,
    },
    
    // Resource budgets
    resources: {
      maxRequests: 50,
      maxDomElements: 2000,
      maxEventListeners: 100,
    }
  }
};
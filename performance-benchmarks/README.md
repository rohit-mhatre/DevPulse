# DevPulse Performance Benchmarks

Comprehensive performance testing suite for the DevPulse productivity tracking system.

## 📋 Overview

This benchmark suite tests performance across:
- **Desktop App**: SQLite operations, activity monitoring, IPC communication
- **Dashboard**: API response times, rendering performance, real-time updates
- **System Resources**: CPU, memory, disk I/O under various loads

## 🎯 Performance Targets

### Desktop App Targets
- Activity monitoring cycle: <50ms p95
- Database queries: <10ms p95 
- Memory usage: <150MB baseline
- CPU usage: <5% when idle, <15% when monitoring

### Dashboard Targets
- API response time: <200ms p95
- Page load time: <2s (LCP)
- Memory usage: <100MB
- Bundle size: <500KB gzipped

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run all benchmarks
npm run benchmark

# Run specific benchmarks
npm run benchmark:desktop    # Desktop app performance
npm run benchmark:api       # API performance
npm run benchmark:frontend  # Frontend performance
npm run benchmark:system    # System resource usage

# Generate performance report
npm run benchmark:report
```

## 📊 Benchmark Categories

### 1. Database Performance
- Query execution times
- Insert/update operations
- Index performance
- Concurrent access patterns

### 2. Activity Monitoring
- Window detection latency
- Activity classification speed
- Memory usage during monitoring
- CPU impact assessment

### 3. API Performance
- Endpoint response times
- Database connection handling
- Error recovery mechanisms
- Concurrent request handling

### 4. Frontend Performance
- Component render times
- Chart rendering performance
- Real-time update efficiency
- Memory leak detection

### 5. System Integration
- IPC communication speed
- File system operations
- System permission checks
- Resource cleanup efficiency

## 📈 Performance Monitoring

### Real-time Monitoring
- Performance dashboard at `/performance`
- Live metrics collection
- Alert system for performance degradation

### Historical Analysis
- Performance trend tracking
- Regression detection
- Performance budget enforcement

## 🔧 Configuration

Edit `benchmark.config.js` to customize:
- Test duration and iterations
- Performance thresholds
- Resource limits
- Reporting options

## 📁 Structure

```
performance-benchmarks/
├── src/
│   ├── database/          # Database performance tests
│   ├── desktop/           # Desktop app benchmarks
│   ├── api/              # API performance tests
│   ├── frontend/         # Frontend benchmarks
│   ├── system/           # System resource tests
│   └── utils/            # Shared utilities
├── reports/              # Generated performance reports
├── config/              # Benchmark configurations
└── scripts/             # Automation scripts
```
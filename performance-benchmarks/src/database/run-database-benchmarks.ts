#!/usr/bin/env tsx

import * as path from 'path';
import Database from 'better-sqlite3';
import { BenchmarkRunner, PerformanceMonitor, formatDuration } from '../utils/benchmark-utils';
import chalk from 'chalk';
import { performance } from 'perf_hooks';

const config = require('../../benchmark.config.js');

interface TestActivity {
  id: string;
  project_id?: string;
  app_name: string;
  window_title?: string;
  file_path?: string;
  activity_type: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string;
  is_idle: boolean;
  metadata?: string;
}

class DatabaseBenchmarks {
  private db: Database.Database;
  private runner: BenchmarkRunner;
  private monitor: PerformanceMonitor;

  constructor() {
    this.runner = new BenchmarkRunner();
    this.monitor = new PerformanceMonitor();
    
    // Create test database in memory for benchmarks
    this.db = new Database(':memory:');
    this.initializeTestSchema();
  }

  private initializeTestSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        git_remote_url TEXT,
        tags TEXT DEFAULT '[]',
        color TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        app_name TEXT NOT NULL,
        window_title TEXT,
        file_path TEXT,
        activity_type TEXT NOT NULL CHECK(activity_type IN ('code', 'build', 'test', 'debug', 'browsing', 'research', 'communication', 'design', 'document', 'other')),
        duration_seconds INTEGER NOT NULL,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP NOT NULL,
        is_idle BOOLEAN DEFAULT FALSE,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_started_at ON activity_logs(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_app_name ON activity_logs(app_name);
      CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
    `);

    console.log(chalk.green('✓ Test database schema initialized'));
  }

  async runAllBenchmarks(): Promise<void> {
    console.log(chalk.cyan('\n🗄️  DATABASE PERFORMANCE BENCHMARKS\n'));
    
    this.monitor.startMonitoring(100); // Monitor every 100ms

    try {
      // Setup test data
      await this.setupTestData();
      
      // Run individual benchmarks
      await this.benchmarkInsertOperations();
      await this.benchmarkSelectQueries();
      await this.benchmarkUpdateOperations();
      await this.benchmarkComplexQueries();
      await this.benchmarkConcurrentAccess();
      await this.benchmarkIndexPerformance();
      await this.benchmarkTransactions();
      
      // Memory and resource benchmarks
      await this.benchmarkMemoryUsage();
      
    } finally {
      const systemMetrics = this.monitor.stopMonitoring();
      this.analyzeSystemMetrics(systemMetrics);
      this.generateReport();
    }
  }

  private async setupTestData(): Promise<void> {
    console.log(chalk.blue('📝 Setting up test data...'));
    
    // Insert test projects
    const insertProject = this.db.prepare(`
      INSERT INTO projects (id, name, path, git_remote_url, tags)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < 100; i++) {
      insertProject.run(
        `project-${i}`,
        `Project ${i}`,
        `/path/to/project-${i}`,
        `https://github.com/user/project-${i}.git`,
        JSON.stringify(['tag1', 'tag2'])
      );
    }

    // Insert test activities for different record counts
    const insertActivity = this.db.prepare(`
      INSERT INTO activity_logs 
      (id, project_id, app_name, window_title, file_path, activity_type, 
       duration_seconds, started_at, ended_at, is_idle, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const activityTypes = ['code', 'build', 'test', 'debug', 'browsing', 'research', 'communication', 'design', 'document', 'other'];
    const appNames = ['Visual Studio Code', 'Chrome', 'Terminal', 'Slack', 'Figma', 'Notion'];
    
    for (let i = 0; i < config.database.recordCounts[2]; i++) { // 10,000 records
      const startTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const duration = Math.floor(Math.random() * 3600) + 60; // 1-60 minutes
      const endTime = new Date(startTime.getTime() + duration * 1000);
      
      insertActivity.run(
        `activity-${i}`,
        Math.random() > 0.3 ? `project-${Math.floor(Math.random() * 100)}` : null,
        appNames[Math.floor(Math.random() * appNames.length)],
        `Window Title ${i}`,
        Math.random() > 0.5 ? `/path/to/file-${i}.js` : null,
        activityTypes[Math.floor(Math.random() * activityTypes.length)],
        duration,
        startTime.toISOString(),
        endTime.toISOString(),
        Math.random() > 0.9 ? 1 : 0,
        JSON.stringify({ test: true, index: i })
      );
    }

    console.log(chalk.green('✓ Test data setup complete'));
  }

  private async benchmarkInsertOperations(): Promise<void> {
    console.log(chalk.blue('\n📝 INSERT Operations'));

    const insertStmt = this.db.prepare(`
      INSERT INTO activity_logs 
      (id, app_name, activity_type, duration_seconds, started_at, ended_at, is_idle)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    await this.runner.runBenchmark(
      'Single Insert',
      () => {
        const now = new Date();
        insertStmt.run(
          `bench-${Date.now()}-${Math.random()}`,
          'BenchmarkApp',
          'code',
          60,
          now.toISOString(),
          new Date(now.getTime() + 60000).toISOString(),
          0
        );
      },
      {
        iterations: 1000,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery
      }
    );

    // Batch insert benchmark
    await this.runner.runBenchmark(
      'Batch Insert (100 records)',
      () => {
        const transaction = this.db.transaction(() => {
          for (let i = 0; i < 100; i++) {
            const now = new Date();
            insertStmt.run(
              `batch-${Date.now()}-${i}-${Math.random()}`,
              'BenchmarkApp',
              'code',
              60,
              now.toISOString(),
              new Date(now.getTime() + 60000).toISOString(),
              0
            );
          }
        });
        transaction();
      },
      {
        iterations: 50,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 10
      }
    );
  }

  private async benchmarkSelectQueries(): Promise<void> {
    console.log(chalk.blue('\n🔍 SELECT Queries'));

    // Simple select
    const simpleSelect = this.db.prepare('SELECT * FROM activity_logs LIMIT 10');
    await this.runner.runBenchmark(
      'Simple SELECT (10 records)',
      () => simpleSelect.all(),
      {
        iterations: 1000,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery
      }
    );

    // Indexed query
    const indexedQuery = this.db.prepare(`
      SELECT * FROM activity_logs 
      WHERE started_at >= ? 
      ORDER BY started_at DESC 
      LIMIT 100
    `);
    
    await this.runner.runBenchmark(
      'Indexed Query (date range)',
      () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return indexedQuery.all(yesterday.toISOString());
      },
      {
        iterations: 500,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery
      }
    );

    // Complex query with JOIN
    const joinQuery = this.db.prepare(`
      SELECT a.*, p.name as project_name 
      FROM activity_logs a 
      LEFT JOIN projects p ON a.project_id = p.id 
      WHERE a.activity_type = ? 
      ORDER BY a.started_at DESC 
      LIMIT 50
    `);

    await this.runner.runBenchmark(
      'JOIN Query',
      () => joinQuery.all('code'),
      {
        iterations: 300,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 2
      }
    );

    // Aggregation query
    const aggregateQuery = this.db.prepare(`
      SELECT 
        activity_type,
        COUNT(*) as count,
        SUM(duration_seconds) as total_duration,
        AVG(duration_seconds) as avg_duration
      FROM activity_logs 
      WHERE started_at >= ?
      GROUP BY activity_type
      ORDER BY total_duration DESC
    `);

    await this.runner.runBenchmark(
      'Aggregation Query',
      () => {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return aggregateQuery.all(lastWeek.toISOString());
      },
      {
        iterations: 200,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 3
      }
    );
  }

  private async benchmarkUpdateOperations(): Promise<void> {
    console.log(chalk.blue('\n✏️  UPDATE Operations'));

    const updateStmt = this.db.prepare(`
      UPDATE activity_logs 
      SET metadata = ? 
      WHERE id = ?
    `);

    // Get some IDs to update
    const ids = this.db.prepare('SELECT id FROM activity_logs LIMIT 1000').all().map((row: any) => row.id);

    await this.runner.runBenchmark(
      'Single UPDATE',
      () => {
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        updateStmt.run(JSON.stringify({ updated: true, timestamp: Date.now() }), randomId);
      },
      {
        iterations: 500,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery
      }
    );

    // Batch update
    await this.runner.runBenchmark(
      'Batch UPDATE (50 records)',
      () => {
        const transaction = this.db.transaction(() => {
          for (let i = 0; i < 50; i++) {
            const randomId = ids[Math.floor(Math.random() * ids.length)];
            updateStmt.run(JSON.stringify({ updated: true, batch: i, timestamp: Date.now() }), randomId);
          }
        });
        transaction();
      },
      {
        iterations: 100,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 5
      }
    );
  }

  private async benchmarkComplexQueries(): Promise<void> {
    console.log(chalk.blue('\n🧮 Complex Queries'));

    // Time series query
    const timeSeriesQuery = this.db.prepare(`
      SELECT 
        DATE(started_at) as date,
        activity_type,
        SUM(duration_seconds) as total_duration
      FROM activity_logs 
      WHERE started_at >= ?
      GROUP BY DATE(started_at), activity_type
      ORDER BY date DESC, total_duration DESC
    `);

    await this.runner.runBenchmark(
      'Time Series Query',
      () => {
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return timeSeriesQuery.all(lastMonth.toISOString());
      },
      {
        iterations: 100,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 5
      }
    );

    // Top applications query
    const topAppsQuery = this.db.prepare(`
      SELECT 
        app_name,
        COUNT(*) as session_count,
        SUM(duration_seconds) as total_time,
        AVG(duration_seconds) as avg_session_time,
        MAX(duration_seconds) as max_session_time
      FROM activity_logs 
      WHERE started_at >= ? AND is_idle = 0
      GROUP BY app_name
      HAVING session_count >= 10
      ORDER BY total_time DESC
      LIMIT 20
    `);

    await this.runner.runBenchmark(
      'Top Applications Query',
      () => {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return topAppsQuery.all(lastWeek.toISOString());
      },
      {
        iterations: 50,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 10
      }
    );
  }

  private async benchmarkConcurrentAccess(): Promise<void> {
    console.log(chalk.blue('\n🔄 Concurrent Access'));

    const selectStmt = this.db.prepare('SELECT COUNT(*) as count FROM activity_logs');
    const insertStmt = this.db.prepare(`
      INSERT INTO activity_logs 
      (id, app_name, activity_type, duration_seconds, started_at, ended_at, is_idle)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    await this.runner.runBenchmark(
      'Concurrent Read/Write (Mixed)',
      () => {
        const promises: Promise<any>[] = [];
        
        // Simulate concurrent reads
        for (let i = 0; i < 5; i++) {
          promises.push(Promise.resolve(selectStmt.get()));
        }
        
        // Simulate concurrent writes
        for (let i = 0; i < 2; i++) {
          const now = new Date();
          promises.push(Promise.resolve(
            insertStmt.run(
              `concurrent-${Date.now()}-${i}-${Math.random()}`,
              'ConcurrentApp',
              'test',
              30,
              now.toISOString(),
              new Date(now.getTime() + 30000).toISOString(),
              0
            )
          ));
        }
        
        return Promise.all(promises);
      },
      {
        iterations: 100,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 2
      }
    );
  }

  private async benchmarkIndexPerformance(): Promise<void> {
    console.log(chalk.blue('\n📇 Index Performance'));

    // Query with index
    const indexedQuery = this.db.prepare(`
      SELECT * FROM activity_logs 
      WHERE app_name = ? 
      ORDER BY started_at DESC 
      LIMIT 100
    `);

    await this.runner.runBenchmark(
      'Indexed Query (app_name)',
      () => indexedQuery.all('Visual Studio Code'),
      {
        iterations: 500,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery
      }
    );

    // Query without index (using file_path)
    const nonIndexedQuery = this.db.prepare(`
      SELECT * FROM activity_logs 
      WHERE file_path LIKE ? 
      LIMIT 100
    `);

    await this.runner.runBenchmark(
      'Non-indexed Query (file_path)',
      () => nonIndexedQuery.all('%.js'),
      {
        iterations: 100,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 10
      }
    );
  }

  private async benchmarkTransactions(): Promise<void> {
    console.log(chalk.blue('\n💳 Transactions'));

    const insertStmt = this.db.prepare(`
      INSERT INTO activity_logs 
      (id, app_name, activity_type, duration_seconds, started_at, ended_at, is_idle)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    await this.runner.runBenchmark(
      'Transaction (10 inserts)',
      () => {
        const transaction = this.db.transaction(() => {
          for (let i = 0; i < 10; i++) {
            const now = new Date();
            insertStmt.run(
              `trans-${Date.now()}-${i}-${Math.random()}`,
              'TransactionApp',
              'code',
              60,
              now.toISOString(),
              new Date(now.getTime() + 60000).toISOString(),
              0
            );
          }
        });
        transaction();
      },
      {
        iterations: 200,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 2
      }
    );
  }

  private async benchmarkMemoryUsage(): Promise<void> {
    console.log(chalk.blue('\n💾 Memory Usage'));

    const initialMemory = process.memoryUsage();
    
    // Large result set query
    const largeQuery = this.db.prepare('SELECT * FROM activity_logs');
    
    await this.runner.runBenchmark(
      'Large Result Set (all records)',
      () => {
        const results = largeQuery.all();
        return results.length;
      },
      {
        iterations: 10,
        unit: 'ms',
        target: config.targets.desktop.databaseQuery * 50
      }
    );

    const finalMemory = process.memoryUsage();
    const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
    
    console.log(chalk.yellow(`Memory usage change: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`));
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

    console.log(chalk.blue('\n📊 System Resource Usage During Tests:'));
    console.log(`  Average CPU: ${avgMetrics.cpu.toFixed(1)}%`);
    console.log(`  Average Memory: ${avgMetrics.memory.toFixed(1)}%`);
    
    const maxCpu = Math.max(...metrics.map(m => m.cpu));
    const maxMemory = Math.max(...metrics.map(m => m.memory));
    
    console.log(`  Peak CPU: ${maxCpu.toFixed(1)}%`);
    console.log(`  Peak Memory: ${maxMemory.toFixed(1)}%`);
  }

  private generateReport(): void {
    console.log(chalk.cyan('\n📋 DATABASE BENCHMARK RESULTS\n'));
    console.log(this.runner.generateReport());
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.runner.saveResults(`./reports/database-benchmark-${timestamp}.json`);
  }

  cleanup(): void {
    this.db.close();
  }
}

async function main() {
  const benchmarks = new DatabaseBenchmarks();
  
  try {
    await benchmarks.runAllBenchmarks();
  } catch (error) {
    console.error(chalk.red('❌ Database benchmarks failed:'), error);
    process.exit(1);
  } finally {
    benchmarks.cleanup();
  }
}

if (require.main === module) {
  main();
}

export { DatabaseBenchmarks };
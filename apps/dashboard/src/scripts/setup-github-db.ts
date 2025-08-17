#!/usr/bin/env npx tsx

/**
 * GitHub Database Setup Script
 * 
 * This script initializes the GitHub integration database schema
 * in the existing DevPulse SQLite database.
 * 
 * Usage:
 *   npm run setup:github
 *   or
 *   npx tsx src/scripts/setup-github-db.ts
 */

import fs from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';
import os from 'os';

async function setupGitHubDatabase() {
  try {
    console.log('🔧 Setting up GitHub integration database...');

    // Locate DevPulse database
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'DevPulse Desktop');
    const dbPath = path.join(userDataPath, 'devpulse.db');

    // Check if database exists
    try {
      await fs.access(dbPath);
      console.log(`✅ Found DevPulse database at: ${dbPath}`);
    } catch (error) {
      console.error(`❌ DevPulse database not found at: ${dbPath}`);
      console.error('Please ensure DevPulse Desktop is installed and has been run at least once.');
      process.exit(1);
    }

    // Open database connection
    const db = new Database(dbPath);
    console.log('📊 Connected to database');

    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');

    // Read GitHub schema file
    const schemaPath = path.join(__dirname, '..', 'lib', 'github-schema.sql');
    let schemaSql: string;
    
    try {
      schemaSql = await fs.readFile(schemaPath, 'utf-8');
      console.log('📄 Loaded GitHub schema');
    } catch (error) {
      console.error('❌ Failed to read GitHub schema file:', error);
      process.exit(1);
    }

    // Execute schema
    try {
      db.exec(schemaSql);
      console.log('✅ GitHub database schema created successfully');
    } catch (error) {
      // Check if tables already exist
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('ℹ️  GitHub tables already exist, skipping creation');
      } else {
        console.error('❌ Failed to create GitHub schema:', error);
        process.exit(1);
      }
    }

    // Verify tables were created
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE 'github_%'
      ORDER BY name
    `).all();

    console.log('📋 Created GitHub tables:');
    tables.forEach((table: any) => {
      console.log(`   - ${table.name}`);
    });

    // Create initial user settings record if it doesn't exist
    try {
      const existingSettings = db.prepare(`
        SELECT COUNT(*) as count FROM github_settings WHERE user_id = 'default'
      `).get() as { count: number };

      if (existingSettings.count === 0) {
        db.prepare(`
          INSERT INTO github_settings (user_id, sync_enabled, sync_frequency_minutes, private_repos_enabled)
          VALUES ('default', 0, 60, 0)
        `).run();
        console.log('✅ Created default GitHub settings');
      } else {
        console.log('ℹ️  GitHub settings already exist');
      }
    } catch (error) {
      console.error('⚠️  Failed to create default settings:', error);
    }

    // Close database connection
    db.close();
    console.log('📊 Database connection closed');

    console.log('\n🎉 GitHub integration setup complete!');
    console.log('\nNext steps:');
    console.log('1. Create a GitHub OAuth App: https://github.com/settings/applications/new');
    console.log('2. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file');
    console.log('3. Start the dashboard and connect your GitHub account');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  setupGitHubDatabase();
}

export { setupGitHubDatabase };
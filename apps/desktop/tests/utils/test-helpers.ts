/**
 * Test utilities and helpers
 */

import { ActivityEvent, ActivityLog, Project } from '../../src/main/database';
import { ActiveWindow, ActivityType } from '../../src/main/activity-monitor';
import { ProjectCandidate } from '../../src/main/project-detector';

/**
 * Creates a mock ActiveWindow for testing
 */
export function createMockActiveWindow(overrides: Partial<ActiveWindow> = {}): ActiveWindow {
  return {
    appName: 'Visual Studio Code',
    title: 'test.ts - my-project - Visual Studio Code',
    pid: 1234,
    ...overrides
  };
}

/**
 * Creates a mock ActivityEvent for testing
 */
export function createMockActivityEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date('2024-01-01T10:00:00Z'),
    appName: 'Visual Studio Code',
    windowTitle: 'test.ts - my-project',
    filePath: 'test.ts',
    projectPath: '/test/projects/my-project',
    activityType: 'code',
    isIdle: false,
    ...overrides
  };
}

/**
 * Creates a mock ActivityLog for testing
 */
export function createMockActivityLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  const startTime = new Date('2024-01-01T10:00:00Z');
  const endTime = new Date('2024-01-01T10:05:00Z');
  
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    project_id: 'test-project-id',
    app_name: 'Visual Studio Code',
    window_title: 'test.ts - my-project',
    file_path: 'test.ts',
    activity_type: 'code',
    duration_seconds: 300,
    started_at: startTime,
    ended_at: endTime,
    is_idle: false,
    metadata: '{}',
    ...overrides
  };
}

/**
 * Creates a mock Project for testing
 */
export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Project',
    path: '/test/projects/test-project',
    git_remote_url: 'https://github.com/user/test-project.git',
    tags: '["javascript", "react"]',
    color: '#3B82F6',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    ...overrides
  };
}

/**
 * Creates a mock ProjectCandidate for testing
 */
export function createMockProjectCandidate(overrides: Partial<ProjectCandidate> = {}): ProjectCandidate {
  return {
    path: '/test/projects/test-project',
    name: 'test-project',
    type: 'git',
    confidence: 0.9,
    metadata: {
      git: {
        remoteUrl: 'https://github.com/user/test-project.git',
        currentBranch: 'main',
        isClean: true
      }
    },
    ...overrides
  };
}

/**
 * Creates a temporary directory structure for testing
 */
export function createMockFileSystem(): Record<string, any> {
  return {
    '/test/projects/react-app': {
      'package.json': JSON.stringify({
        name: 'react-app',
        version: '1.0.0',
        dependencies: { react: '^18.0.0' }
      }),
      '.git': {
        config: '[remote "origin"]\n  url = https://github.com/user/react-app.git'
      },
      'src': {
        'App.tsx': 'export default function App() { return <div>Hello</div>; }'
      }
    },
    '/test/projects/rust-project': {
      'Cargo.toml': '[package]\nname = "rust-project"\nversion = "0.1.0"\nedition = "2021"',
      '.git': {
        config: '[remote "origin"]\n  url = https://github.com/user/rust-project.git'
      },
      'src': {
        'main.rs': 'fn main() { println!("Hello, world!"); }'
      }
    },
    '/test/projects/python-app': {
      'requirements.txt': 'flask==2.0.0\nrequests==2.28.0',
      'setup.py': 'from setuptools import setup\nsetup(name="python-app")',
      '.git': {
        config: '[remote "origin"]\n  url = https://github.com/user/python-app.git'
      },
      'app.py': 'from flask import Flask\napp = Flask(__name__)'
    }
  };
}

/**
 * Mock file system operations
 */
export function mockFileSystemOperations() {
  const mockFS = createMockFileSystem();
  
  const mockExists = jest.fn((path: string) => {
    const parts = path.split('/').filter(Boolean);
    let current = mockFS;
    
    for (const part of parts) {
      if (current[`/${part}`] || current[part]) {
        current = current[`/${part}`] || current[part];
      } else {
        return false;
      }
    }
    return true;
  });
  
  const mockReaddir = jest.fn((path: string) => {
    const parts = path.split('/').filter(Boolean);
    let current = mockFS;
    
    for (const part of parts) {
      if (current[`/${part}`] || current[part]) {
        current = current[`/${part}`] || current[part];
      } else {
        throw new Error(`Directory not found: ${path}`);
      }
    }
    
    return Promise.resolve(Object.keys(current));
  });
  
  const mockReadFile = jest.fn((path: string) => {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    let current = mockFS;
    
    for (const part of parts) {
      if (current[`/${part}`] || current[part]) {
        current = current[`/${part}`] || current[part];
      } else {
        throw new Error(`Directory not found: ${path}`);
      }
    }
    
    if (current[fileName!]) {
      return Promise.resolve(current[fileName!]);
    }
    throw new Error(`File not found: ${path}`);
  });
  
  return {
    mockExists,
    mockReaddir,
    mockReadFile,
    mockFS
  };
}

/**
 * Helper to wait for async operations
 */
export function waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
}

/**
 * Creates a spy that tracks method calls
 */
export function createMethodSpy<T extends Record<string, any>>(
  obj: T,
  method: keyof T
): jest.SpyInstance {
  return jest.spyOn(obj, method as any);
}

/**
 * Activity type test data
 */
export const ACTIVITY_TYPES: ActivityType[] = ['code', 'build', 'test', 'debug', 'other'];

/**
 * Common window titles for testing activity classification
 */
export const WINDOW_TITLES = {
  vscode: 'main.ts - my-project - Visual Studio Code',
  terminal: 'Terminal — npm test',
  browser: 'localhost:3000 - Google Chrome',
  debugger: 'Debugger - Node.js',
  buildTool: 'Gradle Build - IntelliJ IDEA'
};

/**
 * Common app names for testing activity classification
 */
export const APP_NAMES = {
  vscode: 'Visual Studio Code',
  terminal: 'Terminal',
  browser: 'Google Chrome',
  jetbrains: 'IntelliJ IDEA',
  vim: 'Vim'
};
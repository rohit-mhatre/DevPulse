import { vi } from 'vitest'

// Mock Electron modules that aren't available in test environment
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/devpulse-test'),
    on: vi.fn(),
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn(() => true),
    setAsDefaultProtocolClient: vi.fn()
  },
  BrowserWindow: vi.fn(() => ({
    loadURL: vi.fn(),
    on: vi.fn(),
    webContents: {
      openDevTools: vi.fn()
    },
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    isMinimized: vi.fn(() => false),
    restore: vi.fn()
  })),
  Tray: vi.fn(() => ({
    setContextMenu: vi.fn(),
    setToolTip: vi.fn(),
    on: vi.fn(),
    displayBalloon: vi.fn(),
    destroy: vi.fn(),
    setImage: vi.fn(),
    popUpContextMenu: vi.fn()
  })),
  Menu: {
    buildFromTemplate: vi.fn(() => ({}))
  },
  nativeImage: {
    createFromBuffer: vi.fn(() => ({})),
    createFromPath: vi.fn(() => ({}))
  },
  powerMonitor: {
    on: vi.fn(),
    getSystemIdleTime: vi.fn(() => 0)
  },
  systemPreferences: {
    getMediaAccessStatus: vi.fn(() => 'granted'),
    askForMediaAccess: vi.fn(() => Promise.resolve(true))
  },
  shell: {
    openExternal: vi.fn()
  },
  dialog: {
    showSaveDialog: vi.fn(() => Promise.resolve({ canceled: false, filePath: '/tmp/test.json' })),
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 }))
  }
}))

// Mock better-sqlite3
vi.mock('better-sqlite3', () => {
  const mockDb = {
    exec: vi.fn(),
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => [])
    })),
    close: vi.fn()
  }
  
  return { default: vi.fn(() => mockDb) }
})

// Mock canvas
vi.mock('canvas', () => ({
  createCanvas: vi.fn(() => ({
    getContext: vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
    })),
    toBuffer: vi.fn(() => Buffer.from(''))
  }))
}))

// Mock child_process exec
vi.mock('child_process', () => ({
  exec: vi.fn((command, options, callback) => {
    // Provide different mock responses based on command
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    
    let mockResponse = { stdout: '', stderr: '' }
    
    if (command.includes('osascript')) {
      mockResponse.stdout = 'TestApp|TestWindow'
    } else if (command.includes('git status')) {
      mockResponse.stdout = ''
    } else if (command.includes('git rev-parse')) {
      mockResponse.stdout = 'main'
    }
    
    setTimeout(() => callback(null, mockResponse), 0)
  })
}))

// Mock fs promises
vi.mock('fs', () => ({
  ...vi.importActual('fs'),
  promises: {
    readdir: vi.fn(() => Promise.resolve(['package.json', '.git'])),
    readFile: vi.fn((path) => {
      if (path.includes('package.json')) {
        return Promise.resolve('{"name":"test-project","version":"1.0.0"}')
      } else if (path.includes('config')) {
        return Promise.resolve('[remote "origin"]\\n\\turl = https://github.com/user/repo.git')
      }
      return Promise.resolve('')
    }),
    writeFile: vi.fn(() => Promise.resolve())
  },
  existsSync: vi.fn((path) => {
    if (path.includes('.git') || path.includes('package.json')) {
      return true
    }
    return false
  })
}))

// Global test utilities with proper typing
declare global {
  var createMockActivityEvent: (overrides?: any) => any
  var createMockProject: (overrides?: any) => any
}

globalThis.createMockActivityEvent = (overrides = {}) => ({
  id: 'test-activity-1',
  timestamp: new Date(),
  appName: 'Visual Studio Code',
  windowTitle: 'main.ts - devpulse',
  filePath: 'main.ts',
  projectPath: '/path/to/project',
  activityType: 'code' as const,
  isIdle: false,
  ...overrides
})

globalThis.createMockProject = (overrides = {}) => ({
  id: 'test-project-1',
  name: 'DevPulse',
  path: '/path/to/devpulse',
  git_remote_url: 'https://github.com/user/devpulse.git',
  tags: '["typescript", "electron"]',
  color: '#3B82F6',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
})
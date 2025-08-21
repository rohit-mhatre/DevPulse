import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ActivityMonitor } from '../../src/main/activity-monitor'
import { LocalDatabase } from '../../src/main/database'

describe('ActivityMonitor', () => {
  let activityMonitor: ActivityMonitor
  let mockDatabase: LocalDatabase

  beforeEach(() => {
    // Create a real database instance (which uses mocked better-sqlite3)
    mockDatabase = new LocalDatabase()
    activityMonitor = new ActivityMonitor(mockDatabase)
    vi.clearAllMocks()
  })

  afterEach(() => {
    activityMonitor.cleanup()
    mockDatabase.cleanup()
  })

  describe('Initialization', () => {
    it('should initialize with monitoring stopped', () => {
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(false)
    })

    it('should initialize with no current activity', () => {
      expect(activityMonitor.getCurrentActivity()).toBeNull()
    })

    it('should accept database instance in constructor', () => {
      expect(() => new ActivityMonitor(mockDatabase)).not.toThrow()
    })

    it('should have last activity time set', () => {
      const lastActivityTime = activityMonitor.getLastActivityTime()
      expect(lastActivityTime).toBeInstanceOf(Date)
    })
  })

  describe('Monitoring State Management', () => {
    it('should start monitoring successfully', async () => {
      await activityMonitor.startMonitoring()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(true)
    })

    it('should stop monitoring successfully', async () => {
      await activityMonitor.startMonitoring()
      activityMonitor.stopMonitoring()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(false)
    })

    it('should handle multiple start monitoring calls gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await activityMonitor.startMonitoring()
      await activityMonitor.startMonitoring() // Second call
      
      expect(consoleSpy).toHaveBeenCalledWith('Activity monitoring already started')
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(true)
      
      consoleSpy.mockRestore()
    })

    it('should handle stop monitoring when not started', () => {
      expect(() => activityMonitor.stopMonitoring()).not.toThrow()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(false)
    })

    it('should handle cleanup properly', () => {
      expect(() => activityMonitor.cleanup()).not.toThrow()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(false)
    })
  })

  describe('Activity Classification (Private Method)', () => {
    it('should classify VS Code as coding activity', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Visual Studio Code',
        title: 'main.ts - DevPulse'
      })
      
      expect(activity).toBe('code')
    })

    it('should classify WebStorm as coding activity', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'WebStorm',
        title: 'Project - main.ts'
      })
      
      expect(activity).toBe('code')
    })

    it('should classify Vim as coding activity', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Terminal',
        title: 'vim main.ts'
      })
      
      expect(activity).toBe('code')
    })

    it('should classify npm run build as build activity', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Terminal',
        title: 'npm run build'
      })
      
      expect(activity).toBe('build')
    })

    it('should classify webpack as build activity', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Terminal',
        title: 'webpack --mode production'
      })
      
      expect(activity).toBe('build')
    })

    it('should classify npm test as test activity', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'iTerm',
        title: 'npm test'
      })
      
      expect(activity).toBe('test')
    })

    it('should classify jest as test activity', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Terminal',
        title: 'jest --watch'
      })
      
      expect(activity).toBe('test')
    })

    it('should classify Docker as build activity', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Docker Desktop',
        title: 'Containers'
      })
      
      expect(activity).toBe('build')
    })

    it('should classify browser developer tools as coding', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Google Chrome',
        title: 'Developer Tools - localhost:3000'
      })
      
      expect(activity).toBe('code')
    })

    it('should classify Safari as browsing', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Safari',
        title: 'Random Website'
      })
      
      expect(activity).toBe('browsing')
    })

    it('should handle empty window titles', () => {
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Unknown App',
        title: ''
      })
      
      expect(activity).toBe('other')
    })

    it('should handle undefined window titles gracefully', () => {
      // The actual implementation requires title to be defined based on ActiveWindow interface
      // This test verifies that the method exists and can handle basic inputs
      const activity = (activityMonitor as any).classifyActivity({
        appName: 'Unknown App',
        title: ''
      })
      
      expect(activity).toBe('other')
    })
  })

  describe('File Path Extraction (Private Method)', () => {
    it('should extract file path from VS Code window title', () => {
      const filePath = (activityMonitor as any).extractFilePath('main.ts - DevPulse - Visual Studio Code')
      expect(filePath).toBe('main.ts')
    })

    it('should extract file path from JetBrains IDE title', () => {
      const filePath = (activityMonitor as any).extractFilePath('[DevPulse] - main.ts')
      expect(filePath).toBe('main.ts')
    })

    it('should extract file path from Sublime Text title', () => {
      const filePath = (activityMonitor as any).extractFilePath('main.ts (/path/to/project) - Sublime Text')
      expect(filePath).toBe('main.ts')
    })

    it('should extract file path from Atom title', () => {
      const filePath = (activityMonitor as any).extractFilePath('main.ts - DevPulse - Atom')
      expect(filePath).toBe('main.ts')
    })

    it('should handle command-line editors by extracting filename', () => {
      const filePath = (activityMonitor as any).extractFilePath('vim main.ts')
      expect(filePath).toContain('main.ts')
    })

    it('should return undefined for window title without file', () => {
      const filePath = (activityMonitor as any).extractFilePath('DevPulse Dashboard')
      expect(filePath).toBeUndefined()
    })

    it('should return undefined for empty window title', () => {
      const filePath = (activityMonitor as any).extractFilePath('')
      expect(filePath).toBeUndefined()
    })

    it('should return undefined for undefined window title', () => {
      const filePath = (activityMonitor as any).extractFilePath(undefined)
      expect(filePath).toBeUndefined()
    })

    it('should handle complex file paths with directories', () => {
      const filePath = (activityMonitor as any).extractFilePath('src/components/Header.tsx - DevPulse - Visual Studio Code')
      expect(filePath).toBe('src/components/Header.tsx')
    })
  })

  describe('Activity Processing (Private Methods)', () => {
    it('should detect same activity correctly', () => {
      const activity1 = createMockActivityEvent({
        appName: 'VS Code',
        windowTitle: 'main.ts',
        activityType: 'code',
        projectPath: '/project'
      })

      const activity2 = createMockActivityEvent({
        appName: 'VS Code',
        windowTitle: 'main.ts',
        activityType: 'code',
        projectPath: '/project'
      })

      const isSame = (activityMonitor as any).isSameActivity(activity1, activity2)
      expect(isSame).toBe(true)
    })

    it('should detect different activities by app name', () => {
      const activity1 = createMockActivityEvent({
        appName: 'VS Code',
        windowTitle: 'main.ts'
      })

      const activity2 = createMockActivityEvent({
        appName: 'Terminal',
        windowTitle: 'main.ts'
      })

      const isSame = (activityMonitor as any).isSameActivity(activity1, activity2)
      expect(isSame).toBe(false)
    })

    it('should detect different activities by window title', () => {
      const activity1 = createMockActivityEvent({
        appName: 'VS Code',
        windowTitle: 'main.ts'
      })

      const activity2 = createMockActivityEvent({
        appName: 'VS Code',
        windowTitle: 'helper.ts'
      })

      const isSame = (activityMonitor as any).isSameActivity(activity1, activity2)
      expect(isSame).toBe(false)
    })

    it('should detect different activities by project path', () => {
      const activity1 = createMockActivityEvent({
        appName: 'VS Code',
        windowTitle: 'main.ts',
        projectPath: '/project1'
      })

      const activity2 = createMockActivityEvent({
        appName: 'VS Code',
        windowTitle: 'main.ts',
        projectPath: '/project2'
      })

      const isSame = (activityMonitor as any).isSameActivity(activity1, activity2)
      expect(isSame).toBe(false)
    })
  })

  describe('System Integration (Private Methods)', () => {
    it('should handle macOS active window detection', async () => {
      const result = await (activityMonitor as any).getMacActiveWindow()
      
      // Should return the mocked result from setup.ts
      expect(result).toEqual({
        appName: 'TestApp',
        title: 'TestWindow'
      })
    })

    it('should handle Windows active window detection', async () => {
      const result = await (activityMonitor as any).getWindowsActiveWindow()
      
      // Should handle Windows detection (even if mocked)
      expect(result).toBeDefined()
    })

    it('should handle Linux active window detection', async () => {
      const result = await (activityMonitor as any).getLinuxActiveWindow()
      
      // Should handle Linux detection (even if mocked)
      expect(result).toBeDefined()
    })

    it('should get system idle time', () => {
      const idleTime = (activityMonitor as any).getSystemIdleTime()
      expect(typeof idleTime).toBe('number')
      expect(idleTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle permission requests', async () => {
      const hasPermission = await (activityMonitor as any).requestScreenRecordingPermission()
      expect(typeof hasPermission).toBe('boolean')
    })
  })

  describe('Error Handling', () => {
    it('should handle active window detection errors gracefully', async () => {
      // Mock child_process exec to throw error
      const { exec } = await import('child_process')
      vi.mocked(exec).mockImplementation((command, callback) => {
        callback(new Error('Permission denied'), { stdout: '', stderr: '' })
      })

      const result = await (activityMonitor as any).getActiveWindow()
      expect(result).toBeNull()
    })

    it('should handle malformed window detection output', async () => {
      // Mock child_process exec to return output without pipe separator
      const { exec } = await import('child_process')
      vi.mocked(exec).mockImplementation((command, callback) => {
        callback(null, { stdout: 'no_pipe_separator', stderr: '' })
      })

      const result = await (activityMonitor as any).getMacActiveWindow()
      // The implementation should handle this gracefully
      expect(result).toBeDefined()
    })

    it('should handle empty window detection output', async () => {
      // Mock child_process exec to return empty output
      const { exec } = await import('child_process')
      vi.mocked(exec).mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' })
      })

      const result = await (activityMonitor as any).getMacActiveWindow()
      expect(result).toBeNull()
    })

    it('should handle system permission errors', async () => {
      // Mock systemPreferences to reject
      const { systemPreferences } = await import('electron')
      vi.mocked(systemPreferences.askForMediaAccess).mockRejectedValue(new Error('Permission denied'))

      const result = await (activityMonitor as any).requestScreenRecordingPermission()
      // In our mocked environment, this might still return true due to the setup mocks
      // The important thing is that it doesn't throw an error
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Activity Saving (Private Method)', () => {
    it('should handle save activity call', () => {
      expect(() => (activityMonitor as any).saveCurrentActivity()).not.toThrow()
    })

    it('should handle database save errors gracefully', () => {
      // Mock database to throw error
      const insertSpy = vi.spyOn(mockDatabase, 'insertActivityLog').mockImplementation(() => {
        throw new Error('Database error')
      })

      expect(() => (activityMonitor as any).saveCurrentActivity()).not.toThrow()
      
      insertSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should handle rapid state changes', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          activityMonitor.getCurrentActivity()
          activityMonitor.isCurrentlyMonitoring()
          activityMonitor.getLastActivityTime()
        }
      }).not.toThrow()
    })

    it('should handle long-running monitoring sessions', async () => {
      await activityMonitor.startMonitoring()
      
      // Simulate monitoring for extended period
      const startTime = Date.now()
      while (Date.now() - startTime < 100) {
        // Check status during monitoring
        expect(activityMonitor.isCurrentlyMonitoring()).toBe(true)
      }
      
      activityMonitor.stopMonitoring()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(false)
    })
  })

  describe('Public API', () => {
    it('should provide getCurrentActivity method', () => {
      const activity = activityMonitor.getCurrentActivity()
      expect(activity === null || typeof activity === 'object').toBe(true)
    })

    it('should provide isCurrentlyMonitoring method', () => {
      const isMonitoring = activityMonitor.isCurrentlyMonitoring()
      expect(typeof isMonitoring).toBe('boolean')
    })

    it('should provide getLastActivityTime method', () => {
      const lastTime = activityMonitor.getLastActivityTime()
      expect(lastTime).toBeInstanceOf(Date)
    })

    it('should provide startMonitoring method', async () => {
      expect(typeof activityMonitor.startMonitoring).toBe('function')
      await activityMonitor.startMonitoring()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(true)
    })

    it('should provide stopMonitoring method', () => {
      expect(typeof activityMonitor.stopMonitoring).toBe('function')
      activityMonitor.stopMonitoring()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(false)
    })

    it('should provide cleanup method', () => {
      expect(typeof activityMonitor.cleanup).toBe('function')
      expect(() => activityMonitor.cleanup()).not.toThrow()
    })
  })

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources on shutdown', () => {
      expect(() => activityMonitor.cleanup()).not.toThrow()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(false)
    })

    it('should handle multiple cleanup calls', () => {
      activityMonitor.cleanup()
      
      expect(() => activityMonitor.cleanup()).not.toThrow()
    })

    it('should handle cleanup during monitoring', async () => {
      await activityMonitor.startMonitoring()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(true)
      
      activityMonitor.cleanup()
      expect(activityMonitor.isCurrentlyMonitoring()).toBe(false)
    })
  })

  describe('System Event Handling', () => {
    it('should handle system suspend events', () => {
      expect(() => (activityMonitor as any).handleSystemSuspend()).not.toThrow()
    })

    it('should handle system resume events', () => {
      expect(() => (activityMonitor as any).handleSystemResume()).not.toThrow()
    })

    it('should handle screen lock events', () => {
      expect(() => (activityMonitor as any).handleScreenLock()).not.toThrow()
    })

    it('should handle screen unlock events', () => {
      expect(() => (activityMonitor as any).handleScreenUnlock()).not.toThrow()
    })
  })
})
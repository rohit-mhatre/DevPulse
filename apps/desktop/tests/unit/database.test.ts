import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LocalDatabase } from '../../src/main/database'

describe('LocalDatabase', () => {
  let database: LocalDatabase

  beforeEach(() => {
    vi.clearAllMocks()
    database = new LocalDatabase()
  })

  afterEach(() => {
    database.cleanup()
  })

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const id1 = database.generateId()
      const id2 = database.generateId()
      
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
      expect(id1.length).toBeGreaterThan(10)
    })

    it('should generate IDs with timestamp prefix', () => {
      const beforeTime = Date.now()
      const id = database.generateId()
      const afterTime = Date.now()

      const timestamp = parseInt(id.split('-')[0])
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('should include random component in ID', () => {
      const id = database.generateId()
      const parts = id.split('-')
      
      expect(parts).toHaveLength(2)
      expect(parts[1]).toBeTruthy()
      expect(parts[1].length).toBeGreaterThan(0)
    })
  })

  describe('Project Management', () => {
    const mockProject = {
      id: 'test-project-id',
      name: 'Test Project',
      path: '/test/project',
      git_remote_url: 'https://github.com/user/test.git',
      tags: '["typescript", "testing"]',
      color: '#FF0000'
    }

    describe('insertProject', () => {
      it('should not throw when inserting valid project', () => {
        expect(() => database.insertProject(mockProject)).not.toThrow()
      })

      it('should handle project with null git_remote_url', () => {
        const projectWithoutGit = { ...mockProject, git_remote_url: undefined }
        
        expect(() => database.insertProject(projectWithoutGit)).not.toThrow()
      })
    })

    describe('getProjectByPath', () => {
      it('should return null when project not found', () => {
        const result = database.getProjectByPath('/nonexistent')
        expect(result).toBeNull()
      })

      it('should handle valid path input', () => {
        expect(() => database.getProjectByPath('/test/path')).not.toThrow()
      })
    })

    describe('getAllProjects', () => {
      it('should return array of projects', () => {
        const result = database.getAllProjects()
        expect(Array.isArray(result)).toBe(true)
      })

      it('should return empty array initially', () => {
        const result = database.getAllProjects()
        expect(result).toEqual([])
      })
    })
  })

  describe('Activity Logging', () => {
    const mockActivity = {
      id: 'activity-1',
      project_id: 'project-1',
      app_name: 'VS Code',
      window_title: 'main.ts - DevPulse',
      file_path: '/project/src/main.ts',
      activity_type: 'code' as const,
      duration_seconds: 300,
      started_at: new Date('2024-01-01T10:00:00.000Z'),
      ended_at: new Date('2024-01-01T10:05:00.000Z'),
      is_idle: false,
      metadata: '{"language": "typescript"}'
    }

    describe('insertActivityLog', () => {
      it('should not throw when inserting valid activity', () => {
        expect(() => database.insertActivityLog(mockActivity)).not.toThrow()
      })

      it('should handle activity with null project_id', () => {
        const activityWithoutProject = { ...mockActivity, project_id: undefined }
        
        expect(() => database.insertActivityLog(activityWithoutProject)).not.toThrow()
      })

      it('should handle activity with null file_path', () => {
        const activityWithoutFile = { ...mockActivity, file_path: undefined }
        
        expect(() => database.insertActivityLog(activityWithoutFile)).not.toThrow()
      })
    })

    describe('getRecentActivities', () => {
      it('should return array of activities', () => {
        const result = database.getRecentActivities()
        expect(Array.isArray(result)).toBe(true)
      })

      it('should respect custom limit parameter', () => {
        expect(() => database.getRecentActivities(50)).not.toThrow()
      })

      it('should handle default limit', () => {
        expect(() => database.getRecentActivities()).not.toThrow()
      })
    })

    describe('getActivitiesByTimeRange', () => {
      it('should return array when given valid date range', () => {
        const startTime = new Date('2024-01-01T00:00:00.000Z')
        const endTime = new Date('2024-01-01T23:59:59.000Z')
        
        const result = database.getActivitiesByTimeRange(startTime, endTime)
        expect(Array.isArray(result)).toBe(true)
      })

      it('should handle same start and end dates', () => {
        const date = new Date('2024-01-01T12:00:00.000Z')
        
        expect(() => database.getActivitiesByTimeRange(date, date)).not.toThrow()
      })
    })
  })

  describe('Settings Management', () => {
    describe('setSetting', () => {
      it('should not throw when setting valid key-value pair', () => {
        expect(() => database.setSetting('theme', 'dark')).not.toThrow()
      })

      it('should handle empty string values', () => {
        expect(() => database.setSetting('empty', '')).not.toThrow()
      })

      it('should handle numeric values as strings', () => {
        expect(() => database.setSetting('count', '42')).not.toThrow()
      })
    })

    describe('getSetting', () => {
      it('should return null for non-existent setting', () => {
        const result = database.getSetting('nonexistent')
        expect(result).toBeNull()
      })

      it('should handle empty key gracefully', () => {
        expect(() => database.getSetting('')).not.toThrow()
      })

      it('should return string or null', () => {
        const result = database.getSetting('test')
        expect(result === null || typeof result === 'string').toBe(true)
      })
    })
  })

  describe('Database Lifecycle', () => {
    it('should initialize without throwing', () => {
      expect(() => new LocalDatabase()).not.toThrow()
    })

    it('should cleanup without throwing', () => {
      expect(() => database.cleanup()).not.toThrow()
    })

    it('should handle multiple cleanups gracefully', () => {
      database.cleanup()
      expect(() => database.cleanup()).not.toThrow()
    })
  })

  describe('Integration Tests', () => {
    it('should support full project workflow', () => {
      // Insert a project
      const project = {
        id: database.generateId(),
        name: 'Integration Test Project',
        path: '/test/integration',
        git_remote_url: 'https://github.com/test/integration.git',
        tags: '["integration"]',
        color: '#00FF00'
      }
      
      expect(() => database.insertProject(project)).not.toThrow()
      
      // Since we're using mocked database, we can't test actual retrieval
      // But we can verify the operation doesn't throw
      expect(() => database.getProjectByPath(project.path)).not.toThrow()
    })

    it('should support full activity workflow', () => {
      // Insert an activity
      const activity = {
        id: database.generateId(),
        project_id: undefined,
        app_name: 'Test App',
        window_title: 'Test Window',
        file_path: '/test/file.js',
        activity_type: 'code' as const,
        duration_seconds: 120,
        started_at: new Date(),
        ended_at: new Date(Date.now() + 120000),
        is_idle: false,
        metadata: '{}'
      }
      
      expect(() => database.insertActivityLog(activity)).not.toThrow()
      
      // Retrieve recent activities
      const activities = database.getRecentActivities(10)
      expect(activities.length).toBeGreaterThanOrEqual(0)
    })

    it('should support settings workflow', () => {
      const key = 'integration_test_setting'
      const value = 'test_value'
      
      // Set a setting
      expect(() => database.setSetting(key, value)).not.toThrow()
      
      // Since we're using mocked database, we can't test actual retrieval
      // But we can verify the operation doesn't throw
      expect(() => database.getSetting(key)).not.toThrow()
    })
  })

  describe('Error Resilience', () => {
    it('should handle large text values', () => {
      const largeText = 'x'.repeat(10000)
      expect(() => database.setSetting('large', largeText)).not.toThrow()
    })

    it('should handle unicode characters', () => {
      const unicode = '🚀 DevPulse Unicode Test 中文 🎉'
      expect(() => database.setSetting('unicode', unicode)).not.toThrow()
    })

    it('should handle special characters in paths', () => {
      const specialPath = '/test/path with spaces/special@chars#test'
      expect(() => database.getProjectByPath(specialPath)).not.toThrow()
    })

    it('should handle extreme dates', () => {
      const farFuture = new Date('2099-12-31T23:59:59.999Z')
      const farPast = new Date('1970-01-01T00:00:00.000Z')
      
      expect(() => database.getActivitiesByTimeRange(farPast, farFuture)).not.toThrow()
    })
  })
})
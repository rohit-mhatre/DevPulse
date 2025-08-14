import { describe, it, expect } from 'vitest'

describe('Simple test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle TypeScript types', () => {
    const message: string = 'Hello World'
    expect(message).toBe('Hello World')
  })

  it('should handle async/await', async () => {
    const result = await Promise.resolve('success')
    expect(result).toBe('success')
  })
})
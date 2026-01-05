import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toBe('px-4 py-2')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base active')
  })

  it('handles falsy values', () => {
    const result = cn('base', false, null, undefined, 'valid')
    expect(result).toBe('base valid')
  })

  it('merges conflicting Tailwind classes', () => {
    // twMerge should resolve conflicts by keeping the last class
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })

  it('handles arrays of classes', () => {
    const result = cn(['px-4', 'py-2'])
    expect(result).toBe('px-4 py-2')
  })

  it('handles objects with conditional classes', () => {
    const result = cn({
      'bg-blue-500': true,
      'text-white': true,
      'hidden': false,
    })
    expect(result).toBe('bg-blue-500 text-white')
  })
})

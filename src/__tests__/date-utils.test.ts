import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getEndOfDay,
  getStartOfDay,
  getEndOfMonth,
  getWeekendStart,
  getWeekendEnd,
  isWeekend,
  getFilterLabel,
  getEmptyStateMessage,
} from '@/lib/date-utils'

describe('date-utils', () => {
  describe('getStartOfDay', () => {
    it('returns start of day with time set to 00:00:00.000', () => {
      const date = new Date('2026-01-15T14:30:00')
      const result = getStartOfDay(date)

      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
    })

    it('preserves the same date', () => {
      const date = new Date('2026-01-15T14:30:00')
      const result = getStartOfDay(date)

      expect(result.getDate()).toBe(15)
      expect(result.getMonth()).toBe(0) // January
      expect(result.getFullYear()).toBe(2026)
    })
  })

  describe('getEndOfDay', () => {
    it('returns end of day with time set to 23:59:59.999', () => {
      const date = new Date('2026-01-15T10:00:00')
      const result = getEndOfDay(date)

      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
      expect(result.getSeconds()).toBe(59)
      expect(result.getMilliseconds()).toBe(999)
    })

    it('preserves the same date', () => {
      const date = new Date('2026-01-15T10:00:00')
      const result = getEndOfDay(date)

      expect(result.getDate()).toBe(15)
      expect(result.getMonth()).toBe(0)
      expect(result.getFullYear()).toBe(2026)
    })
  })

  describe('getEndOfMonth', () => {
    it('returns the last day of the month', () => {
      const date = new Date('2026-01-15T10:00:00')
      const result = getEndOfMonth(date)

      expect(result.getDate()).toBe(31) // January has 31 days
      expect(result.getMonth()).toBe(0)
      expect(result.getFullYear()).toBe(2026)
    })

    it('handles February correctly', () => {
      const date = new Date('2026-02-10T10:00:00')
      const result = getEndOfMonth(date)

      expect(result.getDate()).toBe(28) // 2026 is not a leap year
    })

    it('handles February in a leap year', () => {
      const date = new Date('2024-02-10T10:00:00')
      const result = getEndOfMonth(date)

      expect(result.getDate()).toBe(29) // 2024 is a leap year
    })
  })

  describe('isWeekend', () => {
    it('returns true for Saturday', () => {
      const saturday = new Date('2026-01-03T12:00:00') // Saturday
      expect(isWeekend(saturday)).toBe(true)
    })

    it('returns true for Sunday', () => {
      const sunday = new Date('2026-01-04T12:00:00') // Sunday
      expect(isWeekend(sunday)).toBe(true)
    })

    it('returns true for Friday after 5pm', () => {
      const fridayEvening = new Date('2026-01-02T18:00:00') // Friday 6pm
      expect(isWeekend(fridayEvening)).toBe(true)
    })

    it('returns false for Friday before 5pm', () => {
      const fridayAfternoon = new Date('2026-01-02T14:00:00') // Friday 2pm
      expect(isWeekend(fridayAfternoon)).toBe(false)
    })

    it('returns false for weekdays', () => {
      const wednesday = new Date('2026-01-07T12:00:00') // Wednesday
      expect(isWeekend(wednesday)).toBe(false)
    })
  })

  describe('getWeekendStart', () => {
    it('returns start of today if already Saturday', () => {
      const saturday = new Date('2026-01-03T14:00:00')
      const result = getWeekendStart(saturday)

      expect(result.getDay()).toBe(6) // Saturday
      expect(result.getHours()).toBe(0)
    })

    it('returns start of today if already Sunday', () => {
      const sunday = new Date('2026-01-04T14:00:00')
      const result = getWeekendStart(sunday)

      expect(result.getDay()).toBe(0) // Sunday
      expect(result.getHours()).toBe(0)
    })

    it('returns Friday 5pm for weekdays', () => {
      const wednesday = new Date('2026-01-07T10:00:00') // Wednesday
      const result = getWeekendStart(wednesday)

      expect(result.getDay()).toBe(5) // Friday
      expect(result.getHours()).toBe(17)
    })
  })

  describe('getWeekendEnd', () => {
    it('returns end of Sunday', () => {
      const saturday = new Date('2026-01-03T12:00:00')
      const result = getWeekendEnd(saturday)

      expect(result.getDay()).toBe(0) // Sunday
      expect(result.getHours()).toBe(23)
      expect(result.getMinutes()).toBe(59)
      expect(result.getSeconds()).toBe(59)
    })

    it('returns end of same day if already Sunday', () => {
      const sunday = new Date('2026-01-04T12:00:00')
      const result = getWeekendEnd(sunday)

      expect(result.getDate()).toBe(4) // Same Sunday
      expect(result.getHours()).toBe(23)
    })
  })

  describe('getFilterLabel', () => {
    it('returns correct labels', () => {
      expect(getFilterLabel('tonight')).toBe('Tonight')
      expect(getFilterLabel('weekend')).toBe('This Weekend')
      expect(getFilterLabel('month')).toBe('This Month')
      expect(getFilterLabel('all')).toBe('All Events')
    })
  })

  describe('getEmptyStateMessage', () => {
    it('returns correct messages for tonight', () => {
      const result = getEmptyStateMessage('tonight')
      expect(result.title).toBe('No events tonight')
      expect(result.subtitle).toContain('weekend')
    })

    it('returns correct messages for weekend', () => {
      const result = getEmptyStateMessage('weekend')
      expect(result.title).toBe('No events this weekend')
    })

    it('returns correct messages for month', () => {
      const result = getEmptyStateMessage('month')
      expect(result.title).toBe('No events this month')
    })

    it('returns correct messages for all', () => {
      const result = getEmptyStateMessage('all')
      expect(result.title).toBe('No events found')
    })
  })
})

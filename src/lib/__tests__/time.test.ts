import { describe, expect, it } from 'vitest'
import { formatLockDate, formatLockTime } from '../time'

describe('formatLockDate', () => {
  it('输出英文「Weekday, Month D」', () => {
    // 2026-10-06 是 Tuesday
    expect(formatLockDate(new Date(2026, 9, 6))).toBe('Tuesday, October 6')
    expect(formatLockDate(new Date(2026, 4, 20))).toBe('Wednesday, May 20')
  })
})

describe('formatLockTime', () => {
  it('输出 24 小时制 HH:MM', () => {
    expect(formatLockTime(new Date(2026, 9, 6, 19, 16))).toBe('19:16')
    expect(formatLockTime(new Date(2026, 9, 6, 9, 5))).toBe('09:05')
  })
})

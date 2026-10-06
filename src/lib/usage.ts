// src/lib/usage.ts
import type { UsageRecord } from './db'

export const USAGE_LIMIT = 15
export const REMINDER_INTERVAL_DAYS = 15

const DAY_MS = 24 * 60 * 60 * 1000

export function monthKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** 超限（>15）且距上次提醒 >= 15 天（或从未提醒）时返回 true */
export function shouldRemind(usage: UsageRecord, now: Date): boolean {
  if (usage.month !== monthKey(now)) return false
  if (usage.count <= USAGE_LIMIT) return false
  if (usage.lastReminder === 0) return true
  return now.getTime() - usage.lastReminder >= REMINDER_INTERVAL_DAYS * DAY_MS
}

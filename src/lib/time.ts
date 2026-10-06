// src/lib/time.ts
/** 锁屏日期：「Wednesday, May 20」 */
export function formatLockDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/** 锁屏时间：「19:16」24 小时制 */
export function formatLockTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

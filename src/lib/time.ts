// src/lib/time.ts
/** 锁屏日期：「Mon May 20」（星期缩写 + 月缩写 + 日；与大时钟「13:14」分两行展示） */
export function formatLockDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("month")} ${get("day")}`;
}

/** 锁屏时间：「19:16」24 小时制 */
export function formatLockTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

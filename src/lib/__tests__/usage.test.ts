import { describe, expect, it } from "vitest";
import {
  monthKey,
  shouldRemind,
  USAGE_LIMIT,
  REMINDER_INTERVAL_DAYS,
} from "../usage";

const DAY = 24 * 60 * 60 * 1000;

describe("monthKey", () => {
  it("格式为 YYYY-MM，月日补零", () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe("2026-01");
    expect(monthKey(new Date(2026, 11, 31))).toBe("2026-12");
  });
});

describe("shouldRemind", () => {
  const usage = (count: number, lastReminder: number) => ({
    id: "usage" as const,
    month: "2026-10",
    count,
    lastReminder,
  });

  it("未超过限制不提醒", () => {
    expect(shouldRemind(usage(15, 0), new Date(2026, 9, 20))).toBe(false);
  });

  it("超过限制但 15 天内提醒过，不提醒", () => {
    const now = new Date(2026, 9, 20);
    expect(shouldRemind(usage(16, now.getTime() - 5 * DAY), now)).toBe(false);
  });

  it("超过限制且距上次提醒满 15 天，提醒", () => {
    const now = new Date(2026, 9, 20);
    expect(shouldRemind(usage(20, now.getTime() - 15 * DAY), now)).toBe(true);
  });

  it("从未提醒过（lastReminder=0）且超限，提醒", () => {
    expect(shouldRemind(usage(16, 0), new Date(2026, 9, 20))).toBe(true);
  });

  it("常量符合 spec：15 张 / 15 天", () => {
    expect(USAGE_LIMIT).toBe(15);
    expect(REMINDER_INTERVAL_DAYS).toBe(15);
  });
});

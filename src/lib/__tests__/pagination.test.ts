import { describe, expect, it } from "vitest";
import { paginate } from "@/lib/pagination";

describe("paginate", () => {
  it("正常切片: 10 项 pageSize 6 → 第 1 页 6 项, pageCount 2; 第 2 页 4 项", () => {
    const items = Array.from({ length: 10 }, (_, i) => i + 1);
    const p1 = paginate(items, 1, 6);
    expect(p1.pageItems).toEqual([1, 2, 3, 4, 5, 6]);
    expect(p1.pageCount).toBe(2);
    expect(p1.safePage).toBe(1);
    const p2 = paginate(items, 2, 6);
    expect(p2.pageItems).toEqual([7, 8, 9, 10]);
    expect(p2.pageCount).toBe(2);
    expect(p2.safePage).toBe(2);
  });

  it("超出范围的页码收敛到最后一页: page 99 → safePage 2, 返回末 4 项", () => {
    const items = Array.from({ length: 10 }, (_, i) => i + 1);
    const result = paginate(items, 99, 6);
    expect(result.safePage).toBe(2);
    expect(result.pageItems).toEqual([7, 8, 9, 10]);
  });

  it("小于 1 的页码收敛到第 1 页: page 0 → safePage 1", () => {
    const items = Array.from({ length: 10 }, (_, i) => i + 1);
    const result = paginate(items, 0, 6);
    expect(result.safePage).toBe(1);
    expect(result.pageItems).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("空列表: pageCount 为 1, pageItems 为空, 任意页 safePage 均为 1", () => {
    expect(paginate([], 1, 6)).toEqual({
      pageItems: [],
      pageCount: 1,
      safePage: 1,
    });
    expect(paginate([], 5, 6).safePage).toBe(1);
    expect(paginate([], 0, 6).safePage).toBe(1);
  });

  it("整除边界: 12 项 pageSize 6 → 第 2 页 6 项, pageCount 2; 第 3 页收敛到 2", () => {
    const items = Array.from({ length: 12 }, (_, i) => i + 1);
    const p2 = paginate(items, 2, 6);
    expect(p2.pageItems).toEqual([7, 8, 9, 10, 11, 12]);
    expect(p2.pageCount).toBe(2);
    const p3 = paginate(items, 3, 6);
    expect(p3.safePage).toBe(2);
    expect(p3.pageItems).toEqual([7, 8, 9, 10, 11, 12]);
  });

  it("safePage 始终落在 [1, pageCount] 区间内", () => {
    const items = Array.from({ length: 10 }, (_, i) => i + 1);
    for (const page of [-10, 0, 1, 2, 3, 50, 99]) {
      const { safePage, pageCount } = paginate(items, page, 6);
      expect(safePage).toBeGreaterThanOrEqual(1);
      expect(safePage).toBeLessThanOrEqual(pageCount);
    }
  });
});

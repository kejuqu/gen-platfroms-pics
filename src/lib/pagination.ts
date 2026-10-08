export interface PageResult<T> {
  pageItems: T[]
  pageCount: number
  safePage: number // 1-based, clamped
}

export function paginate<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  return {
    pageItems: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    pageCount,
    safePage,
  }
}

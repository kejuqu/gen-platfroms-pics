import { openDB, type IDBPDatabase } from 'idb'
import { monthKey } from './usage'

export interface StoredImage {
  id: string
  name: string
  blob: Blob
  createdAt: number
}

export interface UsageRecord {
  id: 'usage'
  month: string
  count: number
  lastReminder: number
}

const DB_NAME = 'mockup-studio'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('images', { keyPath: 'id' })
        db.createObjectStore('usage', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function addImage(name: string, blob: Blob): Promise<StoredImage> {
  const image: StoredImage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    blob,
    createdAt: Date.now(),
  }
  const db = await getDB()
  await db.put('images', image)
  return image
}

export async function getAllImages(): Promise<StoredImage[]> {
  const db = await getDB()
  const all = (await db.getAll('images')) as StoredImage[]
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('images', id)
}

export async function getUsage(): Promise<UsageRecord> {
  const db = await getDB()
  const record = (await db.get('usage', 'usage')) as UsageRecord | undefined
  const currentMonth = monthKey(new Date())
  if (!record) return { id: 'usage', month: currentMonth, count: 0, lastReminder: 0 }
  // 跨月：计数归零，保留 lastReminder；不写库（保持读取无副作用）
  if (record.month !== currentMonth) {
    return { id: 'usage', month: currentMonth, count: 0, lastReminder: record.lastReminder }
  }
  return record
}

export async function recordGeneration(now: Date = new Date()): Promise<UsageRecord> {
  const db = await getDB()
  const currentMonth = monthKey(now)
  // 单个 readwrite 事务内完成读+写，避免并行调用丢失递增
  const tx = db.transaction('usage', 'readwrite')
  const store = tx.store
  const stored = (await store.get('usage')) as UsageRecord | undefined
  const record: UsageRecord = {
    id: 'usage',
    month: currentMonth,
    count: stored && stored.month === currentMonth ? stored.count + 1 : 1,
    lastReminder: stored ? stored.lastReminder : 0,
  }
  await store.put(record)
  await tx.done
  return record
}

export async function markReminderShown(now: Date = new Date()): Promise<void> {
  const db = await getDB()
  const current = await getUsage()
  await db.put('usage', { ...current, lastReminder: now.getTime() })
}

/** 仅测试用：关闭连接并删除数据库 */
export async function resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

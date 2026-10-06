import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { addImage, deleteImage, getAllImages, getUsage, markReminderShown, recordGeneration, resetDbForTests } from '../db'

beforeEach(async () => { await resetDbForTests() })

describe('images 表', () => {
  it('新增并可读取全部图片，按 createdAt 倒序', async () => {
    const a = await addImage('a.png', new Blob(['x'], { type: 'image/png' }))
    await new Promise(r => setTimeout(r, 5))
    const b = await addImage('b.png', new Blob(['y'], { type: 'image/png' }))
    const all = await getAllImages()
    expect(all.map(i => i.id)).toEqual([b.id, a.id])
    expect(all[0].name).toBe('b.png')
  })

  it('可删除图片', async () => {
    const a = await addImage('a.png', new Blob(['x']))
    await deleteImage(a.id)
    expect(await getAllImages()).toEqual([])
  })
})

describe('usage 表', () => {
  it('初始 usage 为本月 0 次', async () => {
    const u = await getUsage()
    expect(u.count).toBe(0)
    expect(u.month).toMatch(/^\d{4}-\d{2}$/)
  })

  it('recordGeneration 递增计数', async () => {
    await recordGeneration()
    const u = await recordGeneration()
    expect(u.count).toBe(2)
  })

  it('markReminderShown 记录时间戳', async () => {
    await markReminderShown()
    const u = await getUsage()
    expect(u.lastReminder).toBeGreaterThan(0)
  })
})

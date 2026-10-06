import { describe, expect, it } from 'vitest'
import { detectLocale, translate } from '@/lib/i18n'
import { zh } from '@/lib/i18n/zh'
import { en } from '@/lib/i18n/en'

function keyList(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    keyList(v, prefix ? `${prefix}.${k}` : k),
  )
}

describe('dictionaries', () => {
  it('中英文字典 key 集合完全一致', () => {
    expect(keyList(en).sort()).toEqual(keyList(zh).sort())
  })
})

describe('detectLocale', () => {
  it('zh* → zh，其他 → en，缺省 → zh', () => {
    expect(detectLocale('zh-CN')).toBe('zh')
    expect(detectLocale('zh-TW')).toBe('zh')
    expect(detectLocale('en-US')).toBe('en')
    expect(detectLocale('ja-JP')).toBe('en')
    expect(detectLocale(undefined)).toBe('zh')
  })
})

describe('translate', () => {
  it('点路径取值 + {var} 插值', () => {
    expect(translate(zh, zh, 'header.usage', { count: 3, limit: 15 })).toBe('本月已生成 3 / 15 张')
  })
  it('en 字典取值', () => {
    expect(translate(en, zh, 'card.original')).toBe('Download original')
  })
  it('缺 key 回退中文，再缺返回路径本身', () => {
    const partial = { ...en, card: { ...en.card, original: undefined } } as unknown as typeof en
    expect(translate(partial, zh, 'card.original')).toBe(zh.card.original)
    expect(translate(en, zh, 'no.such.key')).toBe('no.such.key')
  })
})

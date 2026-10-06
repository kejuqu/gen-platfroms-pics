import { zh, type Dictionary } from './zh'
import { en } from './en'

export type { Dictionary }
export type Locale = 'zh' | 'en'

export const dictionaries: Record<Locale, Dictionary> = { zh, en }

/** localStorage 键：记住用户语言选择 */
export const STORAGE_KEY = 'mockup-locale'

/** 浏览器语言 → Locale；zh* → zh，其他 → en，缺省 → zh */
export function detectLocale(lang?: string): Locale {
  if (!lang) return 'zh'
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** 卡片时间戳等本地格式化用的 BCP-47 tag */
export function dateLocale(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US'
}

type Vars = Record<string, string | number>

function walk(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, dict)
}

/**
 * 点路径取字典值；缺 key 回退 fallback 字典，再缺返回路径本身。
 * 值内 {name} 占位符用 vars 替换。
 */
export function translate(
  dict: Dictionary,
  fallback: Dictionary,
  path: string,
  vars?: Vars,
): string {
  let value = walk(dict, path) as string | undefined
  if (typeof value !== 'string') value = walk(fallback, path) as string | undefined
  if (typeof value !== 'string') return path
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replaceAll(`{${k}}`, String(v))
    }
  }
  return value
}

/** 供非组件环境使用；组件内请用 useI18n */
export function getDictionary(locale: Locale): Dictionary {
  return locale === 'zh' ? zh : en
}

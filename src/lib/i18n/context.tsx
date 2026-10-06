'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  dictionaries,
  detectLocale,
  translate,
  STORAGE_KEY,
  type Locale,
} from './index'
import { zh } from './zh'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  // 首帧固定 'zh'，与服务端预渲染 HTML 一致，避免 hydration mismatch；
  // 挂载后再读取本地偏好，EN 用户会有一帧中文再切换。
  const [locale, setLocaleState] = useState<Locale>('zh')

  useEffect(() => {
    let preferred: Locale = 'zh'
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'zh' || saved === 'en') preferred = saved
      else preferred = detectLocale(window.navigator.language)
    } catch {
      /* localStorage 不可用时静默回退 */
    }
    setLocaleState((prev) => (prev === preferred ? prev : preferred))
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* 忽略持久化失败 */
    }
  }, [])

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      translate(dictionaries[locale], zh, path, vars),
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

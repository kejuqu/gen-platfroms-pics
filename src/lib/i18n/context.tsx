'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
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
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'zh'
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'zh' || saved === 'en') return saved
    } catch {
      /* localStorage 不可用时静默回退 */
    }
    return detectLocale(window.navigator.language)
  })

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

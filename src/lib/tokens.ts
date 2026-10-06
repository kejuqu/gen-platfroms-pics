// src/lib/tokens.ts
export type DeviceKind =
  | 'iphone'
  | 'ipad-landscape'
  | 'ipad-portrait'
  | 'macbook'
  | 'imac'

export interface DeviceMeta {
  kind: DeviceKind
  label: string
  /** 文件名 tag，如 pure-iphone-xxx.png */
  tag: string
}

export const SELLER_DEVICES: DeviceMeta[] = [
  { kind: 'iphone', label: 'iPhone', tag: 'iphone' },
  { kind: 'ipad-landscape', label: 'iPad 横屏', tag: 'ipad-landscape' },
  { kind: 'ipad-portrait', label: 'iPad 竖屏', tag: 'ipad-portrait' },
  { kind: 'macbook', label: 'MacBook', tag: 'macbook' },
  { kind: 'imac', label: 'iMac', tag: 'imac' },
]

/** 无时间交付版（spec：固定三类） */
export const PURE_DEVICES: DeviceMeta[] = [
  { kind: 'iphone', label: 'iPhone', tag: 'iphone' },
  { kind: 'ipad-landscape', label: 'iPad 横屏', tag: 'ipad-landscape' },
  { kind: 'macbook', label: 'MacBook', tag: 'macbook' },
]

export type Prefix = 'seller' | 'pure'

/** seller-<tag>-<basename>.png */
export function deviceFileName(prefix: Prefix, tag: string, originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '')
  return `${prefix}-${tag}-${base}.png`
}

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
  /** 文件名 tag，如 seller-iphone-xxx.png */
  tag: string
}

export const SELLER_DEVICES: DeviceMeta[] = [
  { kind: 'iphone', label: 'iPhone', tag: 'iphone' },
  { kind: 'ipad-landscape', label: 'iPad 横屏', tag: 'ipad-landscape' },
  { kind: 'ipad-portrait', label: 'iPad 竖屏', tag: 'ipad-portrait' },
  { kind: 'macbook', label: 'MacBook', tag: 'macbook' },
  { kind: 'imac', label: 'iMac', tag: 'imac' },
]

/** seller-<tag>-<basename>.png */
export function deviceFileName(tag: string, originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '')
  return `seller-${tag}-${base}.png`
}

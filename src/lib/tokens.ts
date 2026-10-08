// src/lib/tokens.ts
export type DeviceKind = 'iphone' | 'ipad-landscape' | 'macbook'

export interface DeviceMeta {
  kind: DeviceKind
  label: string
  /** 文件名 tag，如 seller-iphone-xxx.png */
  tag: string
}

/** 卖家预览设备（Three.js 渲染）：手机 / iPad 横屏 / 电脑 */
export const SELLER_DEVICES: DeviceMeta[] = [
  { kind: 'iphone', label: 'iPhone', tag: 'iphone' },
  { kind: 'ipad-landscape', label: 'iPad 横屏', tag: 'ipad-landscape' },
  { kind: 'macbook', label: '电脑', tag: 'computer' },
]

/** seller-<tag>-<basename>.png */
export function deviceFileName(tag: string, originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '')
  return `seller-${tag}-${base}.png`
}

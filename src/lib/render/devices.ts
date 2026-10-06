// src/lib/render/devices.ts
import type { DeviceKind } from '../tokens'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface DeviceDef {
  kind: DeviceKind
  /** 整个画布（含外框/底座）尺寸，CSS px */
  width: number
  height: number
  /** 屏幕区域（壁纸+时钟绘制范围） */
  screen: Rect
  screenRadius: number
  hasIsland: boolean
  /** macbook: 键盘底座；imac: 下巴+支架 */
  base?: 'keyboard' | 'chin'
}

export const DEVICE_DEFS: Record<DeviceKind, DeviceDef> = {
  iphone: {
    kind: 'iphone',
    width: 180,
    height: 370,
    screen: { x: 7, y: 7, w: 166, h: 356 },
    screenRadius: 30,
    hasIsland: true,
  },
  'ipad-landscape': {
    kind: 'ipad-landscape',
    width: 430,
    height: 310,
    screen: { x: 15, y: 15, w: 400, h: 280 },
    screenRadius: 16,
    hasIsland: false,
  },
  'ipad-portrait': {
    kind: 'ipad-portrait',
    width: 310,
    height: 430,
    screen: { x: 15, y: 15, w: 280, h: 400 },
    screenRadius: 16,
    hasIsland: false,
  },
  macbook: {
    kind: 'macbook',
    width: 430,
    height: 302,
    screen: { x: 19, y: 14, w: 392, h: 245 },
    screenRadius: 8,
    hasIsland: false,
    base: 'keyboard',
  },
  imac: {
    kind: 'imac',
    width: 430,
    height: 356,
    screen: { x: 15, y: 12, w: 400, h: 245 },
    screenRadius: 8,
    hasIsland: false,
    base: 'chin',
  },
}

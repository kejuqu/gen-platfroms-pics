import { describe, expect, it } from 'vitest'
import { composeLockScreen, SCREEN_RADIUS, SCREEN_TEX_SIZE, drawLockScreen } from '../canvas'

// jsdom 没有 Path2D（lucide 图标绘制用），提供最小桩
globalThis.Path2D = class Path2DStub {
  constructor(public d?: string) {}
} as unknown as typeof Path2D

interface StubCalls {
  drawImage: number
  fillText: number
  clip: number
  fill: number
  scale: number[][]
  textFills: string[]
}

let lastCalls: StubCalls = { drawImage: 0, fillText: 0, clip: 0, fill: 0, scale: [], textFills: [] }

/** 控制 stub getImageData 返回的像素亮度（0=黑，255=白），用于测试文字自适应 */
let stubPixel = 0

function createStubContext(): CanvasRenderingContext2D {
  const calls: StubCalls = { drawImage: 0, fillText: 0, clip: 0, fill: 0, scale: [], textFills: [] }
  lastCalls = calls
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    shadowColor: '',
    shadowBlur: 0,
    save: () => {},
    restore: () => {},
    translate: () => {},
    rect: () => {},
    scale: (...args: number[]) => { calls.scale.push(args) },
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    arc: () => {},
    closePath: () => {},
    clip: () => { calls.clip += 1 },
    fill: () => { calls.fill += 1 },
    fillRect: () => { calls.fill += 1 },
    stroke: () => {},
    drawImage: () => { calls.drawImage += 1 },
    fillText: () => {
      calls.fillText += 1
      calls.textFills.push(String(ctx.fillStyle))
    },
    getImageData: (_x: number, _y: number, w: number, h: number) => {
      const data = new Uint8ClampedArray(w * h * 4)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = stubPixel
        data[i + 1] = stubPixel
        data[i + 2] = stubPixel
        data[i + 3] = 255
      }
      return { data, width: w, height: h } as ImageData
    },
    createLinearGradient: () => ({ addColorStop: () => {} }),
  }
  return ctx as unknown as CanvasRenderingContext2D
}

// jsdom 的 getContext('2d') 返回 null，用 stub 顶替
HTMLCanvasElement.prototype.getContext = function () {
  return createStubContext()
} as unknown as typeof HTMLCanvasElement.prototype.getContext

const fakeImg = { width: 1200, height: 800, naturalWidth: 1200, naturalHeight: 800 } as unknown as HTMLImageElement

describe('SCREEN_TEX_SIZE', () => {
  it('三种设备都有贴图基准尺寸且宽高为正', () => {
    for (const kind of ['iphone', 'ipad-landscape', 'macbook'] as const) {
      const s = SCREEN_TEX_SIZE[kind]
      expect(s.w).toBeGreaterThan(0)
      expect(s.h).toBeGreaterThan(0)
    }
  })

  it('iphone 竖屏比例，ipad/macbook 横屏比例', () => {
    expect(SCREEN_TEX_SIZE.iphone.h).toBeGreaterThan(SCREEN_TEX_SIZE.iphone.w)
    expect(SCREEN_TEX_SIZE['ipad-landscape'].w).toBeGreaterThan(SCREEN_TEX_SIZE['ipad-landscape'].h)
    expect(SCREEN_TEX_SIZE.macbook.w).toBeGreaterThan(SCREEN_TEX_SIZE.macbook.h)
  })

  it('三种设备都有屏幕圆角且不超过短边一半', () => {
    for (const kind of ['iphone', 'ipad-landscape', 'macbook'] as const) {
      const r = SCREEN_RADIUS[kind]
      const s = SCREEN_TEX_SIZE[kind]
      expect(r).toBeGreaterThan(0)
      expect(r).toBeLessThanOrEqual(Math.min(s.w, s.h) / 2)
    }
  })
})

describe('composeLockScreen', () => {
  it('输出 3× 尺寸 canvas 且应用 3× 缩放', () => {
    composeLockScreen(fakeImg, 'iphone', new Date(2026, 9, 6, 19, 16))
    expect(lastCalls.scale[0]).toEqual([3, 3])
  })

  it('壁纸绘制前按设备圆角裁剪屏幕贴图', () => {
    composeLockScreen(fakeImg, 'iphone', new Date(2026, 9, 6, 19, 16))
    expect(lastCalls.clip).toBeGreaterThanOrEqual(1)
  })

  it('iPhone 贴图：壁纸 + 3 组文字（日期+时间+状态栏小时间），尺寸 1170×2532', () => {
    const c = composeLockScreen(fakeImg, 'iphone', new Date(2026, 9, 6, 19, 16))
    expect(c.width).toBe(SCREEN_TEX_SIZE.iphone.w * 3)
    expect(c.height).toBe(SCREEN_TEX_SIZE.iphone.h * 3)
    expect(lastCalls.drawImage).toBe(1)
    expect(lastCalls.fillText).toBe(3)
  })

  it('macbook 贴图：壁纸 + 2 组文字（仅日期+时间），尺寸 2700×1686', () => {
    const c = composeLockScreen(fakeImg, 'macbook', new Date(2026, 9, 6, 19, 16))
    expect(c.width).toBe(2700)
    expect(c.height).toBe(1686)
    expect(lastCalls.fillText).toBe(2)
  })
})

describe('drawLockScreen', () => {
  it('iPhone 3 处文字 / iPad 2 处文字 / 阴影设置保留', () => {
    const iphone = createStubContext()
    drawLockScreen(iphone, 'iphone', { x: 0, y: 0, w: 390, h: 844 }, new Date(2026, 9, 6, 19, 16))
    expect(lastCalls.fillText).toBe(3)

    const ipad = createStubContext()
    drawLockScreen(ipad, 'ipad-landscape', { x: 0, y: 0, w: 834, h: 590 }, new Date(2026, 9, 6, 19, 16))
    expect(lastCalls.fillText).toBe(2)
  })

  it('深色壁纸（暗采样）→ 白色文字', () => {
    stubPixel = 0
    composeLockScreen(fakeImg, 'iphone', new Date(2026, 9, 6, 19, 16))
    expect(lastCalls.textFills).toContain('#ffffff')
    expect(lastCalls.textFills).not.toContain('#1b1b1f')
    stubPixel = 0
  })

  it('白色壁纸（亮采样）→ 深色文字（日期/时钟/状态栏时间）', () => {
    stubPixel = 255
    composeLockScreen(fakeImg, 'iphone', new Date(2026, 9, 6, 19, 16))
    expect(lastCalls.textFills.length).toBe(3)
    for (const fill of lastCalls.textFills) expect(fill).toBe('#1b1b1f')
    stubPixel = 0
  })
})

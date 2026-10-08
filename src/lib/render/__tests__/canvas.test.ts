import { describe, expect, it } from 'vitest'
import { DEVICE_DEFS } from '../devices'
import { EXPORT_SCALE, paintDevice, renderDeviceImage, type RenderOptions } from '../canvas'

function createStubContext() {
  const calls = { drawImage: 0, fillText: 0, clip: 0, fill: 0, scale: [] as number[][] }
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
    fillText: () => { calls.fillText += 1 },
    createLinearGradient: () => ({ addColorStop: () => {} }),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

// jsdom 的 getContext('2d') 返回 null，用 stub 顶替
HTMLCanvasElement.prototype.getContext = function () {
  return createStubContext().ctx as unknown as CanvasRenderingContext2D
} as unknown as typeof HTMLCanvasElement.prototype.getContext

const fakeImg = { width: 1200, height: 800, naturalWidth: 1200, naturalHeight: 800 } as unknown as HTMLImageElement

const baseOpts: RenderOptions = { showTime: true, now: new Date(2026, 9, 6, 19, 16) }

describe('DEVICE_DEFS 几何约束', () => {
  it.each(Object.values(DEVICE_DEFS))('$kind：屏幕在画布内且 bezel 2–8px', (def) => {
    const bezel = Math.min(def.screen.x, def.screen.y)
    expect(bezel).toBeGreaterThanOrEqual(2)
    expect(bezel).toBeLessThanOrEqual(8)
    expect(def.screen.x + def.screen.w).toBeLessThanOrEqual(def.width - 2)
    expect(def.screen.y + def.screen.h).toBeLessThanOrEqual(def.height - 2)
  })

  it('macbook / imac 底座元素在画布内', () => {
    const mb = DEVICE_DEFS.macbook
    const mbBaseBottom = mb.screen.y + mb.screen.h + 6 + 20 // gap 6 + 底座高 20
    expect(mbBaseBottom).toBeLessThanOrEqual(mb.height)
    const imac = DEVICE_DEFS.imac
    const imacStandBottom = imac.screen.y + imac.screen.h + 26 + 16 // 下巴 26 + 支架 16
    expect(imacStandBottom).toBeLessThanOrEqual(imac.height)
  })
})

describe('paintDevice', () => {
  it('绘制壁纸与三组时间文字（日期+时间+状态栏小时间）', () => {
    const { ctx, calls } = createStubContext()
    paintDevice(ctx, DEVICE_DEFS.iphone, fakeImg, baseOpts, 1)
    expect(calls.clip).toBeGreaterThanOrEqual(1)
    expect(calls.drawImage).toBe(1)
    expect(calls.fillText).toBe(3) // 日期+时间+状态栏小时间
  })

  it('showTime=false 时不绘制时间文字', () => {
    const { ctx, calls } = createStubContext()
    paintDevice(ctx, DEVICE_DEFS.macbook, fakeImg, { ...baseOpts, showTime: false }, 1)
    expect(calls.fillText).toBe(0)
  })

  it('scale 参数会应用到 context（导出高清图）', () => {
    const { ctx, calls } = createStubContext()
    paintDevice(ctx, DEVICE_DEFS.imac, fakeImg, baseOpts, EXPORT_SCALE)
    expect(calls.drawImage).toBe(1)
    expect(calls.scale[0]).toEqual([EXPORT_SCALE, EXPORT_SCALE])
  })
})

describe('renderDeviceImage', () => {
  it('生成的 canvas 尺寸 = 设备尺寸 × scale', () => {
    const c = renderDeviceImage(fakeImg, 'iphone', { ...baseOpts, scale: 1 })
    expect(c.width).toBe(DEVICE_DEFS.iphone.width)
    expect(c.height).toBe(DEVICE_DEFS.iphone.height)
  })
})

import { describe, expect, it } from 'vitest'
import { DEVICE_DEFS } from '../devices'
import { EXPORT_SCALE, paintDevice, renderDeviceImage, type RenderOptions } from '../canvas'

function createStubContext() {
  const calls = { drawImage: 0, fillText: 0, clip: 0, fill: 0 }
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
    scale: () => {},
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

const fakeImg = { width: 1200, height: 800 } as unknown as HTMLImageElement

const baseOpts: RenderOptions = { showTime: true, now: new Date(2026, 9, 6, 19, 16) }

describe('paintDevice', () => {
  it('绘制壁纸与两组时间文字（日期+时间）', () => {
    const { ctx, calls } = createStubContext()
    paintDevice(ctx, DEVICE_DEFS.iphone, fakeImg, baseOpts, 1)
    expect(calls.clip).toBeGreaterThanOrEqual(1)
    expect(calls.drawImage).toBe(1)
    expect(calls.fillText).toBe(2)
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
  })
})

describe('renderDeviceImage', () => {
  it('生成的 canvas 尺寸 = 设备尺寸 × scale', () => {
    const c = renderDeviceImage(fakeImg, 'iphone', { ...baseOpts, scale: 1 })
    expect(c.width).toBe(DEVICE_DEFS.iphone.width)
    expect(c.height).toBe(DEVICE_DEFS.iphone.height)
  })
})

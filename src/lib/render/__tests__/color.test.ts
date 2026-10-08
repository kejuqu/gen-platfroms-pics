import { describe, expect, it } from 'vitest'
import { averageColor, gradientStops } from '@/lib/render/color'

describe('averageColor', () => {
  it('两个像素求平均: 红 + 蓝 → [128, 0, 128]', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255])
    expect(averageColor(data, 0, 2)).toEqual([128, 0, 128])
  })

  it('跳过 alpha < 128 的像素: 半透明绿被忽略, 只留红色', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 60])
    expect(averageColor(data, 0, 2)).toEqual([255, 0, 0])
  })

  it('全部透明时回退 [128, 128, 128]', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 10])
    expect(averageColor(data, 0, 2)).toEqual([128, 128, 128])
  })

  it('startPixel 偏移: 只统计区间内的后两个像素', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 0, // 透明, 不统计
      0, 0, 0, 0, // 透明, 不统计
      100, 0, 0, 255,
      200, 0, 0, 255,
    ])
    expect(averageColor(data, 2, 2)).toEqual([150, 0, 0])
  })
})

describe('gradientStops', () => {
  it('左区压深 28%、右区提亮 42% → 固定对角渐变起止色', () => {
    expect(gradientStops([100, 150, 200], [10, 20, 30])).toEqual({
      from: [72, 108, 144],
      to: [113, 119, 125],
    })
  })
})

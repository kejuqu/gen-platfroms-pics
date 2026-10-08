import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { buildDeviceGroup, PREVIEW_BASE, roundedRectShape } from '../three'

describe('PREVIEW_BASE', () => {
  it('恰好三种设备且尺寸为正', () => {
    expect(Object.keys(PREVIEW_BASE)).toEqual(['iphone', 'ipad-landscape', 'macbook'])
    for (const dims of Object.values(PREVIEW_BASE)) {
      expect(dims.width).toBeGreaterThan(0)
      expect(dims.height).toBeGreaterThan(0)
    }
  })

  it('iphone 竖构图，ipad/macbook 横构图', () => {
    expect(PREVIEW_BASE.iphone.height).toBeGreaterThan(PREVIEW_BASE.iphone.width)
    expect(PREVIEW_BASE['ipad-landscape'].width).toBeGreaterThan(PREVIEW_BASE['ipad-landscape'].height)
    expect(PREVIEW_BASE.macbook.width).toBeGreaterThan(PREVIEW_BASE.macbook.height)
  })
})

describe('roundedRectShape', () => {
  it('生成闭合的圆角矩形轮廓（8 段路径点）', () => {
    const shape = roundedRectShape(4, 2, 0.5)
    const points = shape.getPoints(4)
    expect(points.length).toBeGreaterThan(8)
    // 包围盒约等于外接矩形
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    expect(Math.max(...xs)).toBeCloseTo(2, 1)
    expect(Math.min(...xs)).toBeCloseTo(-2, 1)
    expect(Math.max(...ys)).toBeCloseTo(1, 1)
    expect(Math.min(...ys)).toBeCloseTo(-1, 1)
  })
})

describe('buildDeviceGroup', () => {
  const dummyTex = new THREE.Texture()

  it('三种设备都返回含网格的 Group，且不依赖 WebGL（jsdom 可跑）', () => {
    for (const kind of ['iphone', 'ipad-landscape', 'macbook'] as const) {
      const group = buildDeviceGroup(kind, dummyTex)
      let meshCount = 0
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) meshCount += 1
      })
      expect(meshCount).toBeGreaterThanOrEqual(2)
    }
  })

  it('iPhone 含机身/屏幕/灵动岛/侧键，MacBook 含底座与上盖组件', () => {
    const iphone = buildDeviceGroup('iphone', dummyTex)
    let iphoneMeshes = 0
    iphone.traverse((obj) => { if (obj instanceof THREE.Mesh) iphoneMeshes += 1 })
    expect(iphoneMeshes).toBeGreaterThanOrEqual(5)

    const macbook = buildDeviceGroup('macbook', dummyTex)
    let macbookMeshes = 0
    macbook.traverse((obj) => { if (obj instanceof THREE.Mesh) macbookMeshes += 1 })
    expect(macbookMeshes).toBeGreaterThanOrEqual(4)
  })

  it('屏幕材质开启 transparent（贴图圆角处需透明混合）', () => {
    for (const kind of ['iphone', 'ipad-landscape', 'macbook'] as const) {
      const group = buildDeviceGroup(kind, dummyTex)
      let screenMat: THREE.MeshBasicMaterial | null = null
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshBasicMaterial) {
          screenMat = obj.material
        }
      })
      expect(screenMat).not.toBeNull()
      expect(screenMat!.transparent).toBe(true)
    }
  })
})

// src/lib/render/three.ts
// Three.js 3D 设备渲染：程序化建模（iPhone / iPad 横屏 / MacBook）+ 锁屏贴图 +
// 主色渐变背景 + 摄影棚灯光 + 接触阴影。预览与下载共用同一渲染（scale 不同）。
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { GradientStops } from './color'
import { composeLockScreen, type ScreenKind } from './canvas'

export type ThreeKind = ScreenKind

/** 预览输出画布基准尺寸（CSS px），scale=EXPORT_SCALE 时为导出尺寸 */
export const PREVIEW_BASE: Record<ThreeKind, { width: number; height: number }> = {
  iphone: { width: 600, height: 800 },
  'ipad-landscape': { width: 993, height: 660 },
  macbook: { width: 880, height: 640 },
}

export interface ThreeRenderOptions {
  now: Date
  backdrop: GradientStops
  /** 输出尺寸倍数，默认 1（下载用 EXPORT_SCALE=4） */
  scale?: number
}

/** 各机位的构图参数（参考卖家预览图视角：前上方 3/4 俯视） */
const SCENE_CFG: Record<
  ThreeKind,
  { tiltX: number; tiltY: number; camPos: [number, number, number]; camTarget: [number, number, number]; groundY: number }
> = {
  iphone: { tiltX: -0.28, tiltY: -0.58, camPos: [0, 1.6, 20], camTarget: [0, -0.2, 0], groundY: -4.2 },
  'ipad-landscape': { tiltX: -0.22, tiltY: -0.5, camPos: [0, 1.8, 16.4], camTarget: [0, 0, 0], groundY: -3.3 },
  macbook: { tiltX: 0, tiltY: 0, camPos: [0, 3.0, 13.4], camTarget: [0, 2.0, -0.5], groundY: 0 },
}

/** 中心原点圆角矩形 Shape */
export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/** 圆角矩形填充/描边（canvas 2D，避免依赖 ctx.roundRect 兼容性） */
function canvasRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** MacBook 底座 C 面贴图：铝合金掌托 + 键帽网格 + 触控板（顶面 UV v=1 朝铰链侧） */
function makeKeyboardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 332
  const ctx = c.getContext('2d')
  if (ctx) {
    // 掌托底色（银色铝合金）
    ctx.fillStyle = '#c6c6cd'
    ctx.fillRect(0, 0, 512, 332)

    // 键帽区：14 列 × 5 行，底排中央合并为空格键
    const well = { x: 30, y: 20, w: 452, h: 170 }
    const cols = 14
    const rows = 5
    const gap = 6
    const cellW = (well.w - gap * (cols - 1)) / cols
    const cellH = (well.h - gap * (rows - 1)) / rows
    ctx.fillStyle = '#232328'
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const kx = well.x + col * (cellW + gap)
        const ky = well.y + r * (cellH + gap)
        if (r === rows - 1 && col >= 3 && col <= 10) {
          if (col === 3) {
            canvasRoundRect(ctx, kx, ky, cellW * 8 + gap * 7, cellH, 6)
            ctx.fill()
          }
          continue
        }
        canvasRoundRect(ctx, kx, ky, cellW, cellH, 5)
        ctx.fill()
      }
    }

    // 触控板（掌托前缘居中）
    const tp = { x: 512 * 0.305, y: 214, w: 512 * 0.39, h: 100 }
    ctx.fillStyle = '#b3b3bb'
    canvasRoundRect(ctx, tp.x, tp.y, tp.w, tp.h, 10)
    ctx.fill()
    ctx.strokeStyle = '#96969e'
    ctx.lineWidth = 2
    canvasRoundRect(ctx, tp.x, tp.y, tp.w, tp.h, 10)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** 机身金属材质（银色铝合金） */
function frameMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xd9d9df, metalness: 0.92, roughness: 0.32 })
}

/**
 * 构建设备模型（纯几何，无 GL 依赖，可在 jsdom 中单测）。
 * 屏幕平面使用 MeshBasicMaterial（不自发光计算，屏幕观感接近参考图）。
 */
export function buildDeviceGroup(kind: ThreeKind, screenTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group()
  const frameMat = frameMaterial()
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.4, roughness: 0.5 })
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, transparent: true })
  const add = (parent: THREE.Group | THREE.Mesh, m: THREE.Mesh): THREE.Mesh => {
    m.castShadow = true
    parent.add(m)
    return m
  }

  if (kind === 'iphone') {
    const w = 3.5
    const h = 7.55
    const depth = 0.34
    const bevel = 0.045
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, 0.62), {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 24,
    })
    bodyGeo.translate(0, 0, -depth / 2)
    add(group, new THREE.Mesh(bodyGeo, frameMat))

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 7.13), screenMat)
    screen.position.z = depth / 2 + bevel + 0.003
    add(group, screen)

    const islandGeo = new THREE.ExtrudeGeometry(roundedRectShape(0.95, 0.26, 0.13), {
      depth: 0.04,
      bevelEnabled: false,
      curveSegments: 16,
    })
    const island = add(group, new THREE.Mesh(islandGeo, blackMat))
    island.position.set(0, h / 2 - 0.62, depth / 2 + bevel + 0.002)

    // 左侧音量/ action 键
    for (const [by, len] of [[2.15, 0.5], [1.5, 0.32]] as const) {
      const btn = add(group, new THREE.Mesh(new THREE.BoxGeometry(0.035, len, 0.12), frameMat))
      btn.position.set(-w / 2 - 0.015, by, 0)
    }
    return group
  }

  if (kind === 'ipad-landscape') {
    const w = 7.2
    const h = 5.1
    const depth = 0.26
    const bevel = 0.04
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, 0.35), {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 24,
    })
    bodyGeo.translate(0, 0, -depth / 2)
    add(group, new THREE.Mesh(bodyGeo, frameMat))

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 4.83), screenMat)
    screen.position.z = depth / 2 + bevel + 0.003
    add(group, screen)
    return group
  }

  // macbook：底座（C 面贴键盘纹理，圆角机身）+ 圆角上盖（铰链在后缘，展开约 102°）
  const deckMat = new THREE.MeshStandardMaterial({ map: makeKeyboardTexture(), metalness: 0.45, roughness: 0.42 })
  const baseMats = [frameMat, frameMat, deckMat, frameMat, frameMat, frameMat]
  const base = add(group, new THREE.Mesh(new RoundedBoxGeometry(7.4, 0.22, 4.8, 2, 0.09), baseMats))
  base.position.y = 0.11

  const lid = new THREE.Group()
  lid.position.set(0, 0.22, -2.35)
  lid.rotation.x = THREE.MathUtils.degToRad(-12)
  group.add(lid)

  // 上盖：圆角矩形挤出（四角圆润，参考真机）
  const slabGeo = new THREE.ExtrudeGeometry(roundedRectShape(7.4, 4.9, 0.12), {
    depth: 0.13,
    bevelEnabled: false,
    curveSegments: 16,
  })
  slabGeo.translate(0, 0, -0.065)
  const slab = new THREE.Mesh(slabGeo, frameMat)
  slab.position.set(0, 2.45, 0)
  slab.castShadow = true
  lid.add(slab)

  const display = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.24), screenMat)
  display.position.set(0, 2.45, 0.069)
  lid.add(display)

  // 摄像头 notch：圆角造型（与 iPhone 灵动岛一致的圆角矩形挤出）
  const notchGeo = new THREE.ExtrudeGeometry(roundedRectShape(0.95, 0.2, 0.09), {
    depth: 0.06,
    bevelEnabled: false,
    curveSegments: 12,
  })
  const notch = new THREE.Mesh(notchGeo, blackMat)
  notch.position.set(0, 4.9 - 0.28, 0.04)
  lid.add(notch)

  return group
}

/** 主色渐变背景纹理（左深右浅对角渐变，取自壁纸主色） */
function makeGradientTexture(stops: GradientStops): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 256, 256)
    g.addColorStop(0, `rgb(${stops.from.join(',')})`)
    g.addColorStop(1, `rgb(${stops.to.join(',')})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function buildScene(
  kind: ThreeKind,
  screenTex: THREE.Texture,
  backdrop: GradientStops,
): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
  const cfg = SCENE_CFG[kind]
  const base = PREVIEW_BASE[kind]
  const scene = new THREE.Scene()
  scene.background = makeGradientTexture(backdrop)

  // 地面（仅接收阴影）
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.25 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = cfg.groundY
  ground.receiveShadow = true
  scene.add(ground)

  // 摄影棚三灯：半球环境 + 主光（投影）+ 轮廓光
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445, 0.55))
  const key = new THREE.DirectionalLight(0xffffff, 1.15)
  key.position.set(5, 8, 6)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -10
  key.shadow.camera.right = 10
  key.shadow.camera.top = 10
  key.shadow.camera.bottom = -10
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 40
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xffffff, 0.35)
  rim.position.set(-6, 3, -5)
  scene.add(rim)
  scene.add(new THREE.AmbientLight(0xffffff, 0.15))

  // 设备 + 倾斜
  const device = buildDeviceGroup(kind, screenTex)
  const tilt = new THREE.Group()
  tilt.add(device)
  tilt.rotation.set(cfg.tiltX, cfg.tiltY, 0)
  scene.add(tilt)

  const camera = new THREE.PerspectiveCamera(30, base.width / base.height, 0.1, 200)
  camera.position.set(...cfg.camPos)
  camera.lookAt(new THREE.Vector3(...cfg.camTarget))
  return { scene, camera }
}

function disposeScene(scene: THREE.Scene, screenTex: THREE.Texture): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => {
        if (m.map) m.map.dispose()
        m.dispose()
      })
    }
  })
  screenTex.dispose()
  if (scene.background instanceof THREE.Texture) scene.background.dispose()
}

let renderer: THREE.WebGLRenderer | null = null

/** 共享渲染器：避免每张卡片各建 WebGL 上下文（浏览器上限约 16 个） */
function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    } catch {
      throw new Error('WebGL unavailable')
    }
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
  }
  return renderer
}

/** 渲染卖家预览，返回 PNG dataURL（页面展示与下载共用，scale 不同） */
export function renderThreePreview(
  img: HTMLImageElement,
  kind: ThreeKind,
  opts: ThreeRenderOptions,
): string {
  const base = PREVIEW_BASE[kind]
  const scale = opts.scale ?? 1
  const r = getRenderer()
  r.setPixelRatio(1)
  r.setSize(base.width * scale, base.height * scale, false)

  const screenTex = new THREE.CanvasTexture(composeLockScreen(img, kind, opts.now))
  screenTex.colorSpace = THREE.SRGBColorSpace
  // 最高各向异性：斜视/缩小时锁屏文字更锐利
  screenTex.anisotropy = 16

  const { scene, camera } = buildScene(kind, screenTex, opts.backdrop)
  r.render(scene, camera)
  const url = r.domElement.toDataURL('image/png')
  disposeScene(scene, screenTex)
  return url
}

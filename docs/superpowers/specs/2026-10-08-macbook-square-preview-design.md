# MacBook(Computer)预览图改为 1:1 正方形

日期:2026-10-08

## 背景与目标

平台商品图要求:至少 1 张比例为 1:1 或 3:4,像素 ≥800×800 或 ≥750×1000。

当前导出尺寸(EXPORT_SCALE=3):

| 设备 | 基准 | 导出 | 比例 |
| --- | --- | --- | --- |
| iPhone | 600×800 | 1800×2400 | 3:4 ✅ |
| iPad 横屏 | 993×660 | 2979×1980 | 3:2 |
| MacBook | 880×640 | 2640×1920 | 11:8 |

iPhone 预览已满足 3:4 要求。用户要求:**将 Computer(macbook)的展示与导出宽高比改为 1:1**,使三张预览中同时有 3:4 和 1:1 两种合规图。

## 方案

页面预览与导出均派生自 `PREVIEW_BASE`(`src/lib/render/three.ts`),因此直接修改基准尺寸即可同时影响展示(`aspectRatio` CSS、预览渲染)与导出(单张下载、批量 ZIP)。

1. **`PREVIEW_BASE.macbook`**:`{ width: 880, height: 640 }` → `{ width: 800, height: 800 }`
   - 导出尺寸 = 800×3 = **2400×2400**,满足 1:1 且 ≥800×800。
2. **`SCENE_CFG.macbook` 相机重取景**:纵横比从 1.375 变为 1.0,水平视野收窄(fixed FOV 30° 下水平半角从 ~20° 变为 15°),MacBook 机身较宽会被左右裁切。将 `camPos` 后拉(按几何计算保证整机 + 接触阴影完整、居中、留边),必要时微调 `camTarget` 的 y。
3. 修正过期注释:`ThreeRenderOptions.scale` 注释 "EXPORT_SCALE=4" → "EXPORT_SCALE=3"。
4. 更新 `src/lib/render/__tests__/three.test.ts` 中对 macbook 尺寸的断言。
5. 浏览器实际渲染截图验证三种设备的最终构图。

## 非目标

- iPhone、iPad 横屏的基准尺寸与构图不变。
- 不新增校验/提示逻辑(平台合规已由 iPhone 3:4 + macbook 1:1 覆盖)。

# 绘图工具方案（已确定）

**状态：已确定**  
**工具库：JSXGraph（2D + 3D View3D）**

## 决定

课件左图统一以 **JSXGraph** 为绘图运行时（离线 vendor），经 `AIClassFigureRegistry` 挂载。

| 项 | 约定 |
|----|------|
| 2D | `JXGKit2D`（`engine/src/figures/jxg-kit-2d.js`） |
| 3D | `JXGKit3D` + `View3DAnimate`（View3D；不另引 Three.js） |
| Vendor | `engine/vendor/jsxgraph/`（`jsxgraph@1.12.2`，`npm run vendor:sync`） |
| 契约 | `mount` / `setState` / `destroy`；state 驱动显隐与高亮 |
| 方案 B | 淘汰（整图矢量化） |
| Legacy SVG | `figures/kit.js` 仅供未迁移 Figure；**新图默认 JSXGraph** |

## 作者侧前置：图形空间确认

```
outline approved → figure-spec.json → figure:preview → 图形 OK → _*-figure.js
```

- 制图流程 Skill：[`skills/figure-space-clarify/`](../../skills/figure-space-clarify/SKILL.md)（只定 spec，不写 HTML）
- **审图页由引擎生成**：`engine/templates/figure-preview/` + `npm run figure:preview -- <lessonId>`
- `figure-spec.preview`：标题、副标题、图形下方 `info[]` 参数表
- `figure-spec.dimension`：`2d` | `3d`

## 接入原则

1. 离线优先；`course:export` 包内带固定版本 JSXGraph。  
2. 一 Figure 一 board；`setState` 不整板重建（除非调试）。  
3. Plan 仍是讲法真源；JSXGraph 是渲染实现。  
4. 几何关键题对照原图验收。  
5. 3D 交互默认点固定 + trackball；复位须恢复 bank（用 `View3DAnimate`）。  
   - `View3DAnimate.to/reset/spin` 播放中会锁 trackball；结束后写入相机检查点并解锁。  
   - 下一步动画开始前若视角被拖偏，先瞬时恢复检查点再播放。

## 相关链接

- Figure Host：`engine/src/core/shell/figure-host.js`
- 注册表：`engine/src/figures/registry.js`
- 引擎架构：`engine/docs/architecture.md`

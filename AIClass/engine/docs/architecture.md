# Engine 架构

## 总体模型

```text
AIClass/                          monorepo 根
├─ courses/<course-id>/           课件源（独立包）
├─ math_syllabus/                 内容规划（独立包）
├─ docs/production/               跨包 L0 文档区
└─ engine/                        本包
   ├─ src/                        共享运行时
   │  ├─ boot/ bridge/ config/
   │  ├─ core/
   │  │  ├─ layout/               舞台、背景、overlay、scroll-lock
   │  │  ├─ scroll/               滚动索引与跟随
   │  │  ├─ shell/                课容器、container/figure Host
   │  │  └─ session/              调度、路由、门禁、手写运行时
   │  ├─ components/ widgets/ screens/ styles/
   │  ├─ figures/                 Registry + JSXGraph kit + legacy SVG kit
   │  └─ assets/                  仅通用资源（stars、handwriting-demo 等）
   ├─ templates/                  无业务骨架
   ├─ schemas/
   ├─ tools/                      aiclass.mjs 等（coursesRoot = ../courses）
   ├─ references/                 Plan 配方；不进导出
   ├─ tests/fixtures/             合成课（测时拷到 ../courses）
   ├─ vendor/                     katex / konva / jsxgraph
   ├─ docs/                       本目录
   ├─ dist/ artifacts/            生成物，不提交
   └─ workspace.example.json
```

## 真源链

```text
math_syllabus/lesson/{id}/plan.json
  → courses/{courseId}/course.json
  → lesson:generate → courses/{id}/.generated
  → course:export → engine/dist/{id}
```

禁止手改 `.generated/`、`dist/.../lesson/modules/` 当真源。

## `src/` 边界

只放全课通用能力。禁止：真实课名、题号、答案、课专用 CSS selector（如 `.ex1-` / `.vol1-`）。

### `core/` 子目录

| 子目录 | 职责 |
|--------|------|
| `layout/` | 舞台、背景板、场景背景、overlay、stage scroll-lock |
| `scroll/` | 滚动索引与跟随 |
| `shell/` | 课容器、`container-host`、`figure-host` |
| `session/` | 调度器、action 路由、交互门禁/快照、执行日志、交卷文案、手写运行时 |

加载顺序见 `src/boot/engine-manifest.js`（路径变、相对顺序不变）。

### Figures

| 文件 | 角色 |
|------|------|
| `registry.js` | `AIClassFigureRegistry` |
| `jxg-loader.js` | 加载 `vendor/jsxgraph/` |
| `jxg-kit-2d.js` / `jxg-kit-3d.js` | 2D / View3D 绘制 |
| `view3d-animate.js` | 3D 视角动画 |
| `kit.js` | **legacy** SVG 辅助；新图勿用 |

跨包绘图约定：[`docs/production/figure-tooling.md`](../../docs/production/figure-tooling.md)。

## `courses/`（仓库根）

一套课一个目录：`course.json`、modules、extensions、assets、styles。  
课专属 Figure：`courses/<id>/lesson/modules/_*-figure.js`。

## Vendor

`npm run vendor:sync` → `vendor/katex`、`vendor/konva`、`vendor/jsxgraph`。导出时整包拷入 dist。

## 相关文档

- [commands.md](./commands.md)
- [docs/production](../../docs/production/README.md)
- archive/（发版与历史审计，非日常）

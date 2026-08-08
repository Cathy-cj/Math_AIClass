# Engine 架构

## 总体模型

```text
AIClass/                          monorepo 根
├─ ../_output_/{grade}/<course-id>/  课件源（独立包：course.json + outline/plan + debug/.generated）
├─ math_syllabus/                 内容规划（独立包）
└─ engine/                        本包
   ├─ src/                        共享运行时
   │  ├─ boot/ bridge/ config/
   │  ├─ core/
   │  │  ├─ layout/               舞台、背景、overlay、scroll-lock
   │  │  ├─ scroll/               滚动索引与跟随
   │  │  ├─ shell/                课容器、container/figure Host
   │  │  └─ session/              调度、路由、门禁
   │  ├─ components/ widgets/ screens/ styles/
   │  ├─ figures/                 Registry + JSXGraph kit + legacy SVG kit
   │  └─ assets/                  仅通用资源（如 stars）
   ├─ templates/                  无业务骨架
   ├─ schemas/
   ├─ tools/                      aiclass.mjs 等（findOutputCourseDir = _output_/* 扫描）
   ├─ references/                 Plan 配方；不进导出
   ├─ tests/fixtures/             合成课（测时拷到 ../_output_/{grade}）
   ├─ vendor/                     katex
   ├─ docs/                       本目录
   ├─ dist/ artifacts/            生成物，不提交
   └─ workspace.example.json
```

## 真源链

```text
_output_/{grade}/{courseId}/{problemId}/plan.json   （course.json 注册表在同级）
  → lesson:generate → _output_/{grade}/{courseId}/.generated
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
| `session/` | 调度器、action 路由、交互门禁/快照、执行日志、交卷文案 |

加载顺序见 `src/boot/engine-manifest.js`（路径变、相对顺序不变）。

### Figures

| 文件 | 角色 |
|------|------|
| `registry.js` | `AIClassFigureRegistry` |
| `jxg-loader.js` | 加载 `vendor/jsxgraph/` |
| `jxg-kit-2d.js` / `jxg-kit-3d.js` | 2D / View3D 绘制 |
| `view3d-animate.js` | 3D 视角动画 |
| `kit.js` | **legacy** SVG 辅助；新图勿用 |

跨包绘图约定：根 [`skills/figure/specification.md`](../../../skills/figure/specification.md)。

## `_output_/`（仓库根）

一套课一个目录：`course.json`、{problemId}/、debug/、.generated/。  
课专属 Figure：`_output_/{grade}/<id>/.generated/lesson/modules/_*-figure.js`。

## Vendor

`npm run vendor:sync` → `vendor/katex`。导出时整包拷入 dist。

## iframe 通信与拍照作答

父页面向课件发送 `{ action, params }`；课件上报 `ready`、`step_ok`、
`scheduler_error` 和 `user_submitted`。普通互动的 `kind` 分别为
`course_fill`、`course_choice`、`voice`，且消息只能是
`{ type, kind, value }`；拍照请求只能是 `{ type, kind: 'course_photo' }`。
`user_submitted` 不携带 `source` 或 `status`。

每个 `moduleType: "practice"` 在生成时自动追加
`{actionPrefix}_作答_拍照` action。宿主在练习题入口 action 已执行后派发它，课件会
在 calculation `top-split` 左栏显示“作答结果 / 拍照上传”区域。用户点击按钮时，课件上报：

```js
{ type: 'user_submitted', kind: 'course_photo' }
```

手写板和 OCR 均由宿主侧负责。识别完成后，父页面直接向 iframe 回传：

```js
{ type: 'photo_result', value: '识别到：$x=3$，验算：$$2x+1=7$$' }
```

`value` 可混排普通文字、`$...$` 行内公式与 `$$...$$` 独立公式。结果填入最近一次
派发拍照 action 的练习题左栏作答区域，不触发判题或教学步骤推进；挂载成功后课件上报
`{ type: 'answer_result_shown', status: 'ok' }`。

## 相关文档

- [commands.md](./commands.md)
- 根 [skills/README.md](../../../skills/README.md)
- archive/（发版与历史审计，非日常）

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
   │  │  └─ session/              调度、路由、门禁、提交文本
   │  ├─ components/ widgets/ screens/ styles/
   │  ├─ figures/                 Registry + JSXGraph kit + legacy SVG kit
   │  └─ assets/                  仅通用资源（如 stars）
   ├─ templates/                  无业务骨架
   ├─ schemas/
   ├─ tools/                      aiclass.mjs 等（findOutputCourseDir = _output_/* 扫描）
   ├─ references/                 Plan 配方；不进导出
   ├─ tests/fixtures/             合成课（测时拷到 ../_output_/{grade}）
   ├─ vendor/                     katex / jsxgraph
   ├─ docs/                       本目录
   ├─ dist/ artifacts/            生成物，不提交
   └─ workspace.example.json
```

## 真源链

```text
_output_/{grade}/{courseId}/{problemId}/plan.json   （course.json 注册表在同级）
  → lesson:generate → _output_/{grade}/{courseId}/.generated
  → course:export → dist/{grade}/{courseId}（仓库根，按年级分目录）
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

`npm run vendor:sync` → `vendor/katex`、`vendor/jsxgraph`。导出时整包拷入 dist。

## iframe 通信与练题拍照作答

父页面向课件发送 `{ action, params }`；课件上报 `ready`、`step_ok`、
`scheduler_error` 和 `user_submitted`。普通互动的 `kind` 经 `protocolKind` 归一：
选择为 `course_choice`、填空/连线为 `course_fill`、口答为 `voice`，所有 `value`
均为字符串；`user_submitted` 严格为 `{ type, kind, value? }` 裸对象，不得附加
`source`、`status`、`action` 或上下文字段。

每个 `moduleType: "practice"` 在生成时自动追加 `{actionPrefix}_作答_拍照`
action，并紧跟入口 action。父页面在练习题入口 action 已执行后派发它，课件显示
“作答结果 / 拍照上传”区域。用户点击按钮时，课件严格上行：

```js
{ type: 'user_submitted', kind: 'course_photo' }
```

手写板和 OCR 均由宿主侧负责。识别完成后，父页面直接向 iframe 回传：

```js
iframe.contentWindow.postMessage({
  type: 'photo_result',
  value: '识别到：$x=3$，验算：$$2x+1=7$$'
}, '*')
```

`photo_result` 严格为 `{ type, value }`；`value` 可混排普通文字、`$...$` 行内
公式与 `$$...$$` 独立公式，按纯文本插入、由本地 KaTeX 渲染，不执行 HTML。结果
填入最近一次派发拍照 action 的练习题作答区域——left-right 容器固定放在
`problemBrief` 下方、guide 上方。挂载成功后课件回传
`{ type: 'answer_result_shown', status: 'ok' }`；结果不判题、不提交且不推进步骤；
旧的作答结果 action 协议已移除。

## 相关文档

- [commands.md](./commands.md)
- 根 [skills/README.md](../../../skills/README.md)
- archive/（发版与历史审计，非日常）

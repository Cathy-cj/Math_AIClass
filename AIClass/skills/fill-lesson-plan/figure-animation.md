# 左图动画与标注 SOP

fill-lesson-plan 阶段必读。与 [step-splitting.md](step-splitting.md) 配合。

## 两档粒度（批量 + AI 生成）

| 档位 | 字段 | 给谁看 | 够不够 AI 生成动画 |
|------|------|--------|-------------------|
| **L1 意图** | `figure.note` 一句话 | 人快速审 | **不够**，只能知道「要干什么」 |
| **L2 规格** | `figure.actions[]` + `transition` | **codegen / 动画 AI** | **够**，逐步可执行 |

**规则**：凡有左图变化的 step，必须同时写 **L1 + L2**。禁止只有「高亮半径」这种空描述。

## 字段分工

| 字段 | 作用 |
|------|------|
| `figure.state` | 状态机 key（同模板内唯一语义） |
| `figure.note` | L1：人读摘要（1 句） |
| `figure.transition` | 从上一 state 切入：`from`、`durationMs`、`easing`；首帧或 state 不变可省略 `from` |
| `figure.actions[]` | L2：本步动画序列（按数组顺序执行） |
| `figure.keepPrevious` | true = 保留上一帧标注不清空 |

`agent.description` = 口播；**动画细节不要堆在口播里**（TTS 逐字稿不含屏幕说明）。

## actions[] 操作表

按顺序播放。常用 `op`：

| op | 含义 | 必填参数 | 示例 |
|----|------|----------|------|
| `dim` | 弱化非焦点 | `targets`, `opacity` | 圆柱/圆锥体 opacity 0.35 |
| `highlight` | 描边/发光高亮 | `targets`, `stroke?`, `glow?` | 底面圆高亮 |
| `color` | 分段填色 | `targets`, `fill` | 圆柱 `#3b82f6` |
| `draw` | 画出辅助线 | `target`, `from`, `to`, `durationMs?` | 圆心→圆边半径线 |
| `label` | 文字/尺寸标注 | `target`, `text`, `placement`, `style?` | r＝2dm，dimension |
| `blink` | 闪烁 | `targets`, `times`, `durationMs` | 题干「体积」闪 2 次 |
| `separate` | 部件分离 | `targets`, `offset`, `durationMs` | 上下段 Y 向拉开 24px |
| `fill` | 体积填充动画 | `targets`, `direction`, `durationMs` | 圆柱/圆锥自下而上**整体**满填 |
| `show` | 显示隐藏元素 | `targets` | 显示尺寸线 |

`targets` / `target` 用**模板内构件 id**（与 figureTemplate 一致），如 `cylinder_body`、`cone_body`、`base_circle`、`radius_line`。

- `label.placement` 常用值：`right` | `left` | `above` | `below` | `midpoint_offset_right` | `on_arc`
- `label.style`：`dimension`（尺寸线）| `plain`（纯文字）| `badge`
- **图上 `label.text` 用 plain 分数/数字**（`1/2`、`2/6`、`r＝2dm`），**禁止** `$...$` / `\frac`——与右栏 push 不同，label 不经 widgets 的 KaTeX 管道
- Figure 模块须用 `JXGKit2D.createBoardLabel`（内部 normalize + KaTeX 兜底）；禁止 `board.create('text', …)` 直接传 `$...$`

## 完整示例（读半径）

```json
"figure": {
  "state": "intro_r",
  "transition": { "from": "intro_shape", "durationMs": 500, "easing": "ease-out" },
  "note": "聚焦底面半径：弱化柱体，画出半径线并标注 r＝2dm",
  "actions": [
    { "op": "dim", "targets": ["cylinder_body", "cone_body"], "opacity": 0.35 },
    { "op": "highlight", "targets": ["base_circle"], "stroke": "#2563eb", "strokeWidth": 2 },
    { "op": "draw", "target": "radius_line", "from": "base_center", "to": "base_edge", "durationMs": 400 },
    { "op": "label", "target": "radius_line", "text": "r＝2dm", "placement": "midpoint_offset_right", "style": "dimension" }
  ]
}
```

## 按环节写什么级别的 actions

| 环节 | actions 要点 |
|------|----------------|
| 审题环节 | dim + highlight + draw/label 逐条点亮已知；染色用 color |
| 推导环节 | separate 拆分、highlight 共用元素、fill 配合公式；对比互动用并排 + blink |
| 提取已知 | 依次 highlight 已有 label，可加 show |
| 列式计算 | 通常无左图；有则 blink 答案区 |

### 体积对比（同底等高 · V锥＝⅓V柱）

口播/选项问的是**体积份数**，不是「圆锥图形高度的 1/3」。`heightRatio` **禁止**用于体积比（勿把体积比画成图形高度的 1/3）。

| ✅ 正确 | ❌ 禁止 |
|--------|--------|
| 并排：同底、同高；圆柱整体满填标「1 份」 | 圆锥只给下部 1/3 **高度**上色 |
| 圆锥**整体**满填，标「⅓ 份」（形状装得少 = 体积小） | `heightRatio: 0.33` 表示体积比 |
| `figure.note` 写「体积份数」 | note 写「高度 1/3 填色」 |

## 禁止

- 只有 note、没有 actions（L2 缺失）
- note 写「动画：…」但 actions 对不上
- 口播里长篇描述动画
- 默认「弹出标签」（用 draw + label）

`figure` 字段 schema 以 [reference.md](../lesson-plan/reference.md) 为准。

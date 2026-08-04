# 纯计算高亮与样式传参（对齐 module_template）

未来写 plan / 生成模块时，**只传这些类名与字段**即可复现模板样式，不必再写课级 CSS。  
样式实现：`engine/src/styles/calc-explain.css`（从 `module_template/lesson/styles/lesson.css` 提取）。

口播契约不在本文——见 [reference.md](reference.md)（TTS 逐字稿）与 [phrase-bank.md](phrase-bank.md)（从 AIClass 提炼）。

## 布局（固定）

```text
layout: "top-split"
region: top   → 题干
region: left  → 要点展开 / 详解累加 / 答案
region: right → 钉住要点摘要（详解阶段 retainPush）
```

建议容器常量：`splitLeftWidth: "58%"`，`splitMinHeight: 420`（与 module_template 一致），`bodySize: 24`～`28`，`lineHeight: 1.55`～`1.65`。

**上屏四段、action 命名、反模式**见 [calc-teaching-spine.md](calc-teaching-spine.md)（本文件只写 push 类名与 retainPush）。  
**top-split DOM、公式 fit、左栏滚动、previewOk 验收**见 [calc-engine-layout.md](calc-engine-layout.md)（全课组件契约，非单题补丁）。

### 多题容器（debug 课纲分组）

同一模块内多道例/练时：**一题一个 `containers[]` 项**，用 `head: "例" | "练"` 区分（无序号）。  
对应 sideEffect **必须写对 `containerIdx`**（与 containers 下标一致）。  
help / debug 侧栏会按 `head` 拆成「正文 · 例 / 练」，不会把所有 `_开始` 堆在一起。

## 讲法 / action 骨架（换题可复用）

```text
{题}_开始        → top 题干（不见答案）
{题}_要点_*      → left 累加要点；可选 choice/oral（retainPush 保前序要点）
{题}_详解_起     → **清空左栏要点**，right 钉住精简要点摘要（本步勿 retainPush）
{题}_详解_步k    → left 累加演算；retainPush = [详解_起 id, 已讲详解步…]
{题}_答案        → left 亮最终结果（同样 retainPush 保右钉 + 详解行）
```

### 「要点 → 右栏钉住」硬契约（对齐 module_template）

1. **讲要点时**只占左栏；右栏为空（半透明背板未显现）。
2. **`详解_起`** 是切换拍：`push` **只**往 `region:"right"` 钉精简摘要（`calc-key-pin`）；**不要**再往 left 推要点；**不要**写 `retainPush`。
   - 引擎：清左栏全部 sideEffect → 清右栏旧 sideEffect → 再 push 右钉（见 [calc-teaching-spine.md](calc-teaching-spine.md)）
3. **`详解_步*`** 起才往 left 推 `calc-solve-*`；`retainPush` 必须包含 `详解_起` 的 step id，否则右栏钉会被清掉。
4. 右栏文案应比左栏要点更短（钉住摘要，不是原文复制）。

多小题：每小题 **要点 → 详解 → 答案** 闭环后再进下一小题。

### 要点 vs 详解（硬契约）

| | 解题要点 | 详解 |
|--|----------|------|
| 回答什么 | 「这题靠哪一招」 | 「每一步怎么变」 |
| 形态 | 1～2 条短句 / 口答 / 高亮关键词 | 多行注释+公式 |
| 禁止 | 把整段化简写进要点 | 在详解里重复讲策略口号 |

## 类名与 push 传参

### 卷面标签

| 用途 | 传参 |
|------|------|
| 要点标题 | `"type":"section","class":"calc-label calc-label--key","tag":"【要点】","title":"…"` |
| 详解标题 | `"type":"section","class":"calc-label","tag":"【详解】","title":"…"` |
| 答案标签 | `"type":"section","class":"calc-label calc-label--answer","tag":"【答案】","title":"…"` |
| 右栏钉要点 | 在要点 class 上加 `calc-key-pin`，`region:"right"` |

### 题干（top）

```json
{ "type": "text", "region": "top", "class": "calc-stem", "lines": [{ "text": "解下列方程。" }] }
```

方程行：`"type":"latex","class":"calc-eq"`（或多小题用 `calc-eq-index` + `calc-eq`）；练题题干算式可用 `calc-eq calc-eq--stem`。

### 要点（left / 钉到 right）

```json
{
  "type": "text",
  "class": "calc-key-list",
  "lines": [{
    "html": true,
    "text": "1. 观察分母，两边同乘常数，<span class=\"calc-em\">一次去掉所有分母</span>。"
  }]
}
```

- 关键词强调：`<span class="calc-em">…</span>`（琥珀强调色）
- 互动：`"type":"choice","class":"calc-key-choice",…`（或 oral）
- 右栏公式摘要：`"class":"calc-key-tex"`

### 详解（left，一步一拍）

注释在上、公式在下：

```json
[
  {
    "type": "text",
    "class": "calc-solve-note",
    "region": "left",
    "lines": [{ "html": true, "text": "两边同乘三：" }]
  },
  {
    "type": "latex",
    "class": "calc-solve-step",
    "region": "left",
    "display": true,
    "align": "left",
    "tex": "……"
  }
]
```

也可用 `"type":"solveStep"`（引擎 widget）；答案高亮加 `"highlightAnswer": true`。

详解步对已钉右栏 + 已上屏左栏使用 `retainPush`（模块 sideEffect 字段），避免清掉要点钉。

### 答案（left，晚出）

```json
{
  "type": "solveStep",
  "class": "calc-answer calc-answer--final",
  "region": "left",
  "highlightAnswer": true,
  "title": "x = 1",
  "tex": "x=1"
}
```

或 `latex` + 同样 `calc-answer calc-answer--final`。

## 公式排版（引擎自动）

对带 `calc-eq` / `calc-solve-step` / `calc-answer` / `calc-key-tex` 的块，引擎 **自动**：

1. 优先 **单行缩小字号**  
2. 仍溢出则在 **`=` / 除号（`\div`、`\frac` 等）** 断行  
3. **不在 `+`/`-` 处断行**

plan 侧只传 `tex` 字符串，不加排版字段。细则与预览清单见 [calc-engine-layout.md](calc-engine-layout.md)。

## 模块写法提示（codegen 应对齐）

- `withRegion(region, blocks)`：给 push 块统一补 `region`
- `solveLine(note, tex)` → `calc-solve-note` + `calc-solve-step`
- 右栏钉：`calc-key-pin` + `calc-key-list`；详解阶段 `retainPush`
- **一 action 尽量只上屏一小步**；开场不见完整详解与最终答案

## 不要做

- 不要写 `figureTemplate` / `steps[].figure` / `_*-figure.js`
- 不要把整段化简塞进要点；不要在详解里重复策略口号
- 不要在课级 `lesson.css` 重写 `.calc-*` 板式（改引擎 `calc-explain.css`）

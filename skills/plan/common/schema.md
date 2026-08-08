# Plan 共用 Schema 与当前 calculation 兼容契约

**职责：** 定义三种 render profile 共用的 plan 追溯和逐拍数据边界。  
**输入：** 已批准 outline 的 stage/beat 与 plan 的标题、TTS、互动、屏幕证据。  
**输出：** 可供后续 schema、lint、codegen 实现的目标字段约定。  
**禁止项：** 不宣称字段已被当前 engine 接受；不容纳 profile 私有 UI 字段于共用层。

> 以下是新 schema 草案，当前生产 plan 仍遵守 `plan:check` 契约；不要把本文件示例直接当作已可运行 JSON。

## outline 契约（无独立 schema 文件）

outline 目前**没有独立 schema 文件**（`AIClass/engine/schemas/` 仅有 `standard-plan / course / pipeline / course-lock`），全部硬约束硬编码在 `tools/content/{calculation,figure,text}/plan-check.mjs` 的 `checkOutlineStructure()` 中。本文档补录该契约，作为未来 outline schema 的基准：

| 约束 | 要求 |
|---|---|
| `teachingStages[]` | 至少 4 个 stage；首个必须为审题（entry-point 语义） |
| 推导链 | 每个 derivation stage 必须含 loop `from → get` |
| `interactions` | 全题至少 2 个（设计意图，不落 screen） |
| example 的 `quickQASkeleton` | 3–5 个 |
| 禁字段 | 新题不得写 `mathSkeleton` / `phases` |
| 废弃字段 | `guidanceDesc` 已废弃，写即警告 |
| `needsFigure` | 有图题显式声明；由 outline.json 提供，生成与检查据此判定 |

> 注意：以上约束随 `tools/content/*/plan-check.mjs` 演进，改校验时须同步本文档。

## 当前 calculation 兼容 schema（可生产）

本节只描述 `AIClass_calculation` 已实现并由当前 `plan:check` / `course:check` 接受的 JSON；它是必须保真的最低契约，**不是**本文件后文的目标 schema。

顶层沿用 `id`、`moduleType`、`lessonContext`、`outlineId`、`layout: "top-split"`、`steps[]`；例题可另有 `quickQA` 与 `quickQALayout: "above-body"`。plan 顶层和 step 均不得写 `problemBrief`、图形字段或目标字段。

| 每步字段 | 当前要求 |
|---|---|
| `id` | 必填，题内唯一短 id；开场固定为 `start`，其余通常为 `s01`、`s02`。不得预拼 plan 或 action 前缀；`attachStepId` 也只引用此短 id。 |
| `action` | 必填，使用 calculation 的 `{前缀}_开始 / 要点_* / 详解_起 / 详解_步* / 答案` 骨架。 |
| `phase` | 必填，当前题内中文环节标题。 |
| `agent` | 必填对象，必须同时有 `type` 和 `description`；`type` 仅为 `explain`（讲解、展示、答步、演算）或 `ask`（问步）。当前引擎不以它分支渲染，但校验要求存在。 |
| `push` | 必填数组；每项使用当前 widget / 区域 / `.calc-*` 契约。题干在 `top`，要点、详解、答案在 `left`，详解起的摘要在 `right`。 |
| `moduleNote` | 当前步骤字段；仅存制作说明，不能混入 TTS。 |
| `retainPush` | 需要累积时使用当前 step id 数组；详解起不得写，详解步和答案须保留详解起及已讲演算。 |
| `answerType`、`userResponse` | 互动问步必填，声明答法和可接受回答；不是目标 `interaction` 字段。 |

当前 widget 的事实约束：`oral` 问答分两步，答步以 `attachStepId` 和 `answer` 挂回问卡；`choice` 在问步同时提供 `question`、`options`、`answer`，答案必须命中选项 value；`fill` 使用 `parts`，空格提供 `answer`。开场 `start` 不得含互动或 `userResponse`。

## 当前 text 兼容 schema（可生产）

顶层沿用 `id`、`moduleType`、`lessonContext`、`outlineId`、`layout: "text-only"`、`guidanceLayout: "interleaved"`、`guidanceChain[]`、`steps[]`；例题另有 `quickQA` 与 `quickQALayout: "above-body"`。plan 顶层和 step 均不得写图形字段或目标字段；审题（group 1）用 `problemBrief` 快照 + `stemClass` 题干高亮（与 figure profile 统一，见「题干高亮契约」）。

| 每步字段 | 当前要求 |
|---|---|
| `id` | 题内短 id；开场固定 `start`，其余通常为 `s01`、`s02`；`attachStepId` 只引用短 id。 |
| `action` | 使用 `{前缀}_开始` 或 `{前缀}_步骤NN_展/问/答/亮/算_…`，题内唯一。 |
| `phase` / `group` | 必填；`group:0` 仅开场，`group:1` 是审题，后续 group 与 `guidanceChain` 连续对应。 |
| `agent` | 必填 `type` 与 `description`；讲解/揭晓用 `explain`，问步用 `ask`。 |
| `push` | 题干仅开场进入 `top`；group 1 由 `problemBrief` 快照承载（不写 section 卡），其余 group 的内容由卡片、互动和 `replaceKey` 落入。 |
| `stemClass` | 审题时可点亮题干 `tx-stem-mark--*` 片段；不改变题干文本。选择器与配色见「题干高亮契约」。 |
| `answerType` / `userResponse` | 互动问步必填；group 1 禁止出现。 |

`guidanceChain[]` 条目只允许 `title`；group 1 用 `problemBrief` 快照逐步展开已知、所求与关键，其余每个 group 至少落一张卡。不同语义板书使用新的 `replaceKey` 追加，复用仅用于真实原位改写。`oral`、`choice`、`fill` 的 widget 协议与上节相同。

## 当前 figure 兼容 schema（可生产）

有图 plan 顶层使用 `layout:"left-right"`、`guidanceLayout:"interleaved"`、`figureTemplate`、`guidanceChain[]` 与 `steps[]`；例题可有 `quickQA`，练题拍照由 codegen 自动插入。每步保留短 `id`、`phase`、`group`、`agent`、`push`，并可有：

```json
{
  "figure": {
    "state": "confirmed-spec-state",
    "note": "本拍图形关系摘要",
    "actions": [{ "op": "highlight", "targets": ["confirmed-target"] }]
  }
}
```

`figure.state/actions` 只能选择 confirmed `figure-spec.json` 的状态、对象和能力；`problemBrief` 仅作为审题阶段逐步快照，不能作为常驻卡。group 1 禁止互动，之后每个 group 至少一道互动且至少一张右栏证据卡。图形 label 不使用右栏 `$...$` 管道。审题同时用 `stemClass` 点亮题干对应片段（契约见下节）。

## 题干高亮契约（figure / text 共用）

审题时点亮题干对应片段，与 `problemBrief` 快照并存；calculation profile 不使用。

**题干 mark 片段**（开场 `top` push、`class:"tx-stem"`）：
- 含片段的行改为 `{ "html": true, "text": "…" }`（无片段的行保持纯字符串）。
- 片段包裹：`<span class="tx-stem-mark" data-brief-field="known|ask|key" data-brief-line="N">…</span>`。
- `data-brief-line` 与 `problemBrief.known[]` 顺序 1 起对齐。
- **KaTeX 规则**：每个 `$…$` 对要么整体落在单个 mark span 内、要么整体在外，不得跨 span 拆开。

**审题步骤 `stemClass`**（group 1 逐拍，additive——每拍只点亮本拍新增片段）：
```json
"stemClass": [
  { "selector": "[data-brief-field='known'][data-brief-line='1']", "add": "tx-stem-mark--lit" }
]
```
- 已知/所求 → `add: "tx-stem-mark--lit"`（红）。
- 关键拍 → 对关键相关片段 `add: "tx-stem-mark--em"`（黄）。关键常无题干原词（题外洞察），此时点亮与它最相关的已红片段，叠加翻黄。
- figure profile 同时由 `figure.actions` 高亮图上对象；题干高亮与图上高亮互不替代。

## 目标 schema（尚不可生产）

```json
{
  "schemaVersion": 2,
  "problemId": "ex-01",
  "renderProfile": "calculation",
  "steps": [
    {
      "id": "form-expression",
      "source": { "stageId": "final-computation", "beatId": "form-expression" },
      "screenTitle": "把已知量列成完整算式",
      "titleOrigin": "plan-derived",
      "agent": { "type": "ask", "description": "现在把前面得到的量列成完整算式。" },
      "interaction": { "type": "fill", "prompt": "…", "answer": "…" },
      "screenEvidence": ["…"],
      "profileView": { "calculation": { "slot": "derive" } }
    }
  ]
}
```

## 字段边界

| 字段 | 含义 |
|---|---|
| `source.stageId` / `source.beatId` | 该拍来自哪个 outline 教学拍，保障可追溯 |
| `screenTitle` / `titleOrigin` | 该拍的自然完整标题及其来源 |
| `agent` | TTS 类型与逐字稿 |
| `interaction` | plan 已具体化的互动；无互动时省略 |
| `screenEvidence` | 该拍需要保留的最小屏幕证据 |
| `profileView` | 仅承载 calculation/text/figure 的呈现差异 |

同一教学拍可拆为多个 plan step，但每个 step 都必须带来源；不得新增改变教学顺序的“无来源教学拍”。`profileView` 不可反向决定教学内容、TTS 或互动是否存在。

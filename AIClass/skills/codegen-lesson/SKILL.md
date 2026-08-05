---
name: codegen-lesson
description: >-
  plan.json 审完后落地到 AIClass Course：figure + 生成模块 + action catalog。
  触发：落地课件、codegen、生成课程。
disable-model-invocation: true
---

# Skill：codegen-lesson（plan → 课件）

## 前置

- **`lesson/{id}/plan.json`** 存在且 `npm run plan:check` 已通过
- 有图题：`figure-spec.json` 已 confirmed 且 **图形 OK**
- 真源是 **`plan.json`**，不是 outline（outline 无 action / figure / push）

## 必读

- 框架课程文档：`../../../docs/production/create-course.md`
- 共享生成器：`../../../engine/tools/aiclass.mjs`
- 目标 Course：`../../../courses/{courseId}/`（先 `course:new` 再建）
- 本题 plan：[`math_syllabus/lesson/{id}/plan.json`](../../math_syllabus/lesson/)
- 本题已确认的 `lesson/{id}/figure-spec.json` 与 `figure-preview.html`（若 `figureTemplate` 非空）
- 映射细则：[mapping.md](mapping.md)
- 数学排版：[math-typesetting.md](../lesson-plan/math-typesetting.md)

## 步骤

1. 读 `plan.json`：锁定 `figureTemplate`、全部 `steps[].action`、`figure.state`、`push`；例题另读取顶层 `quickQA[]` / `quickQALayout`，练题另读取入口 `moduleNote` 的手写板说明。
2. 有图时读已确认的 `figure-spec.json`：将 `board.boundingbox`、`axis`、`grid`、`keepAspectRatio` 和 `initialState.state` 原样映射到 Figure 的默认态，逐点复用规格坐标；不得在 Figure 模块另行凭感觉改坐标或关闭已确认的网格。对 `coordinatePolicy: "show-key-coordinates"`，默认态须显示关键点坐标；`representative` 点须保持规格中的非特殊位置，不能偷换成答案或极值位置。
3. 在 `../../../courses/{courseId}/lesson/modules/` 新建：
   - `_{figureTemplate}-figure.js` — `AIClassFigureRegistry.register(figureTemplate, …)`，实现各 `state`（新图用 `JXGKit2D` / `JXGKit3D`）
   - `XX-{id}.js` — `__lessonRegisterModule`：入口进 `containers[].steps`，其余进 `sideEffects`
4. 在 `course.json.authoring.problems` 登记 Plan；figure 放 `authoredModules`
5. 在 `engine/` 运行 `lesson:generate`，由生成器统一产生模块、manifest、题号和 action catalog
6. **为本课件单独制作 debug 界面**：放 `courses/{courseId}/debug/index.html`。页面须复用根 `debug/parent-shell/` 的 CSS 与脚本；在加载共享脚本前，若 URL 没有 `src` 参数，则用 `history.replaceState` 注入本课 dist 的相对 `src` 参数。不得手写静态 action 按钮。动作列表、搜索、自动切换模块、重置、重载与回包日志一律从 `help` 动态获取，保证每门课的调试壳样式和逻辑一致。
7. 运行 `course:export`；验收时优先打开 **`courses/{courseId}/debug/index.html`**（本课专属 debug 页），根 `debug/parent-shell/index.html` 仅作通用兜底
8. 运行 `course:check` → `lesson:generate` → `course:preview`；预览验收后：
   `npm run pipeline:board -- {courseId} --complete-preview {problemId}`
9. 若本题为 **example** 且存在配对 **practice**（`afterPlanId` 指向本题），自动开始练题流程（见 production-flow）

## 映射速查

| plan | AIClass Course |
|------|-----------------|
| `steps[0]`（`*_开始`） | `containers[0].steps[0]` |
| 其余 `steps[]` | `sideEffects[]` |
| `figure.state` | `figure: { state }` |
| `push` | `push`（oral / choice / text）；`replaceKey` 原样保留 |
| `agent.description` | sideEffect `description`（TTS 逐字稿，纯中文）+ quizzes 全文 |
| `guidanceChain` | `containers[0].guidanceChain`（**仅 title，无 desc**；sideEffect **不写** guidanceDesc） |
| `guidanceLayout` | left-right 多环节固定映射为 `interleaved` |
| `moduleType + order` | 自动映射为 `例N / 练N / 作业N` |
| `source` | 顶部来源，必须是真实出处 |
| oral `attachStepId` | plan 内写题内短 id（如 `s09`）；codegen 自动前缀为 `{planId}_s09` 写入 sideEffect |
| example `quickQA[]` | 绑定当前例题模块；自动生成打开 / 显示问题 / 显示答案 action，顶部布局为 `above-body` |
| practice 入口 | codegen 自动在开始动作之后插入 `{actionPrefix}_作答_拍照`；不生成静态拍照或回显 push |

右栏累积规则：

- 板书默认**往下叠加**：每拍新增 push 用**新** `replaceKey`，前序卡保留
- `replaceKey` 仅用于真·改写同一语义槽（揭晓挂回、刻意修正）；禁止用同 key 顶掉前序 working/compute
- `textAccumulate: true` 保留不同逻辑卡；`retainPush` 仅用于保留独立互动卡

## 禁止

- 未通过 plan:check 或未 **图形 OK**（有图题）就落地
- 手写顶部题号、来源或难度 HTML
- 在课程 CSS 中重复实现共享题号头或 guidance 结构
- 只用 outline 生成模块
- action 名与 plan 不一致

## 自检

- [ ] catalog 含全部 `*_开始` 与 `*_步骤*`
- [ ] figure 覆盖 plan 出现过的每个 `state`
- [ ] Figure 默认态与 `figure-spec.initialState` 一致；关键坐标的显示策略与来源说明均已兑现
- [ ] 坐标系 Figure 的视窗、坐标轴、刻度/网格与 `figure-spec.board` 一致
- [ ] 口答/选择/算式与 plan.json 一致
- [ ] working/compute 板书往下叠（不同 `replaceKey`）；同 key 仅出现在真·改写槽
- [ ] 选择项及正文中的 LaTeX 已由 KaTeX 正常渲染，判题 value/answer 未改变
- [ ] 例题快问快答为 3–5 道本题具体数据/关系题；debug 页能依次触发打开、出题、揭晓
- [ ] 练题 action catalog 中拍照动作紧跟开始动作；`photo_result` 可回显 LaTeX 并不推进步骤
- [ ] 本地能从入口 action 走到答案
- [ ] `courses/{courseId}/debug/index.html` 存在，且能跳转本课全部 action

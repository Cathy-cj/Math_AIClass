---
name: codegen-lesson
description: >-
  plan.json 审完后落地到 AIClass Text Course：生成模块 + action catalog。
  触发：落地课件、codegen、生成课程。
disable-model-invocation: true
---

# Skill：codegen-lesson（plan → 课件）

## 前置

- **`lesson/{id}/plan.json`** 存在且 `npm run plan:check` 已通过
- 真源是 **`plan.json`**，不是 outline（outline 无 action / push）
- 本仓仅接受 `layout: "text-only"`，且禁止 `figureTemplate` 与 `steps[].figure`

## 必读

- 框架课程文档：`../../../docs/production/create-course.md`
- 共享生成器：`../../../engine/tools/aiclass.mjs`
- 目标 Course：`../../../courses/{courseId}/`（先 `course:new` 再建）
- 本题 plan：[`math_syllabus/lesson/{id}/plan.json`](../../math_syllabus/lesson/)
- 映射细则：[mapping.md](mapping.md)
- 数学排版：[math-typesetting.md](../lesson-plan/math-typesetting.md)

## 步骤

1. 读 `plan.json`：锁定全部 `steps[].action` 与 `push`；例题另读取顶层 `quickQA[]` / `quickQALayout`。
2. 在 `../../../courses/{courseId}/lesson/modules/` 生成 `XX-{id}.js`：入口进 `containers[].steps`，其余进 `sideEffects`。
3. 在 `course.json.authoring.problems` 登记 Plan。
4. 在 `engine/` 运行 `lesson:generate`，由生成器统一产生模块、manifest、题号和 action catalog
6. **为本课件单独制作 debug 界面**：放 `courses/{courseId}/debug/index.html`。由 `lesson:generate` / `course:new` 从 `engine/templates/lesson-runtime/debug/parent-shell/` 同步；默认 iframe 指向本课 `engine/dist/{courseId}/index.html`。不得手写静态 action 按钮。动作列表、搜索、自动切换模块、重置、重载与回包日志一律从 `help` 动态获取。**不使用**仓库根目录 `debug/`。
7. 运行 `course:export`；验收时打开 **`courses/{courseId}/debug/index.html`**
8. 运行 `course:check` → `lesson:generate` → `course:preview`；预览验收后：
   `npm run pipeline:board -- {courseId} --complete-preview {problemId}`
9. 若本题为 **example** 且存在配对 **practice**（`afterPlanId` 指向本题），自动开始练题流程（见 production-flow）

## 映射速查

| plan | AIClass Course |
|------|-----------------|
| `steps[0]`（`*_开始`） | `containers[0].steps[0]` |
| 其余 `steps[]` | `sideEffects[]` |
| `push` | `push`（oral / choice / text）；`replaceKey` 原样保留 |
| `agent.description` | sideEffect `description`（TTS 逐字稿，纯中文）+ quizzes 全文 |
| `guidanceChain` | `containers[0].guidanceChain`（**仅 title，无 desc**；sideEffect **不写** guidanceDesc） |
| `guidanceLayout` | text-only 默认 `interleaved`（有引导链时） |
| `moduleType + order` | 自动映射为 `例N / 练N / 作业N` |
| `source` | 顶部来源，必须是真实出处 |
| oral `attachStepId` | plan 内写题内短 id（如 `s09`）；codegen 自动前缀为 `{planId}_s09` 写入 sideEffect |
| example `quickQA[]` | 绑定当前例题模块；自动生成打开 / 显示问题 / 显示答案 action，顶部布局为 `above-body` |

右栏累积规则：

- 板书默认**往下叠加**：每拍新增 push 用**新** `replaceKey`，前序卡保留
- `replaceKey` 仅用于真·改写同一语义槽（揭晓挂回、刻意修正）；禁止用同 key 顶掉前序 working/compute
- `textAccumulate: true` 保留不同逻辑卡；`retainPush` 仅用于保留独立互动卡

## 禁止

- 未通过 plan:check 就落地
- 写入图形字段或图形模块
- 手写顶部题号、来源或难度 HTML
- 在课程 CSS 中重复实现共享题号头或 guidance 结构
- 只用 outline 生成模块
- action 名与 plan 不一致

## 自检

- [ ] catalog 含全部 `*_开始` 与 `*_步骤*`
- [ ] 口答/选择/算式与 plan.json 一致
- [ ] working/compute 板书往下叠（不同 `replaceKey`）；同 key 仅出现在真·改写槽
- [ ] 选择项及正文中的 LaTeX 已由 KaTeX 正常渲染，判题 value/answer 未改变
- [ ] 例题快问快答为 3–5 道本题具体数据/关系题；debug 页能依次触发打开、出题、揭晓
- [ ] 本地能从入口 action 走到答案
- [ ] `courses/{courseId}/debug/index.html` 存在，且能跳转本课全部 action

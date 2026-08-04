---
name: codegen-lesson
description: >-
  plan.json 审完后落地到 AIClass Calculation Course：生成 top-split 模块 + action catalog + 课内 debug。
  触发：落地课件、codegen、生成课程。
disable-model-invocation: true
---

# Skill：codegen-lesson（plan → 课件）

## 前置

- **`lesson/{id}/plan.json`** 存在且 `npm run plan:check` 已通过
- 本仓仅接受 `layout: "top-split"`，禁止 `figureTemplate` 与 `steps[].figure`
- 真源是 **`plan.json`**，不是 outline

## 必读

- 框架课程文档：`../../../docs/production/create-course.md`
- 共享生成器：`../../../engine/tools/aiclass.mjs`
- 目标 Course：`../../../courses/{courseId}/`
- 本题 plan：[`math_syllabus/lesson/{id}/plan.json`](../../math_syllabus/lesson/)
- 映射细则：[mapping.md](mapping.md)
- 呈现契约：[calculation-marks.md](../lesson-plan/calculation-marks.md)、[calc-engine-layout.md](../lesson-plan/calc-engine-layout.md)
- 数学排版：[math-typesetting.md](../lesson-plan/math-typesetting.md)

## 步骤

1. 读 `plan.json`：锁定全部 `steps[].action`、`push`（`region`/`class`）、`retainPush` 需求；例题读 `quickQA[]`
2. 在 `courses/{courseId}/lesson/modules/` 生成 `XX-{id}.js`：`__lessonRegisterModule`，入口进 `containers[].steps`，其余进 `sideEffects`；**不生成** `_*-figure.js`
3. 容器：`layout: "top-split"`，`guidanceLayout: "stacked"`，`splitMinHeight: 420`；题干 `region:"top"`；要点/详解/答案按 calculation-marks
4. 在 `course.json.authoring.problems` 登记 Plan
5. 在 `engine/` 运行 `lesson:generate`
6. **为本课件单独制作 debug 界面**：`courses/{courseId}/debug/index.html`（复用根 `debug/parent-shell/` 逻辑）
7. `course:check` → `lesson:generate` → `course:preview`；预览按 [calc-engine-layout.md](../lesson-plan/calc-engine-layout.md) **previewOk 清单**验收（top-split 分栏、右钉、公式 fit、底缘不裁切），通过后：
   `npm run pipeline:board -- {courseId} --complete-preview {problemId}`
8. 例题 previewOk 且有配对练题 → 自动开始练题流程

## 映射速查

| plan | Course |
|------|--------|
| `steps[0]`（`*_开始`） | `containers[0].steps[0]` |
| 其余 `steps[]` | `sideEffects[]` |
| `push` | 原样（含 `region`/`class`/`.calc-*`） |
| 详解累加 | sideEffect `retainPush` 保右栏钉 + 左栏前序行 |
| `agent.description` | sideEffect `description`（TTS） |
| example `quickQA[]` | 绑定例题模块；自动生成打开/出题/揭晓 action |

## 禁止

- 未通过 plan:check 就落地
- 写入图形字段或图形模块
- 手写顶部题号 HTML
- 只用 outline 生成模块
- 在课级 CSS 重写 `.calc-*`（改 `engine/src/styles/calc-explain.css`）
- 为某一题在 plan/module 里手工 `\\` 换行或额外 region 修补引擎布局（改引擎 + 本 SOP）

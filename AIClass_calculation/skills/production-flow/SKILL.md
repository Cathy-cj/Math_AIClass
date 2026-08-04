---
name: production-flow
description: >-
  纯计算题课件制作全流程导航：看板 → 大纲 → 讲法 → 编排 → 落地 → 生成预览。
  触发：贴题、不清楚流程、制作流程、出大纲、填充 plan、落地课件、generate-lesson。
  不要一次写满 plan 或整课。
---

# Skill：production-flow（流程导航）

本仓只制作**纯计算题**（方程/算式演算等）；同一题内可连续自动推进，**不设图形人工门禁**。一次只服务一门课（一个 `courseId`）。

口播/TTS/句库契约来自 AIClass 提炼（[reference.md](../lesson-plan/reference.md)、[phrase-bank](../lesson-plan/phrase-bank.md)）；**屏幕上屏**以 [calc-teaching-spine.md](../lesson-plan/calc-teaching-spine.md) + [calculation-marks.md](../lesson-plan/calculation-marks.md) 为准；**引擎布局与公式 fit** 以 [calc-engine-layout.md](../lesson-plan/calc-engine-layout.md) 为准（对齐 module_template）。

## 状态机

```text
board → outline → plan → arrange → codegen → check/generate/preview → (export optional)
```

总览：[docs/production/README.md](../../docs/production/README.md)。

**全流程 AI 只产出 json**（`outline.json` / `plan.json`）；`outline:export` / `plan:export` 仅供人工自愿导 md，不是流程步骤。

## MD 输入命名（贴 md 时最先做）

用户给出 `.md` 文件路径（或明确「这份 md 就是本课输入」）时，**先**按 [naming-from-md.md](../lesson-plan/naming-from-md.md) 定名，再进入看板/出大纲：

1. **`courseId`** = md 文件名去掉 `.md`（例：`sum-6-21-5star.md` → `sum-6-21-5star` → `courses/sum-6-21-5star/`）
2. **单题 md**：`lesson/{id}/` 的 `id` 与 `courseId` 相同
3. **多题 md**（同一文件多组例/练）：courseId 仍用 md 基名；每道题 `lesson/{id}` 追加 `-ex1/-pr1/…`（见 naming-from-md）
4. **仅粘贴正文、无路径**：向用户确认文件名/slug，禁止自造 courseId

## 第零步：看板（已有课时）

若已有 `courseId`，先说 **「看板」** → [course-pipeline](../course-pipeline/SKILL.md)。

## 第一步：出大纲（备课）

贴题后说 **「出大纲」** → [lesson-outline](../lesson-outline/SKILL.md)

大纲 = 备课：开场定位、切入点、推导环节链、互动题设计、收尾拼装（见 [teaching-design.md](../lesson-outline/teaching-design.md) 方法论）。**fill 阶段必须按 [calc-teaching-spine.md](../lesson-plan/calc-teaching-spine.md) 折叠上屏**，禁止把 outline 每个环节 1:1 变成独立 action。
禁止 `figureTemplate`。`plan:check` 通过后自动设 `outlineStatus: approved` 并写入 `outlineOk`；**不等人审**。

## 第二步：填充讲法

大纲就绪后自动进入 [fill-lesson-plan](../fill-lesson-plan/SKILL.md)

呈现遵循 [calc-teaching-spine.md](../lesson-plan/calc-teaching-spine.md) + [calculation-marks.md](../lesson-plan/calculation-marks.md)（module_template 四段：要点→详解_起钉右→详解步→答案）。
`plan:check` 通过后自动写入 `planOk`。用户事后要改 → [revise-lesson-plan](../revise-lesson-plan/SKILL.md)。

## 第三步：建课 / 编排

尚无课壳或要改 `course.json` → [course-arrange](../course-arrange/SKILL.md)（可与 codegen 链式执行）。

标准教学单元：**例题（可含顶部快问快答）→ 练题**。

制作时按题逐一完成：例题走完大纲 → 讲法 → 落地 → check/generate/preview；**例题预览验收通过后自动开始配对练题**。

## 第四步：落地课件

`plan.json` 就绪 → 自动 [codegen-lesson](../codegen-lesson/SKILL.md)

落地时**必须**为本课件单独制作 debug 界面，放 `courses/<courseId>/debug/`。

## 第五步：校验 · 生成 · 预览

在 `engine/`：

```bash
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>
npm run pipeline:board -- <courseId> --complete-preview <problemId>
```

预览验收后写 `previewOk`；例题 `previewOk` 后看板自动 focus 配对练题。

**previewOk 须按 [calc-engine-layout.md](../lesson-plan/calc-engine-layout.md) 清单验收**（top-split 分栏、右栏钉、公式 fit 优先级、左栏底缘不裁切、HTTP 预览 + export 强刷）。

可选：`npm run course:export -- <courseId> --zip`。

## 禁止

- 一次生成完整 plan + 整课模块（跨多题时仍按例题→练题顺序）
- 写入图形字段、图形模块，或引入 `figureOk` 门禁
- 在本 Skill 内复制执行层长规范

## 命令速查

内容侧（`math_syllabus/`）：

```bash
npm run plan:check   # 结构、屏幕极简与符号、TTS 逐字稿、槽位覆盖、口播多样性
```

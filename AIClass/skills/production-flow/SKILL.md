---
name: production-flow
description: >-
  课件制作全流程导航：看板 → 大纲 → 图形 → 讲法 → 编排 → 落地 → 生成预览。
  触发：贴题、不清楚流程、制作流程、出大纲、填充 plan、落地课件、generate-lesson。
  不要一次写满 plan 或整课。
---

# Skill：production-flow（流程导航）

**同一题内可连续自动推进**；**唯一人工停点**为有图题的实画预览（`figure-preview.html` → **图形 OK**）。一次只服务一门课（一个 `courseId`）。

## 状态机

```text
board → outline → (figure if needsFigure) → plan → arrange → codegen → check/generate/preview → (export optional)
         ↑___________________________ 仅图形 OK 处等人审 ___________________________↑
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

大纲 = 备课：开场定位、切入点、推导环节链、互动题设计、收尾拼装（见 [teaching-design.md](../lesson-outline/teaching-design.md)）。
`plan:check` 通过后自动设 `outlineStatus: approved` 并写入 `outlineOk`；**不等人审**，对话可附摘要供事后查阅。

## 第二步：图形确认（有图时 — 唯一人工停点）

需要配图时 → [figure-space-clarify](../figure-space-clarify/SKILL.md) → 用户看过 `figure-preview.html` 后明确说 **「图形 OK」**（或「按这个画」）。单独的「嗯/好」不算。

## 第三步：填充讲法

大纲就绪且（无图或图形 OK）→ 自动进入 [fill-lesson-plan](../fill-lesson-plan/SKILL.md)

`plan:check` 通过后自动写入 `planOk`；**不等讲法 OK**。用户事后要改 → [revise-lesson-plan](../revise-lesson-plan/SKILL.md)。

## 第四步：建课 / 编排

尚无课壳或要改 `course.json` → [course-arrange](../course-arrange/SKILL.md)（可与 codegen 链式执行，编排完不停）。

标准教学单元：**例题（含顶部快问快答）→ 练题（先手写，再讲解）**。快问快答绑定例题 plan，不单独登记为 problem。

制作时按题逐一完成：例题依次走完大纲 → 图形（如需要）→ 讲法 → 落地 → check/generate/preview 验收；**例题预览验收通过后自动开始配对练题**。不得先把同一单元的例题与练题同时写完大纲或 plan。

## 第五步：落地课件

`plan.json` 就绪 → 自动 [codegen-lesson](../codegen-lesson/SKILL.md)

落地时**必须**为本课件单独制作 debug 界面，放 `courses/<courseId>/debug/`（规则见 codegen-lesson）。

## 第六步：校验 · 生成 · 预览

在 `engine/`：

```bash
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>
npm run pipeline:board -- <courseId> --complete-preview <problemId>
```

预览验收后写 `previewOk`；例题 `previewOk` 后看板自动 focus 配对练题。

可选：`npm run course:export -- <courseId> --zip`。

## 禁止

- 一次生成完整 plan + 整课模块（跨多题时仍按例题→练题顺序）
- 跳过 **图形 OK** 直接当有图定稿
- 在本 Skill 内复制执行层长规范

## 命令速查

内容侧（`math_syllabus/`）：

```bash
npm run plan:check   # 唯一必跑的内容检查（结构、屏幕极简与符号、TTS 逐字稿、槽位覆盖、口播多样性）
```

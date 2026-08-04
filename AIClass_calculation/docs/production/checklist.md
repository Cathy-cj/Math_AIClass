# 制作检查清单

按阶段勾选。**一次只推进一门课**。先看 `courses/<id>/pipeline.md` 或对话「看板」（[`course-pipeline`](../../skills/course-pipeline/SKILL.md)）。

主路径：**看板 → ① → ④**（可选导出）。导航见 [`production-flow`](../../skills/production-flow/SKILL.md)。

## 看板

- [ ] 已打开 / 刷新本课 `pipeline.md`
- [ ] 当前 `problemId` 明确

## ① 大纲

- [ ] 只服务这一门课所需题目
- [ ] 稳定 `problemId`（`math_syllabus/lesson/{id}/`）
- [ ] `outline.json` 落盘且 `npm run plan:check` 通过（auto `outlineOk`）
- [ ] 无 `figureTemplate`；布局意向为 `top-split`

## ② 讲法

- [ ] `plan.json` 落盘且 `npm run plan:check` 通过（auto `planOk`）
- [ ] 口播符合 TTS 契约（自 AIClass）
- [ ] 呈现符合 [calculation-marks.md](../../skills/lesson-plan/calculation-marks.md)（要点 vs 详解、`.calc-*`）

## ③ 编排这一门课

- [ ] 唯一 `courseId`；已有 `courses/<courseId>/`
- [ ] `engine/workspace.local.json` 已指向 authoring 根
- [ ] `problemId` / `order` / `actionPrefix` 唯一
- [ ] 无 figure 模块；`layout: top-split`
- [ ] `npm run pipeline:board -- <courseId> --sync` 已对齐题目列表

权威步骤：[create-course.md](./create-course.md)

## ④ 校验 · 生成 · 预览（在 `engine/`）

- [ ] `course:check` / `lesson:generate` / `course:preview` 通过
- [ ] `--complete-preview <problemId>` 已写入 `previewOk`
- [ ] 开场不见完整详解与答案；要点无多行化简

## 可选导出

- [ ] `course:export --zip`（需要时）

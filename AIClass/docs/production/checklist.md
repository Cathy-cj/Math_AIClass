# 制作检查清单

按阶段勾选。**一次只推进一门课**。先看 `courses/<id>/pipeline.md` 或对话「看板」（[`course-pipeline`](../../skills/course-pipeline/SKILL.md)）。

主路径：**看板 → ① → ④**（可选导出）。不含 Tag / Release。导航见 [`production-flow`](../../skills/production-flow/SKILL.md)。

## 看板

- [ ] 已打开 / 刷新本课 `pipeline.md`
- [ ] 当前 `problemId` 明确

## ① 大纲

- [ ] 只服务这一门课所需题目
- [ ] 稳定 `problemId`（`math_syllabus/lesson/{id}/`）
- [ ] `outline.json` 落盘且 `npm run plan:check` 通过（auto `outlineOk`）

## 图形（有图时 — 唯一人工停点）

- [ ] 已打开 `figure-preview.html` 审图
- [ ] 已说 **图形 OK**（写入 `figureOk`）

## ② 讲法

- [ ] `plan.json` 落盘且 `npm run plan:check` 通过（auto `planOk`）

## ③ 编排这一门课

- [ ] 唯一 `courseId`；已有 `courses/<courseId>/`
- [ ] `engine/workspace.local.json` 已指向 authoring 根
- [ ] `problemId` / `order` / `actionPrefix` 唯一
- [ ] Figure 在 `lesson/modules/` 并登记 `authoredModules`
- [ ] `npm run pipeline:board -- <courseId> --sync` 已对齐题目列表

权威步骤：[create-course.md](./create-course.md)

## ④ 校验 · 生成 · 预览（在 `engine/`）

- [ ] `course:check` / `lesson:generate` / `course:preview` 通过
- [ ] `--complete-preview <problemId>` 已写入 `previewOk`
- [ ] 例题 previewOk 后自动开始配对练题
- [ ] 各题可独立开讲；未手改 `.generated/` 当真源
- [ ] 离线 LaTeX / 交互抽测

## （可选）导出

- [ ] `course:export -- <id> --zip`；`dist/<grade>/<id>/index.html` 可双击；vendor（含 JSXGraph）可用

## 暂缓

PR / tag / Release：[`engine/docs/archive/versioning-and-release.md`](../../engine/docs/archive/versioning-and-release.md)

# 课程制作流程（Playbook）

跨包端到端编排入口（**L0 索引**）。本仓只做**纯计算题**。

## 从这里开始：制作看板

**先看进度，再改真源。**

1. 对话说 **「看板」**（SOP：[`course-pipeline`](../../skills/course-pipeline/SKILL.md)），或  
2. 打开 `courses/<courseId>/pipeline.md`，或  
3. 在 `engine/` 运行：`npm run pipeline:board -- <courseId>`

**无图形人工门禁。** `outlineOk` / `planOk` / `previewOk` 由 AI 在 check/preview 通过后自动写入。

| 层 | 角色 | 位置 |
|----|------|------|
| L0 | 跨包怎么走 + 门禁 | 本目录 |
| L1 | Agent SOP 真源（工具中性） | [`skills/`](../../skills/README.md) · [`AGENTS.md`](../../AGENTS.md) |
| L2 | 薄入口 | 各包 `README.md` |

## 当前约定

1. **一次只推进一门课**（一个 `courseId`）。
2. **MD 输入时** `courseId` = md 文件名去 `.md`（见 [`naming-from-md.md`](../../skills/lesson-plan/naming-from-md.md)）；单题 md 时 `lesson/{id}` 与 courseId 相同。
3. **主路径止于校验 · 生成 · 预览**（可选 `course:export`）。
4. **呈现**：`layout: top-split` + `.calc-*`（见 [calculation-marks.md](../../skills/lesson-plan/calculation-marks.md)）；**运行时布局与公式排版**见 [calc-engine-layout.md](../../skills/lesson-plan/calc-engine-layout.md)（plan 不写 `\\` 换行或课级 CSS 补丁）。
5. **口播**：TTS 契约与 phrase-bank 自 AIClass 提炼（见 [reference.md](../../skills/lesson-plan/reference.md)）。
6. **同一题内 AI 自动链式推进**；例题 preview 验收通过后自动开始配对练题。

## 文档权威

| 范围 | 权威文档 |
|------|----------|
| **制作看板** | [`course-pipeline`](../../skills/course-pipeline/SKILL.md) |
| **流程导航** | [`production-flow`](../../skills/production-flow/SKILL.md) |
| 计算呈现 | [`calculation-marks.md`](../../skills/lesson-plan/calculation-marks.md) + [`calc-teaching-spine.md`](../../skills/lesson-plan/calc-teaching-spine.md) |
| **引擎布局 / 预览验收** | [`calc-engine-layout.md`](../../skills/lesson-plan/calc-engine-layout.md) |
| 内容：大纲 → 讲法 | [`math_syllabus/README.md`](../../math_syllabus/README.md) |
| Agent SOP 地图 | [`skills/README.md`](../../skills/README.md) |
| 新建课编排 | [create-course.md](./create-course.md) · [`course-arrange`](../../skills/course-arrange/SKILL.md) |
| 引擎命令 | [`engine/docs/commands.md`](../../engine/docs/commands.md) |

## 状态机

```text
board → outline → plan → arrange → codegen → check/generate/preview → (export optional)
```

## 双源

| 源 | 用途 |
|----|------|
| AIClass | 架构、流水线 skills、口播 |
| module_template | 计算样式与讲法骨架模板 |

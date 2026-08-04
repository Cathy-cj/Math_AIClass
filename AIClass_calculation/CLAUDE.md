# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

**`AGENTS.md` is the tool-neutral agent entry point; `skills/` is the SOP source of truth.** This file is only a map — SOP bodies live under `skills/` and must be edited there.

For any course-production request, load the relevant skill first:

- `skills/production-flow/SKILL.md` — full flow navigator（**auto-advance per problem**；无图形门禁）
- `skills/course-pipeline/SKILL.md` — board/gates
- `skills/lesson-outline/` — outline = 备课；`teaching-design.md` 自 AIClass
- `skills/fill-lesson-plan/` → `skills/revise-lesson-plan/` → `skills/codegen-lesson/`
- `skills/lesson-plan/calc-teaching-spine.md` — **上屏骨架**（对齐 module_template）
- `skills/lesson-plan/calculation-marks.md` — `.calc-*` 类名与 retainPush
- `skills/lesson-plan/calc-engine-layout.md` — **引擎布局 / 公式 fit / 左栏滚动 / previewOk**（全课组件契约）
- `skills/lesson-plan/` — schema、phrase-bank（口播自 AIClass）、math typesetting

## Commands

Content side（`math_syllabus/`）：

```bash
npm run plan:check
```

Engine side（`engine/`）：

```bash
npm run course:new -- <courseId> "标题"
npm run pipeline:board -- <courseId>
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>
npm run course:export -- <courseId> --zip
npm test
```

## Architecture

```text
math_syllabus/lesson/{id}/  →  courses/{courseId}/  ←  engine/
outline.json / plan.json       course.json + modules     top-split runtime + calc CSS
```

State machine：`board → outline → plan → arrange → codegen → check/generate/preview`

## Repo rules

- Edit SOP bodies only under `skills/`.
- Lesson content lives in `math_syllabus/lesson/{id}/`.
- All work happens on branch `dev`.
- 本仓只做纯计算题；勿引入 figure 字段或 `figureOk`。

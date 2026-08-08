# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

**`AGENTS.md` is the tool-neutral agent entry point; `skills/` is the SOP source of truth.** This file is only a map — SOP bodies live under `skills/` and must be edited there.

For any course-production request, load root `../skills/README.md` first. For calculation courses read outline/calculation → plan/calculation → make/calculation-runtime.

## Commands

Content side（在 monorepo 根目录）：

```bash
npm run content:check:calculation
```

Engine side（`engine/`）：

```bash
npm run course:new -- <courseId> "标题"
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>
npm run course:export -- <courseId> --zip
npm test
```

## Architecture

```text
_output_/{grade}/{courseId}/  ←  engine/
course.json + {problemId}/outline·plan + debug/   top-split runtime + calc CSS
```

State machine：`course:new → outline → plan → arrange → codegen → check/generate/preview`

## Repo rules

- Edit SOP bodies only under `skills/`.
- Lesson content lives in `_output_/{grade}/{courseId}/{problemId}/`; `dist/` 不是内容真源。
- All work happens on branch `skills` (user convention for this fork).
- 本仓只做纯计算题；勿引入 figure 字段。

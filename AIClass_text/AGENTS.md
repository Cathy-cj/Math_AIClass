# Agent instructions (AIClass Text)

This monorepo’s **tool-neutral** SOP for any coding agent (Cursor, Claude Code, Codex, Windsurf, etc.).

## Always start here

1. Read [`../skills/README.md`](../skills/README.md) and select the text combination: `outline/common.md` → `outline/reasoning-problem.md` → `outline/phase-routing.md`; `plan/common/*` → `plan/text/*`; `make/common.md` → `make/text-runtime.md`.
2. The repository-local `skills/` directory has been removed; root [`../skills/README.md`](../skills/README.md) is the only SOP source.
3. For the current engine, keep using its existing `plan:check`、`course:check`、`lesson:generate`、`course:preview` and `course:export` commands; root skills describe the rules, not replacement commands.

## Packages

| Path | Role |
|------|------|
| `_output_/` | Per-course source of truth: course.json registry + outline / plan / debug / .generated |
| `engine/` | Text-only runtime, templates, CLI, KaTeX vendor |
| `../skills/` | **Text 试点的 SOP 真源**（按阶段组织的共用与 profile 规则） |

## Rules

- Do **not** invent alternate SOP trees under product folders (`.cursor`, `.claude`, etc.).
- 共用或 text SOP 正文只编辑 `../skills/`；本仓不再保留 `skills/` 目录。
- Lesson content lives in `_output_/{grade}/{courseId}/{problemId}/`; never treat `.generated/` or `dist/` as source of truth.
- One `courseId` at a time. This repository is only for **纯文字题**; pure-calculation and figure-based courses belong to their own repositories. Preview acceptance is tracked in conversation.

# Agent instructions (AIClass Text)

This monorepo’s **tool-neutral** SOP for any coding agent (Cursor, Claude Code, Codex, Windsurf, etc.).

## Always start here

1. Read [`skills/README.md`](skills/README.md) for the skill map.
2. For end-to-end course production, follow [`skills/production-flow/SKILL.md`](skills/production-flow/SKILL.md) — **auto-advance per problem** with no figure-review gate.
3. Progress / gates: [`skills/course-pipeline/SKILL.md`](skills/course-pipeline/SKILL.md).
4. Human playbook index: [`docs/production/README.md`](docs/production/README.md).

## Packages

| Path | Role |
|------|------|
| `math_syllabus/` | Per-problem outline / plan JSON + review MD |
| `courses/` | Courseware sources (`course.json`, modules) |
| `engine/` | Text-only runtime, templates, CLI, KaTeX vendor |
| `skills/` | **SOP source of truth** (orchestration + authoring) |
| `docs/production/` | Human L0 playbook |

## Rules

- Do **not** invent alternate SOP trees under product folders (`.cursor`, `.claude`, etc.).
- Edit SOP bodies only under `skills/`.
- Lesson content lives in `math_syllabus/lesson/{id}/`; never treat `.generated/` as source of truth.
- One `courseId` at a time. This repository is only for **纯文字题**; pure-calculation and figure-based courses belong to their own repositories. `outlineOk` / `planOk` / `previewOk` are auto-written after check/preview.

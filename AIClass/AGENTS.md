# Agent instructions (AIClass)

This monorepo’s **tool-neutral** SOP for any coding agent (Cursor, Claude Code, Codex, Windsurf, etc.).

## Always start here

1. Read [`../skills/README.md`](../skills/README.md) and select the figure combination: `outline/common.md` → `outline/reasoning-problem.md` → `outline/phase-routing.md` → `outline/figure-addon.md`; `figure/SKILL.md` → `specification.md`; `plan/common/*` → `plan/figure/*`; `make/common.md` → `make/figure-runtime.md`.
2. The repository-local `skills/` directory has been removed; root [`../skills/README.md`](../skills/README.md) is the only SOP source.
3. For the current engine, keep using its existing `plan:check`、`figure:preview`、`course:check`、`lesson:generate`、`course:preview` and `course:export` commands; root skills describe the rules, not replacement commands.

## Packages

| Path | Role |
|------|------|
| `_output_/` | Per-course source of truth: course.json registry + outline / plan / figure preview / debug / .generated |
| `engine/` | Runtime, templates, CLI, vendor |
| `../skills/` | **Figure 试点的 SOP 真源**（按阶段组织的共用与 profile 规则） |

## Rules

- Do **not** invent alternate SOP trees under product folders (`.cursor`, `.claude`, etc.).
- 共用或 figure SOP 正文只编辑 `../skills/`；本仓不再保留 `skills/` 目录。
- Lesson content lives in `_output_/{grade}/{courseId}/{problemId}/`; never treat `.generated/` or `dist/` as source of truth.
- One `courseId` at a time. **Human figure approval (图形 OK)** is recorded as `figure-spec.json` `status: "confirmed"` (有图题); preview acceptance is tracked in conversation.

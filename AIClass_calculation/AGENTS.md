# Agent instructions (AIClass Calculation)

This monorepo’s **tool-neutral** SOP for any coding agent (Cursor, Claude Code, Codex, Windsurf, etc.).

## Always start here

1. Read [`../skills/README.md`](../skills/README.md) and select the calculation combination: `outline/common.md` → `outline/naming.md` → `outline/calculation.md`; `plan/common/*` → `plan/calculation/*`; `make/common.md` → `make/calculation-runtime.md`.
2. The repository-local `skills/` directory has been removed; root [`../skills/README.md`](../skills/README.md) is the only SOP source.
3. For the current engine, keep using its existing `plan:check`、`course:check`、`lesson:generate`、`course:preview` and `course:export` commands; root skills describe the rules, not replacement commands.

## Packages

| Path | Role |
|------|------|
| `_output_/` | Per-course source of truth: course.json registry + outline / plan / debug / .generated |
| `engine/` | Calculation runtime（`top-split` + `.calc-*`）、templates、CLI、KaTeX |
| `../skills/` | **Calculation 试点的 SOP 真源**（按阶段组织的共用与 profile 规则） |

## Dual sources (do not mix up)

| Source | What we took |
|--------|----------------|
| AIClass（有图生产仓） | 包架构、流水线 skills、**口播 TTS / phrase-bank / teaching-design** |
| module_template | 计算呈现模板 → [calc-teaching-spine.md](skills/plan/calculation/plan.md) + [calculation-marks.md](skills/plan/calculation/presentation.md) + [calc-engine-layout.md](skills/plan/calculation/preview.md) + `engine/src/styles/calc-explain.css` |

## Rules

- Do **not** invent alternate SOP trees under product folders (`.cursor`, `.claude`, etc.).
- 共用或 calculation SOP 正文只编辑 `../skills/`；本仓不再保留 `skills/` 目录。
- Lesson content lives in `_output_/{grade}/{courseId}/{problemId}/`; never treat `.generated/` or `dist/` as source of truth.
- One `courseId` at a time. This repository is only for **纯计算题**; 纯文字题与有图题各归独立仓库。Preview acceptance is tracked in conversation.

# Agent instructions (AIClass Calculation)

This monorepo’s **tool-neutral** SOP for any coding agent (Cursor, Claude Code, Codex, Windsurf, etc.).

## Always start here

1. Read [`skills/README.md`](skills/README.md) for the skill map.
2. For course production, **screen layout** follows [`skills/lesson-plan/calc-teaching-spine.md`](skills/lesson-plan/calc-teaching-spine.md) (module_template golden); **runtime layout / formula fit / scroll** follows [`skills/lesson-plan/calc-engine-layout.md`](skills/lesson-plan/calc-engine-layout.md); **oral/TTS** follows teaching-design + phrase-bank.
3. For end-to-end course production, follow [`skills/production-flow/SKILL.md`](skills/production-flow/SKILL.md) — **auto-advance per problem** with no figure-review gate.
4. Progress / gates: [`skills/course-pipeline/SKILL.md`](skills/course-pipeline/SKILL.md).
5. Human playbook index: [`docs/production/README.md`](docs/production/README.md).

## Packages

| Path | Role |
|------|------|
| `math_syllabus/` | Per-problem outline / plan JSON |
| `courses/` | Courseware sources (`course.json`, modules) |
| `engine/` | Calculation runtime（`top-split` + `.calc-*`）、templates、CLI、KaTeX |
| `skills/` | **SOP source of truth**（编排 + 写题细则） |
| `docs/production/` | Human L0 playbook |

## Dual sources (do not mix up)

| Source | What we took |
|--------|----------------|
| AIClass（有图生产仓） | 包架构、流水线 skills、**口播 TTS / phrase-bank / teaching-design** |
| module_template | 计算呈现模板 → [calc-teaching-spine.md](skills/lesson-plan/calc-teaching-spine.md) + [calculation-marks.md](skills/lesson-plan/calculation-marks.md) + [calc-engine-layout.md](skills/lesson-plan/calc-engine-layout.md) + `engine/src/styles/calc-explain.css` |

## Rules

- Do **not** invent alternate SOP trees under product folders (`.cursor`, `.claude`, etc.).
- Edit SOP bodies only under `skills/`.
- Lesson content lives in `math_syllabus/lesson/{id}/`; never treat `.generated/` as source of truth.
- One `courseId` at a time. This repository is only for **纯计算题**; 纯文字题与有图题各归独立仓库。`outlineOk` / `planOk` / `previewOk` are auto-written after check/preview.

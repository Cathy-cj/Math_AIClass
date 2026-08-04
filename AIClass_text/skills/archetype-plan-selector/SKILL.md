---
name: archetype-plan-selector
description: >-
  参考-only：从 engine/references 选 archetype 作 outline 结构设计启发。
  **不得**用于 AIClass 正式课件主流程（不能替代 outline → 门禁 → fill）。
  触发：仅在外部规划任务中需要 recipe 结构参考时使用。
referenceOnly: true
sentinel: REFERENCE_ONLY_DO_NOT_COPY
---
# Archetype Plan Selector

## AIClass 正式课件边界

**本 skill 不参与 AIClass Text 课件生产主流程。** 正式课程必须走 [production-flow](../production-flow/SKILL.md)：`lesson-outline` → `fill-lesson-plan` → codegen。`math_syllabus/lesson/{id}/outline.json` 与 `plan.json` 是唯一内容真源。

本 skill 仅用于**外部**规划任务：读 `engine/references/**` 获取 archetype 结构启发，**不得**直接产出并落地 plan.json。

## Boundary

`engine/references/**` is a planning-only control layer. It is excluded from runtime packages. Only this planning workflow may read it; codegen, render, build, and packaging steps must not read, import, embed, copy, or glob `engine/references/**`.

## Workflow

1. Parse the current task directly. Record its asks, givens, constraints, dependencies, and required output.
2. Read `engine/references/reference-index.json` only to choose one primary archetype:
   - `direct-formula`: one governing relation and a single target.
   - `composite-split`: a whole must be partitioned and recombined.
   - `pattern-cycle`: a repeating state must be proved and indexed.
   - `multi-question`: two or more explicit asks need dependency management.
3. If signals overlap, choose the archetype controlling the top-level Plan. Use another recipe only as a named substructure; do not merge samples mechanically.
4. Read only the selected recipe under `engine/references/recipes/<archetype>/` (`expected-structure.json` and, if needed, `outline.sample.json`, `plan.sample.json`, `notes.md`, and `anti-patterns.md`).
5. Close the references conceptually, then generate the current Plan from the current task. Recreate identifiers, ordering, wording, visuals, reasoning, and field values. Samples supply constraints and shape only.
6. Validate the Plan against `expected-structure.json` and the current task. Remove any sample placeholder, sentence fragment, invented datum, or sentinel value.
7. Hand only the generated current Plan to downstream codegen. Do not pass reference paths or reference contents.

## Non-copy rule

Never copy or lightly paraphrase reference prose, sample values, labels, question counts, step counts, narration, or visual instructions. Structural similarity required by `expected-structure.json` is allowed; textual reuse is not.

If the current task lacks enough information, keep a clearly named current-task placeholder and request the missing fact. Never fill a gap with material from `engine/references/**`.

## Leakage gate

Before handoff, confirm:

- The output contains neither `REFERENCE_ONLY_DO_NOT_COPY` nor `referenceOnly`.
- The output contains no path under `engine/references/`.
- Every datum and mathematical claim is traceable to the current task or fresh derivation.
- Runtime manifests and codegen inputs exclude `engine/references/**`.
- The generated Plan is the sole downstream planning artifact.

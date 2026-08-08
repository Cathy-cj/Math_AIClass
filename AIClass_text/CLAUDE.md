# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

**`AGENTS.md` is the tool-neutral agent entry point; `skills/` is the SOP source of truth.** This file is only a map — SOP bodies live under `skills/` and must be edited there, never duplicated into `.claude/`, `.cursor/`, or any other product folder.

**本仓只生产纯文字题。** 本文件中从 AIClass 继承而尚未删去的图形示例不适用；以 `AGENTS.md`、`skills/` 和 text-only schema 的约束为准。

For any course-production request, load root `../skills/README.md` first. For text courses read outline → plan/text → make/text-runtime.

## Commands

Content side (run at monorepo root):

```bash
npm run content:check:text       # content lint: teaching-design completeness, screen brevity, phrase variety, plan/outline structure
```

The AI outputs **JSON only** (`outline.json` / `plan.json`) and presents review summaries in conversation; never run `outline:export` / `plan:export` — those md exporters are optional human tools.

Engine side (run in `engine/`):

```bash
npm run course:new -- <courseId> "标题"
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>
npm run course:export -- <courseId> --zip
npm test                          # engine unit tests (tests/run-tests.mjs; needs npm ci + npm run vendor:sync first)
npm run test:browser              # Playwright smoke (CI also runs this)
```

CI 需在根目录运行 `content:check:text`；内容校验 warnings 均视为失败。

## Architecture

Monorepo with three packages plus SOPs; content flows left to right:

```text
_output_/{grade}/{courseId}/                           engine/
course.json (registry) + {problemId}/         ←──  runtime shell, widgets,
  outline/plan + debug/ + .generated/ (gitignored)    templates, CLI tools, KaTeX
```

- **`_output_/`** is the per-course source of truth, grouped by grade: `_output_/{grade}/<courseId>/course.json` registers problems (order, actionPrefix) and the grade; `_output_/{grade}/<courseId>/<problemId>/` holds `outline.json` (lesson-prep design: positioning, entry point, `teachingStages[]` with derivation loops/interactions, closing) and `plan.json` (steps: `action`, `agent.description` narration, text `push` blocks). `debug/` and `.generated/` (build artifacts, gitignored) live beside them. Root `tools/content/` owns the text content checker.
- **`engine/`** renders and packages courses. `tools/aiclass.mjs` is the CLI behind all `course:*`/`lesson:*` scripts (it also validates plans — e.g. rejects `directFormula` misuse, `knowledge` in problemBrief). `workspace.local.json` (uncommitted; see `workspace.example.json`) points the CLI at local plan roots. Interaction widgets: `oral`, `choice`, `fill` under `src/widgets/`.

### Production state machine

```text
course:new → outline → plan → arrange → codegen → check/generate/preview → (export optional)
```

本仓只承载纯文字题；纯计算题和有图题属于独立仓库。One `courseId` at a time; example preview 通过后自动开练题。预览验收由 agent 在对话中记录。

### Key content contracts (enforced by `content:check:text` + `course:check`)

- example/practice `teachingStages[]` follow the fixed spine: `read-problem/审题环节 → entry-point/从哪入手 → derivation stages ×N (problem-specific names, each with loop from→get) → 提取已知 → 列式计算` (typically 4–8 stages, more for multi-difficulty long chains); exam-point interactions are designed in the outline (`tests` required) and transcribed verbatim by fill — **group 1 (审题) has no interactions**; **group 2..N each carry ≥1 interaction**: stages without an outline interaction get a fill-authored simple process-level micro-question (choice/oral/fill, answerable in one move).
- **Fill expands each stage into micro-steps**: `loop.get` is a destination, never a display — every intermediate quantity, substitution, and algebraic move is its own step, derived live with right-column lines that **append downward** (new `replaceKey` each beat; do not overwrite prior board with the same key); dumping the stage result as a block is the 20-point failure mode.
- **The outline (备课) is where most thinking/tokens go.** Difficulty points are found by solving the problem independently first (never just from 【分析】【详解】), and each hard stage unfolds as 动机 → 操作 → 回看 beats teaching WHY, not restating the answer. **Step counts have no upper cap and no budget field** — `stepBudget` is removed from the outline schema; per-stage depth follows its `difficulty` stars, and the archetype step references are magnitude hints, never limits. Hard problems may run 20–30 steps, easy ones stay short; never converge on a fixed total like 8.
- Screen text is phrase-level ("口播讲理，屏幕留证"): card lines ≤24 CJK chars (formulas exempt), options ≤12, no 因为/所以 sentences on screen; full explanation goes in `agent.description`. Screen text uses **math notation** (`△ABD`/`S△ABD`/`∠A`/`cm²`) — Chinese readings like 三角形/平方厘米 belong ONLY to TTS narration (original stem text in `region: "top"` stays as-is).
- Every guidanceChain group must land at least one right-column card (group 1 is covered by the embedded `problemBrief`): the entry-point stage shows a paradigm-level `entryPoint.strategy` card (4–12 chars, e.g. 化整为零—not operational steps), 提取已知 shows a data card — with `desc` removed there is no fallback text in an empty guide slot.
- `problemBrief` (known/ask/key) reveals progressively via per-step snapshots in group 1; no `readStem` cards; `knowledge` never appears on screen.
- Right-column board accumulates by **stacking downward** (new semantic `replaceKey` per beat); reuse `replaceKey` only for true in-place rewrites. Screen math uses LaTeX `$...$`, never Unicode fraction/root glyphs.
- Opening step (`group: 0`) delivers the outline `positioning` (~30s); the final compute step delivers `closing.recap`; phrase-bank `banned` substrings are rejected in openings.
- `agent.description` is a **TTS verbatim script**: pure Chinese — no digits, lowercase letters, or math symbols (write 加/减/乘/除/三角形/度…; uppercase geometry point names like 三角形ABD are allowed), and no parenthetical screen/animation notes (those go in `figure.note`/`moduleNote`). Existing pre-rule lessons are grandfathered — do not rewrite them.
- `guidanceChain` entries carry **`title` only** — `desc`/`guidanceDesc` is removed everywhere (the courseware UI no longer shows stage subtitles).
- Figure confirmation is done by **drawing, not describing**: figure-space-clarify produces `figure-spec.json` + `figure-preview.html` (JSXGraph, vendored lib) for human review; the preview stays in the lesson folder as the reference for the real figure module.
- Every course gets its **own debug page** at `_output_/{grade}/<courseId>/debug/index.html` (built during codegen, kept in the course folder).

## Repo rules (from AGENTS.md)

- Edit SOP bodies only under `skills/`; do not create alternate SOP trees.
- Lesson content lives in `_output_/{grade}/{courseId}/{problemId}/`; never treat `.generated/` or `dist/` as source of truth.
- All work happens on branch `skills` (user convention for this fork).

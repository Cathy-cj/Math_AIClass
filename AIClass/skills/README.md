# skills — SOP source of truth

Any agent working on AIClass course production should load skills from **this directory**. Each skill lives in its own subdirectory with a `SKILL.md` entry point plus supporting reference files.

Root pointer: [`../AGENTS.md`](../AGENTS.md).

## Orchestration

| Directory | Role |
|-----------|------|
| [production-flow/](production-flow/SKILL.md) | Full pipeline navigator (auto-advance per problem; figure-only human gate) |
| [course-pipeline/](course-pipeline/SKILL.md) | Board, gates, previewOk, handoff |
| [course-arrange/](course-arrange/SKILL.md) | Create / arrange `course.json` |

## Authoring

| Directory | Role |
|-----------|------|
| [lesson-outline/](lesson-outline/SKILL.md) | Outline = lesson prep (positioning, entry point, derivation loops, interaction design; see [teaching-design.md](lesson-outline/teaching-design.md)) |
| [figure-space-clarify/](figure-space-clarify/SKILL.md) | Figure space confirmation |
| [fill-lesson-plan/](fill-lesson-plan/SKILL.md) | Lesson plan (delivers the prep design as step-by-step narration) |
| [revise-lesson-plan/](revise-lesson-plan/SKILL.md) | Revise plan |
| [codegen-lesson/](codegen-lesson/SKILL.md) | Land into `courses/` |
| [lesson-plan/](lesson-plan/) | Shared schema / phrase-bank |
| [archetype-plan-selector/](archetype-plan-selector/SKILL.md) | 外部规划参考：archetype 结构启发（**非** AIClass 主流程） |

## State machine

```text
board → outline → (figure if needsFigure) → plan → arrange → codegen → check/generate/preview → (export optional)
```

Human gate: **图形 OK** only. `outlineOk` / `planOk` / `previewOk` are auto-written on check/preview pass.

## Hard contracts — single source of truth

每条硬契约只在一处权威定义（其余文件只作一句话引用）；`npm run plan:check` 强制执行：

| 契约 | 权威出处 |
|------|----------|
| outline / plan schema、TTS 逐字稿（agent.description 纯中文读法）、agent.type、guidanceChain 仅 title（desc 已废弃）、step 短 id、choice/oral 揭晓方式、环节槽位不空白、**审题（group 1）禁止互动**、**互动两层（考点级 vs 过程级）** | [lesson-plan/reference.md](lesson-plan/reference.md) |
| 屏幕极简与数学符号（口播讲理屏幕留证；屏幕 `△ABD`/`cm²`，汉字读法只属口播）、备课方法论（独立解题找难点、难点按动机→操作→回看展开、步数无上限） | [lesson-outline/teaching-design.md](lesson-outline/teaching-design.md) |
| 环节内微步展开（from→get 一步步现场推，`loop.get` 不整块上屏）、审题禁止互动、其余大环节至少一道互动（outline 没覆盖则补过程级简单小问） | [fill-lesson-plan/step-splitting.md](fill-lesson-plan/step-splitting.md) |
| 左图动画 L1+L2（note + actions[]） | [fill-lesson-plan/figure-animation.md](fill-lesson-plan/figure-animation.md) |
| MD 输入 → courseId / lesson id 命名 | [lesson-plan/naming-from-md.md](lesson-plan/naming-from-md.md) |
| AI 只产出 json（不导 md）、图形唯一人工门禁、同题内自动链式推进 | [production-flow/](production-flow/SKILL.md) |
| 图形确认靠实画（figure-preview.html）不靠文字 | [figure-space-clarify/](figure-space-clarify/SKILL.md) |
| 每课件独立 debug 页（`courses/<courseId>/debug/`）、plan→模块映射 | [codegen-lesson/](codegen-lesson/SKILL.md) |

## Conventions

- Maintain skill bodies **only** here — do not duplicate them elsewhere in the repo.
- Problem sources: `math_syllabus/lesson/{id}/`
- Courseware sources: `courses/{courseId}/`
- Human index: [`docs/production/README.md`](../docs/production/README.md)

# skills — SOP source of truth

Any agent working on AIClass Calculation course production should load skills from **this directory**. Each skill lives in its own subdirectory with a `SKILL.md` entry point plus supporting reference files.

Root pointer: [`../AGENTS.md`](../AGENTS.md).

## 双源说明

| 来源 | 本目录中对应什么 |
|------|------------------|
| [AIClass](../../AIclass2/AIClass/skills/) 提炼 | 流水线、备课、微步、**口播 TTS / phrase-bank**、schema |
| module_template](../../module_template/) 提取 | 呈现 → [calc-teaching-spine.md](lesson-plan/calc-teaching-spine.md) + [calculation-marks.md](lesson-plan/calculation-marks.md)；运行时 → [calc-engine-layout.md](lesson-plan/calc-engine-layout.md) |

图形专用 skill（`figure-space-clarify`、`figure-animation`）**不进入本仓**。

## Orchestration

| Directory | Role |
|-----------|------|
| [production-flow/](production-flow/SKILL.md) | 纯计算题全流程导航（每题自动推进；无图形门禁） |
| [course-pipeline/](course-pipeline/SKILL.md) | Board, gates, previewOk, handoff |
| [course-arrange/](course-arrange/SKILL.md) | Create / arrange `course.json` |

## Authoring

| Directory | Role |
|-----------|------|
| [lesson-outline/](lesson-outline/SKILL.md) | Outline = lesson prep（见 [teaching-design.md](lesson-outline/teaching-design.md)） |
| [fill-lesson-plan/](fill-lesson-plan/SKILL.md) | 展开 plan；呈现跟 calculation-marks |
| [revise-lesson-plan/](revise-lesson-plan/SKILL.md) | Revise plan |
| [codegen-lesson/](codegen-lesson/SKILL.md) | Land into `courses/`（`top-split` + calc 类名） |
| [lesson-plan/](lesson-plan/) | Shared schema / phrase-bank；计算呈现见 [calculation-marks.md](lesson-plan/calculation-marks.md)；**引擎布局与公式 fit** 见 [calc-engine-layout.md](lesson-plan/calc-engine-layout.md) |

## State machine

```text
board → outline → plan → arrange → codegen → check/generate/preview → (export optional)
```

本仓只承载纯计算题，不设图形门禁。`outlineOk` / `planOk` / `previewOk` 会在检查/预览通过后自动写入。

## Hard contracts — single source of truth

每条硬契约只在一处权威定义（其余文件只作一句话引用）；`npm run plan:check` 强制执行：

| 契约 | 权威出处 |
|------|----------|
| outline / plan schema、TTS 逐字稿（agent.description 纯中文读法）、agent.type、step 短 id、choice/oral 揭晓、区域不空白、**开场禁止互动**、**互动两层** | [lesson-plan/reference.md](lesson-plan/reference.md)（自 AIClass 提炼） |
| 屏幕极简与数学符号、备课方法论（独立解题找难点、动机→操作→回看、步数无上限） | [lesson-outline/teaching-design.md](lesson-outline/teaching-design.md)（自 AIClass 提炼） |
| 阶段内微步展开、开场禁止互动、详解阶段至少一道互动 | [fill-lesson-plan/step-splitting.md](fill-lesson-plan/step-splitting.md)（自 AIClass 提炼） |
| **计算呈现**：上屏四段 + `.calc-*` + action 骨架 | [lesson-plan/calc-teaching-spine.md](lesson-plan/calc-teaching-spine.md) + [calculation-marks.md](lesson-plan/calculation-marks.md)（自 module_template） |
| **引擎布局 / 公式 fit / 左栏滚动 / 预览验收** | [lesson-plan/calc-engine-layout.md](lesson-plan/calc-engine-layout.md) |
| MD 输入 → courseId / lesson id 命名 | [lesson-plan/naming-from-md.md](lesson-plan/naming-from-md.md) |
| AI 只产出 json、同题内自动链式推进、无图形门禁 | [production-flow/](production-flow/SKILL.md) |
| 每课件独立 debug 页、plan→模块映射 | [codegen-lesson/](codegen-lesson/SKILL.md) |

## Conventions

- Maintain skill bodies **only** here — do not duplicate them elsewhere in the repo.
- Problem sources: `math_syllabus/lesson/{id}/`
- Courseware sources: `courses/{courseId}/`
- Human index: [`docs/production/README.md`](../docs/production/README.md)

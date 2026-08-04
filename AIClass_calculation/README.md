# AIClass Calculation

纯计算题互动课 **monorepo**：三包 + 生产文档区。

| 目录 | 类型 | 职责 |
|------|------|------|
| [`math_syllabus/`](math_syllabus/) | 包 | 内容规划：outline / plan |
| [`courses/`](courses/) | 包 | 课件源：`course.json`、课专属计算模块 |
| [`engine/`](engine/) | 包 | 共享计算运行时（`top-split`、`.calc-*`）、模板、工具、KaTeX |
| [`skills/`](skills/) | 规范 | Agent 中性 SOP（编排 + 写题细则） |
| [`docs/production/`](docs/production/) | 文档区 | 跨包制作流程与门禁（非包） |
| [`AGENTS.md`](AGENTS.md) | 入口 | 任意 Agent 产品的统一说明 |

## 从这里开始

任意 Agent 先读 **[`AGENTS.md`](AGENTS.md)** 与 **[`skills/`](skills/)**。人读总览见 **[`docs/production/`](docs/production/)**。

本仓只承载**纯计算题**（方程/算式演算等）。有图题见 AIClass；纯文字应用题见 AIClass_text。

| 需要 | 去读 |
|------|------|
| **Agent 总入口** | [`AGENTS.md`](AGENTS.md) |
| **制作看板** | 对话「看板」或 [`courses/<课>/pipeline.md`](courses/)；SOP [`course-pipeline`](skills/course-pipeline/SKILL.md) |
| **流程导航** | [`production-flow`](skills/production-flow/SKILL.md) |
| **计算呈现契约** | [`calculation-marks.md`](skills/lesson-plan/calculation-marks.md) |
| **口播/TTS** | [`reference.md`](skills/lesson-plan/reference.md)、[`phrase-bank`](skills/lesson-plan/phrase-bank.md)（自 AIClass 提炼） |
| 引擎命令 | [`engine/docs/commands.md`](engine/docs/commands.md) |

本地 Plan 根路径：配置 `engine/workspace.local.json`（不提交）。示例见 [`engine/workspace.example.json`](engine/workspace.example.json)。

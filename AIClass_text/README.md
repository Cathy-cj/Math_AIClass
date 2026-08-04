# AIClass Text

纯文字题互动课 **monorepo**：三包 + 生产文档区。

| 目录 | 类型 | 职责 |
|------|------|------|
| [`math_syllabus/`](math_syllabus/) | 包 | 内容规划：outline / plan |
| [`courses/`](courses/) | 包 | 课件源：`course.json`、课专属文字模块 |
| [`engine/`](engine/) | 包 | 共享纯文字运行时、模板、工具、KaTeX vendor |
| [`skills/`](skills/) | 规范 | Agent 中性 SOP（编排 + 写题细则） |
| [`docs/production/`](docs/production/) | 文档区 | 跨包制作流程与门禁（非包） |
| [`AGENTS.md`](AGENTS.md) | 入口 | 任意 Agent 产品的统一说明 |

## 从这里开始

任意 Agent 先读 **[`AGENTS.md`](AGENTS.md)** 与 **[`skills/`](skills/)**。人读总览见 **[`docs/production/`](docs/production/)**：一次只推进一门课；主路径为大纲 → 讲法 → 编排 → 预览（可选导出）。本仓只承载纯文字题；纯计算题和有图题由独立仓库负责。

| 需要 | 去读 |
|------|------|
| **Agent 总入口** | [`AGENTS.md`](AGENTS.md) |
| **制作看板（进度）** | 对话「看板」或 [`courses/<课>/pipeline.md`](courses/)；SOP [`course-pipeline`](skills/course-pipeline/SKILL.md) |
| **流程导航** | [`production-flow`](skills/production-flow/SKILL.md)；地图 [`skills/README.md`](skills/README.md) |
| 内容 SOP（outline / plan） | [`math_syllabus/README.md`](math_syllabus/README.md) |
| 建课编排 | [`docs/production/create-course.md`](docs/production/create-course.md) |
| 引擎命令 | [`engine/docs/commands.md`](engine/docs/commands.md) |
| 引擎架构 | [`engine/docs/architecture.md`](engine/docs/architecture.md) |

本地 Plan 根路径：配置 `engine/workspace.local.json`（不提交）。示例见 [`engine/workspace.example.json`](engine/workspace.example.json)。

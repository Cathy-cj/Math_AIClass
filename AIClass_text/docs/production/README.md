# 课程制作流程（Playbook）

跨包端到端编排入口（**L0 索引**）。

## 从这里开始：制作看板

**先看进度，再改真源。**

1. 对话说 **「看板」**（SOP：[`course-pipeline`](../../skills/course-pipeline/SKILL.md)），或  
2. 打开 `courses/<courseId>/pipeline.md`，或  
3. 在 `engine/` 运行：`npm run pipeline:board -- <courseId>`

**唯一人工门禁**：**图形 OK**（有图题，看过 `figure-preview.html` 后）。`outlineOk` / `planOk` / `previewOk` 由 AI 在 check/preview 通过后自动写入。

| 层 | 角色 | 位置 |
|----|------|------|
| L0 | 跨包怎么走 + 门禁 | 本目录 |
| L1 | Agent SOP 真源（工具中性） | [`skills/`](../../skills/README.md) · [`AGENTS.md`](../../AGENTS.md) |
| L2 | 薄入口 | 各包 `README.md` |

## 当前约定

1. **一次只推进一门课**（一个 `courseId`）。
2. **MD 输入时** `courseId` = md 文件名去 `.md`（见 [`naming-from-md.md`](../../skills/lesson-plan/naming-from-md.md)）；单题 md 时 `lesson/{id}` 与 courseId 相同。
3. **主路径止于校验 · 生成 · 预览**（可选 `course:export`）。暂不考虑 Tag / Release。
4. **绘图运行时为 JSXGraph（2D + View3D）**，离线 vendor（见 [figure-tooling.md](./figure-tooling.md)）。
5. **同一题内 AI 自动链式推进**；例题 preview 验收通过后自动开始配对练题。

## 文档权威

| 范围 | 权威文档 |
|------|----------|
| **制作看板** | [`course-pipeline`](../../skills/course-pipeline/SKILL.md) + `courses/<id>/pipeline.md` |
| **流程导航** | [`production-flow`](../../skills/production-flow/SKILL.md) |
| 内容：大纲 → 讲法 | [`math_syllabus/README.md`](../../math_syllabus/README.md) |
| Agent SOP 地图 | [`skills/README.md`](../../skills/README.md) |
| 新建课编排 | [create-course.md](./create-course.md) · [`course-arrange`](../../skills/course-arrange/SKILL.md) |
| 引擎命令 | [`engine/docs/commands.md`](../../engine/docs/commands.md) |
| 引擎架构 | [`engine/docs/architecture.md`](../../engine/docs/architecture.md) |
| 绘图 | [figure-tooling.md](./figure-tooling.md) |

**暂缓**：[`engine/docs/archive/versioning-and-release.md`](../../engine/docs/archive/versioning-and-release.md)。

## 端到端阶段

```text
贴题 / 截图
    ↓ 看看板（course-pipeline）/ 导航（production-flow）
    ↓ ① 大纲（AI 自动，plan:check 通过）
math_syllabus/lesson/{problemId}/outline.json
    ↓ （有图）图形确认 → 图形 OK 【唯一人工停点】
    ↓ ② 讲法（AI 自动，plan:check 通过）
math_syllabus/lesson/{problemId}/plan.json
    ↓ ③ 编排这一门课（course-arrange）
courses/{courseId}/course.json  (+ pipeline.json)
    ↓ codegen-lesson
    ↓ ④ 校验 · 生成 · 预览（在 engine/ 下跑 npm）
course:check → lesson:generate → course:preview → --complete-preview
    ↓ 例题 previewOk 后自动开练题
    ↓ （可选）导出
course:export
```

| 阶段 | 在哪做 | 产出 | 进入下一阶段前 |
|------|--------|------|----------------|
| 看板 | `courses/<id>/pipeline.*` | 进度表 | — |
| ① 大纲 | `math_syllabus/` | outline.json | `plan:check` 通过（auto `outlineOk`） |
| 图形 | `math_syllabus/` | figure-spec | **图形 OK**（有图时） |
| ② 讲法 | `math_syllabus/` | plan.json | `plan:check` 通过（auto `planOk`） |
| ③ 编排 | `courses/` | 一门 `courses/<id>/` | problemId / order / actionPrefix 唯一 |
| 落地 | `courses/` modules | figure + 模块 | — |
| ④ 生成预览 | `engine/` 工具 | `.generated/`、可预览 | check + preview 验收（`previewOk`） |
| （可选）导出 | `engine/` | `engine/dist/<id>/` | 本地可双击运行 |

门禁见 [checklist.md](./checklist.md)。

## 包职责

| 目录 | 职责 | 不是 |
|------|------|------|
| `math_syllabus/` | 单题 outline / plan | 不跑课件；SOP 在 `skills` |
| `courses/` | 课件源 | 不含通用引擎 |
| `engine/` | 运行时、模板、工具、vendor | 不含真实课长期源 |
| `skills/` | Agent 中性 SOP | 不是课件真源 |
| `docs/production/` | 跨包流程索引 | 不是工具包或真源 |

## 常用命令

内容侧（`math_syllabus/`）：

```bash
npm run plan:check   # 唯一必跑；outline:export / plan:export 仅人工自愿导 md 看
```

引擎侧（`engine/`）——一次只针对当前 `<courseId>`：

```bash
npm run pipeline:board -- <courseId>
npm run pipeline:board -- <courseId> --gate <problemId> figureOk
npm run pipeline:board -- <courseId> --complete-preview <problemId>
npm run course:new -- <courseId> "课程标题"
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>
npm run course:export -- <courseId> --zip
```

本地 Plan：`engine/workspace.local.json`（不提交）。示例见 [`workspace.example.json`](../../engine/workspace.example.json)。

## 相关链接

- [制作检查清单](./checklist.md)
- [建课编排](./create-course.md)
- [课程目录约定](../../courses/README.md)
- [monorepo 根 README](../../README.md)

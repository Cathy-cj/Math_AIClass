---
name: course-pipeline
description: >-
  纯文字题课件制作看板：查看一门课各题处在大纲/讲法/编排/生成的哪一步，并推荐下一步。
  触发：看板、进度、制作流程、pipeline、这门课到哪了、推进制作。
---

# Skill：course-pipeline（制作看板）

## 目标

给人/Agent 一个**统一编排面**：不合并三包真源，只管理进度与门禁。

| 文件 | 用途 |
|------|------|
| `courses/<courseId>/pipeline.json` | 唯一真源（gates / previewOk / activeProblemId） |
| `courses/<courseId>/pipeline.md` | 刷新命令自动生成的副产品，Agent 不维护、不依赖 |

## 必读

- 跨包流程：[docs/production/README.md](../../docs/production/README.md)
- 编排导航：[production-flow](../production-flow/SKILL.md)
- 刷新脚本：`engine/tools/pipeline-board.mjs`

## 状态机

```text
board → outline → plan → arrange → codegen → check/generate/preview → (export optional)
```

同一 `problemId` 内 AI 可链式推进；纯文字题不设人工图形门禁。

## 步骤（看板）

1. 确认 `courseId`：若输入为 `.md` 文件路径 → 用文件名去 `.md`（见 [naming-from-md.md](../lesson-plan/naming-from-md.md)）；否则用户指定，或问一句，或看最近改过的 `courses/*`
2. 在 `engine/` 运行：

```bash
npm run pipeline:board -- <courseId>
```

3. 读 **`courses/<courseId>/pipeline.json`**，在对话里用表格复述进度
4. 只推荐 **一条** 下一步（表中「下一步」列）；需要深入时 **转交** 对应 skill

## 门禁

| 类型 | 字段 | 行为 |
|------|------|------|
| **自动** | `outlineOk` | 刷新看板时：`outline.json` 存在且 `outlineStatus: approved` |
| **自动** | `planOk` | 刷新看板时：`plan.json` 存在且 outline 已 OK |
| **自动** | `previewOk` | AI 完成 check/generate/preview 验收后 `--complete-preview` |

预览验收：

```bash
npm run pipeline:board -- <courseId> --complete-preview <problemId>
```

- 例题 `previewOk` 后，看板自动将 `activeProblemId` 切到 `afterPlanId` 指向它的练题

## 题目列表同步

`course.json.authoring.problems` 有增删时：

```bash
npm run pipeline:board -- <courseId> --sync
```

## 转交

| 下一步含 | 转交 |
|----------|------|
| lesson-outline / 出大纲 | [lesson-outline](../lesson-outline/SKILL.md) |
| fill-lesson-plan / 填讲法 | [fill-lesson-plan](../fill-lesson-plan/SKILL.md) |
| course-arrange / 建课编排 | [course-arrange](../course-arrange/SKILL.md) |
| codegen / 落地 | [codegen-lesson](../codegen-lesson/SKILL.md) |
| lesson:generate / preview / export | 提示在 `engine/` 执行对应 npm 命令（见 [commands.md](../../engine/docs/commands.md)） |

执行细则与本目录其他 Skills 同层；本 Skill 不写口播/拆步。

## 禁止

- 不把 outline/plan 正文搬进 `courses/`
- 不在纯文字题流水线写入图形字段
- 不代替 fill-lesson-plan 写逐步口播
- 不把 CLI 当作对人的主说明

## 自检

- [ ] 已刷新看板（`pipeline.json`）
- [ ] 对话表与文件一致
- [ ] 只给了一条下一步

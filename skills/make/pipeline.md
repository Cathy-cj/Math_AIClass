# 制作流程与命名：当前兼容规则

**职责：** 统一三类 profile 的制作顺序、Markdown 命名与现有 CLI；不决定任何题目的教学内容、布局或图形动作。进度由 agent 直接读 `_output_` 判断，不再持久化门禁状态。

## Markdown 输入命名

- `courseId` 为 Markdown 文件名去掉 `.md`，必须满足小写 ASCII slug。
- 单题或一组例练使用该基名；同一文件多组例练时，每道题使用 `-ex1`、`-pr1`、`-ex2`、`-pr2` 等后缀。
- 例题与练题是两个 problem；例题的 `quickQA` 不单独登记为 problem。

## 当前流程

```text
Markdown 输入
→ _output_/{grade}/<courseId>/<problemId>/outline.json
→ figure（仅 needsFigure）
→ plan
→ course.json 编排
→ plan:check
→ course:check
→ lesson:generate
→ HTTP preview
```

- calculation 与 text 不设图形人工验收。
- figure 题在 approved outline 后必须依次完成 `figure-spec.json(draft)`、`figure-preview.html`、用户明确“图形 OK”并把 `figure-spec.json` 置为 `status: "confirmed"`，才可写 plan。
- 同课中仅有图的 problem 进入 figure 门禁；无图例题可继续 outline → plan。
- 进度（哪题做到 outline / figure / plan / 已预览）由 agent 读 `_output_/{grade}/<courseId>/<problemId>/` 的文件存在性与状态判断，不写入任何看板状态文件。

## CLI 与引擎版本

`_output_/{grade}/<courseId>/<problemId>/` 是 outline、plan、figure-spec、预览页和生成的 `output.json` 的唯一真源；`dist/` 只放可发布课件包。内容侧在 monorepo 根运行对应 profile 的 `npm run content:check:<profile>`。引擎侧先按实际所在仓选择创建命令，再依次同步、检查、生成和预览。

| 引擎目录 | 创建命令 | 导出产物路径 |
| --- | --- | --- |
| `AIClass/engine`、`AIClass_calculation/engine`、`AIClass_text/engine` | `npm run course:new -- <courseId> --grade <grade> "标题"` | 顶层 `dist/<grade>/<courseId>/` |

三套引擎均要求 `course.json.grade`，命令顺序相同：

```bash
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>
npm run course:export -- <courseId>
```

有图题额外运行：

```bash
npm run figure:preview -- <courseId>/<problemId>
```

## 进度维护

`pipeline.json` / `pipeline.md` / `pipeline:board` 已删除：门禁（outlineOk / figureOk / planOk / previewOk）不执行任何拦截，纯记录，现不再维护。agent 判断制作进度的依据：

- **outline**：`_output_/{grade}/<courseId>/<problemId>/outline.json` 存在且 `outlineStatus: "approved"`。
- **figure**（仅 needsFigure）：`figure-spec.json` 存在且 `status: "confirmed"`。
- **plan**：`plan.json` 存在。
- **已预览**：agent 在对话中记录，或重跑 `course:preview` 复验。

例题预览通过后，既有 `afterPlanId` 关系决定可推进的练题；不要在 skills 中硬编码“下一题必然是练题”。

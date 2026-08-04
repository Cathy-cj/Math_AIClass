# Engine 命令

在 **`engine/`** 目录执行。课程源位于仓库根 **`../courses/`**。

## 依赖

```bash
npm install
npm run vendor:sync
```

同步离线：KaTeX、JSXGraph。

## Workspace

```bash
copy workspace.example.json workspace.local.json
```

```json
{
  "authoringRoots": {
    "mathSyllabus": "../math_syllabus"
  },
  "runtime": {
    "katexBase": "vendor/katex/",
    "jsxgraphBase": "vendor/jsxgraph/"
  }
}
```

`workspace.local.json` 不提交。

## 制作看板

```bash
npm run pipeline:board -- <courseId>
npm run pipeline:board -- <courseId> --sync
npm run pipeline:board -- <courseId> --gate <problemId> figureOk
npm run pipeline:board -- <courseId> --complete-preview <problemId>
```

生成/更新 `../courses/<courseId>/pipeline.md`。对话入口：Skill **course-pipeline**（说「看板」）。**唯一人工门禁**：图形 OK。

## 图形审图预览

```bash
npm run figure:preview -- <lessonId>
```

读取 `../math_syllabus/lesson/<lessonId>/figure-spec.json`，生成同目录 `figure-preview.html`（统一样式与底部参数表）。模板见 `templates/figure-preview/`。

## 课程生命周期

```bash
npm run course:new -- <courseId> "标题"
npm run course:new -- --from-md <path/to/file.md> "标题"
npm run course:new -- <path/to/file.md> "标题"
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>
npm run course:export -- <courseId> --zip
```

MD 输入时 `<courseId>` = md 文件名去 `.md`（见 [`skills/lesson-plan/naming-from-md.md`](../../skills/lesson-plan/naming-from-md.md)）。

- 生成物：`../courses/<id>/.generated/`
- 导出：`dist/<id>/`；ZIP：`artifacts/`
- 导出后可将 debug 壳同步到 monorepo 根 `debug/`（gitignore）

建课编排 SOP：[`docs/production/create-course.md`](../../docs/production/create-course.md)。

## 测试

```bash
npm test
npm run test:browser
```

## 暂缓

Tag / Release / restore：见 [archive/versioning-and-release.md](./archive/versioning-and-release.md)。

# 新建一套约四道题的课程

示例：课程 `volume-review`，标题「立体图形复习」。

跨包约定见 [README.md](./README.md)。日常做到预览；提交 / tag / Release **暂缓**。

引擎命令细节见 [`engine/docs/commands.md`](../../engine/docs/commands.md)。

## 1. 创建课程目录

**MD 输入时**：`courseId` = md 文件名去掉 `.md`（详见 [`naming-from-md.md`](../../skills/lesson-plan/naming-from-md.md)）。例：`sum-6-21-5star.md` → `courses/sum-6-21-5star/`。

在 `engine/` 下：

```bash
npm run course:new -- volume-review "立体图形复习"
# MD 驱动（任选其一）：
npm run course:new -- sum-6-21-5star "六之二十一·5星裂项加减"
npm run course:new -- --from-md ../path/sum-6-21-5star.md "六之二十一·5星裂项加减"
npm run course:new -- ../path/sum-6-21-5star.md "六之二十一·5星裂项加减"
```

生成：

```text
courses/volume-review/
├─ course.json
├─ pipeline.json          # 制作看板（门禁）
├─ README.md
├─ assets/
├─ authoring/
└─ lesson/
   ├─ modules/
   ├─ extensions/
   └─ styles/lesson.css
```

创建后先跑（在 `engine/`）：

```bash
npm run pipeline:board -- volume-review
```

打开 `courses/volume-review/pipeline.md`，或对话说「看板」。

`course-id`：小写英文、数字、短横线。

## 2. 配置 authoring 根目录

在 `engine/` 复制：

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
    "konvaSrc": "vendor/konva/konva.min.js",
    "jsxgraphBase": "vendor/jsxgraph/"
  }
}
```

`workspace.local.json` 不提交。

## 3. 准备 Plan

```text
math_syllabus/lesson/
├─ volume-a/plan.json
├─ volume-b/plan.json
…
```

题目 ID 发布后保持稳定。

## 4. 在 `course.json` 中编排

```json
{
  "$schema": "../engine/schemas/course.schema.json",
  "schemaVersion": 1,
  "courseId": "volume-review",
  "title": "立体图形复习",
  "version": "0.1.0",
  "engine": {
    "range": "^1.0.0",
    "requiredCapabilities": [
      "file-runtime",
      "post-message",
      "left-right",
      "latex",
      "choice",
      "replace-key",
      "figure-state"
    ]
  },
  "authoring": {
    "rootKey": "mathSyllabus",
    "problems": [
      { "problemId": "volume-a", "order": 1, "actionPrefix": "题1" },
      { "problemId": "volume-b", "order": 2, "actionPrefix": "题2" },
      { "problemId": "volume-c", "order": 3, "actionPrefix": "题3" },
      { "problemId": "volume-d", "order": 4, "actionPrefix": "题4" }
    ]
  },
  "authoredModules": [],
  "extensions": []
}
```

- `order` / `actionPrefix` / `problemId` 均唯一。
- `problemId` 默认解析为 `<authoring-root>/lesson/<problemId>/plan.json`。

## 5. 添加课程 Figure

有图时先走 **figure-space-clarify**（[`skills/figure-space-clarify/`](../../skills/figure-space-clarify/SKILL.md)），确认 **图形 OK** 后再写模块。

建课编排也可对话走 [`course-arrange`](../../skills/course-arrange/SKILL.md)。

绘图约定：[figure-tooling.md](./figure-tooling.md)（JSXGraph 2D + View3D）。

```text
courses/volume-review/lesson/modules/_volume-composite-figure.js
```

并在 `course.json` 登记 `authoredModules`。课程专用 Figure 不要放入 `engine/src/`。

## 6. 校验、生成、预览

在 `engine/`：

```bash
npm run course:check -- volume-review
npm run lesson:generate -- volume-review
npm run course:preview -- volume-review
```

## 7. 导出（可选）

```bash
npm run course:export -- volume-review --zip
```

产出 `engine/dist/volume-review/` 与 `engine/artifacts/…-source.zip`。

## 暂缓

提交 / PR / tag / GitHub Release 见 [`engine/docs/archive/versioning-and-release.md`](../../engine/docs/archive/versioning-and-release.md)。

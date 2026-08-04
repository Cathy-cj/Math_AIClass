# 旧模板提取审计

源目录：`../module_template`。源目录保持只读；本文件记录进入 Final Template 的判断。

## Copy：原样保留的通用机制

- `src/bridge/*`
- `src/config/module-registry.js`
- `src/config/hub-config.js`
- `src/core/action-router.js`
- `src/core/background-board.js`
- `src/core/container-host.js`
- `src/core/course-container.js`
- `src/core/execution-log.js`
- `src/core/figure-host.js`
- `src/core/interaction-gate.js`
- `src/core/interaction-snapshot.js`
- `src/core/layout-stage.js`
- `src/core/overlay-mount.js`
- `src/core/scene-background.js`
- `src/core/scroll-follow.js`
- `src/core/scroll-index.js`
- `src/core/stage-scroll-lock.js`
- `src/core/submit-text.js`
- `src/components/*` 中由配置驱动的 UI 原语
- `src/widgets/*` 中由 `push.type` 驱动的块渲染器
- `src/screens/feynman/*` 的通用 overlay 机制
- `src/figures/registry.js`
- `src/styles/*` 中与上述组件一一对应的通用样式

## Generalize：保留机制，删除业务默认值

- `src/boot/engine-manifest.js`：删除课程专用 widget，加入 Figure kit 与 quick-QA 通用依赖。
- `src/components/latex.js`：CDN 固定地址改为本地 `vendor/`，允许 runtime 配置覆盖。
- `src/components/difficulty-stars.js`：恢复使用已提取的金色、红色和灰色 SVG 星星图片，并由引擎 CSS 统一控制尺寸。
- `src/core/execution-log.js`：消息 `source` 与 `targetOrigin` 改由 `__COURSE_BOOT` 配置。
- `src/screens/pre-lesson/pre-lesson.js`：知识点/例题默认文案改为学习模块/主课程。
- `src/screens/concept-sheet/concept-sheet.css`：删除具体概念 Figure 命名。
- `src/core/course-scheduler.js`：删除课程界面语义注释，保留调度行为。
- `debug/parent-shell`：只保留通用 dispatch/log 能力；课程树必须由生成数据提供。
- `index.html`：改为模板，课程标题、runtime config 与 action catalog 由导出器安全内联。

## Template only：不直接进入运行时

- `lesson/bootstrap.js`
- `lesson/handlers.js`
- `lesson/manifest.js` 的结构
- `lesson/course.meta.js` 的结构
- `lesson/modules/left-right_layout` 的空布局骨架
- 根 `index.html` 的加载顺序

这些内容被重写到 `templates/`，不复制旧课程默认值。

## Exclude：不进入框架

- `lesson/modules/*.js` 的所有真实 module 与 Figure。
- `lesson/styles/lesson.css` 的课程样式。
- `quizzes/`、`lesson.md`、`problems.json`。
- 根 `index.html` 内旧 action catalog。
- `debug/parent-shell` 内旧 `CATALOG_TREE` 与课程主题映射。
- `scripts/_*_descs.json` 和针对具体题目的生成/重编号脚本。
- `src/widgets/formula-pi-anim.js`：绑定具体练习和 `lf-pr2-*` selector。
- 旧 smoke/E2E 中写死的课程 action 与步数断言。

## 新增而非复制

- `src/figures/kit.js`
- `src/styles/quick-qa.css`（只提取通用 `.qa-*`，已移除 `.pr1-*`）
- `schemas/*`
- `tools/*`
- `references/*`
- `../skills/*`（规划 SOP；不进运行时包）
- `tests/fixtures/*`

## 边界检查

目标 `src/` 禁止出现：

- 具体课名、题号与 action 前缀。
- `pr1`、`pr2`、`ex1`、`ex2` 等课程 selector。
- 远程 CDN。
- 对 `courses/<other-course>` 的跨课程引用。

`npm test` 会执行上述扫描并验证所有 manifest 文件存在。

# shared — 三模板共享核心（唯一权威源）

- 本目录存放三个课件模板（`AIClass/`、`AIClass_text/`、`AIClass_calculation/`）的**浏览器运行时共享文件**
- 提取依据：三仓库字节级一致（git blob hash 三路对比），共 149 个文件
- **修改共享内容只改这里**，三模板运行时通过相对引用加载本目录

## 结构（保持原相对路径）

```
shared/
  engine/src/components/      通用 UI 组件（16）
  engine/src/widgets/         课件内容块渲染器（9）
  engine/src/styles/          共享样式（16）
  engine/src/core/            layout(5) + scroll(2) + session(3)
  engine/src/screens/         pre-lesson / concept-sheet（4）
  engine/src/config/          配置（2）
  engine/src/boot/            lesson-scripts.js
  engine/src/bridge/          message-bridge.js
  engine/src/assets/          difficulty-stars 图片（3）
  engine/vendor/katex/        KaTeX 0.18.1 全套（83）
  engine/vendor/licenses/     第三方许可（2）
```

## 约定

- **shared 与三个模板仓库同级**（都在本 monorepo 根下），运行时用
  `document.currentScript.src` 推导共享根，无需写死路径
- 模板仓库 git 中**不保留这些文件的副本**；模板的 `engine-manifest.js` / `loader.js`
  通过 `AICLASS_SHARED_ROOT` 加载共享模块
- `.extract-manifest.json` 是提取清单（149 个文件的相对路径），重建/核对时使用

## 各仓库独有内容（不在本目录）

- `_output_/{grade}/<courseId>/<problemId>/`、`dist/<grade>/<courseId>/`、`debug/`（本地课件内容与发布产物）
- 差异化引擎文件：`course-container.js`、`container-host.js`、`mathlive.js` 等（各仓库保留）

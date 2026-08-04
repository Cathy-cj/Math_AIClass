# 课程源目录

本目录由 `npm run course:new -- <course-id>` 复制。

- `course.json`：课程编排、引擎能力和 authoring 引用。
- `lesson/modules/`：确实无法由 Plan 生成的手写模块或 Figure。
- `lesson/extensions/`：仅本课程使用的组件、provider 和样式。
- `assets/`：课程资源；通过资源清单引用。
- `.generated/`：本地生成结果，不作为人工真源。

禁止从其他课程目录直接 import 文件。可跨课程复用的能力应提升到引擎并发布新版本。

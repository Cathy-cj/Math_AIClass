# Courses

课件源目录（与 `engine/` 分离）。课程长期用目录管理，不在此放引擎副本。

**目录名 = `courseId`**。以 `.md` 文件作为题目输入时，`courseId` 取 md 文件名去掉 `.md`（见 [`skills/lesson-plan/naming-from-md.md`](../skills/lesson-plan/naming-from-md.md)）。

在 **`engine/`** 下创建：

```bash
npm run course:new -- my-course --grade 7 "课程标题"
npm run pipeline:board -- my-course
```

一次只推进一门课。进度看 `pipeline.md` 或对话「看板」。详细步骤：

- [跨包制作流程](../docs/production/README.md)
- [建课编排](../docs/production/create-course.md)
- [引擎命令](../engine/docs/commands.md)

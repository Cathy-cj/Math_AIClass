# 内容工具

课程内容唯一真源在根目录 `_output_/{grade}/<courseId>/<problemId>/`。

在 monorepo 根目录按课程 profile 运行检查：

```bash
npm run content:check:figure
npm run content:check:text
npm run content:check:calculation
```

`figure`、`text`、`calculation` 目录各自保留该 profile 的校验规则；它们只读取所属 profile 已登记的 `_output_/{grade}/<courseId>/course.json`，不会交叉校验其他类型课程。

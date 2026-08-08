# Outline 命名与当前 calculation 关联

本文件只记录当前 calculation 生产命名，避免将目标 `renderProfile` 当成已实现字段。

- `courseId` 以输入规范 Markdown 的文件名去掉扩展名为准；非 Markdown 输入沿课程现有命名约定。
- 单题 lesson `id` 取 Markdown 基名；多题依次追加 `-ex1`、`-pr1` 等角色后缀。
- `moduleType` 表示 `example`、`practice`、`homework` 等教学角色，不等于渲染 profile。
- `teachingStages[].slug` 必须是题内唯一英文短标识，描述具体任务，不能套通用 phase 菜单。
- action 前缀属于后续 plan / course 登记：通常为 `例_`、`练_`、`作业_`，plan 的 step `id` 仍仅写 `start`、`s01` 等短 id。
- practice 的 `afterPlanId` 指向紧邻 example 的 plan id；它不是 action id，也不是 courseId。

统一命名字段或同课多 profile 尚未落地，继续以当前仓 schema 与 CLI 校验为准。

---
name: course-arrange
description: >-
  新建或编排一门课的 course.json / pipeline：建课壳、登记 problems、sync 看板。
  触发：建课、编排 course.json、course:new、登记题目。
---

# Skill：course-arrange（建课编排）

## 目标

完成制作流程 **③ 编排**：课壳与 `authoring.problems`，不写 outline/plan 正文，不做 codegen 逐步映射。

## 必读并严格执行

[docs/production/create-course.md](../../docs/production/create-course.md)

MD 输入时 `<courseId>` **必须**来自 md 文件名（去 `.md`），见 [naming-from-md.md](../lesson-plan/naming-from-md.md)。

## 步骤摘要

1. 在 `engine/` 建课壳（若目录已存在则跳过）：
   - `npm run course:new -- <courseId> "课程标题"`
   - 或 `npm run course:new -- --from-md <path/to/file.md> "课程标题"`
   - 或 `npm run course:new -- <path/to/file.md> "课程标题"`（参数以 `.md` 结尾时自动推导 courseId）
2. 配置 `engine/workspace.local.json`（不提交）指向 authoring 根
3. 在 `courses/<courseId>/course.json` 登记 `problemId` / `order` / `actionPrefix`（唯一）
   - 标准教学单元只登记两道正式题：`example`（例题）→ `practice`（练题）。
   - 例题的 `quickQA[]` 绑定在例题 plan 内，**不是**第三道 problem，不能单独登记。
   - 练题的 `lessonContext.slot` 必须为 `afterExample`，`afterPlanId` 指向紧邻的例题 id。
4. 同步看板：

```bash
npm run pipeline:board -- <courseId> --sync
```

5. 对话展示看板（读 **`pipeline.json`** 复述），或转交 [course-pipeline](../course-pipeline/SKILL.md)

## 禁止

- 不在本步写 `plan.json` 逐步口播
- 不手改 `.generated/` 当真源
- 不一次做完全程（跨多题时仍按例题→练题顺序；编排完可链式 codegen）

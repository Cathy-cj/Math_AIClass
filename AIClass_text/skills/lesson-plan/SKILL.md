---
name: lesson-plan
description: >-
  生成 lesson-plan.json 的内部规范。通常由 production-flow / fill-lesson-plan 调用；
  仅当用户明确说「只改 plan JSON」「改第 N 步口播」且不提「给一道题」时使用。
disable-model-invocation: true
---

# lesson-plan（子 skill）

**用户一般不需要单独 @ 本 skill。** 贴题生成讲法请用根目录 **production-flow** 或 **fill-lesson-plan**。

本 skill 用于：用户已有一份 plan，要改 JSON 或核对 schema。

## 执行步骤

1. 读 [reference.md](reference.md)
2. 按 schema 修改 `lesson/{id}/plan.json`
3. 运行：

```bash
npm run plan:check
```

4. 告知用户查看 `lesson/{id}/plan.json`（只产出 json，不导 md）

## 禁止

- 不要产出 xlsx 逐字稿或 md 稿
- 未通过 plan:check 前不要 codegen 到 courses/（用户另说）

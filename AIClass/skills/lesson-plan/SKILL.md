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

## 讲法分派（按 layout）

同一 course 可混排三种讲法，由每题 `plan.json.layout` 决定，改 plan 前先按此分派：

| layout | 讲法 | 权威文档 |
|--------|------|----------|
| `figure-text` / `text-over-figure` / `left-right` | figure 讲法（guidanceChain + problemBrief） | [reference.md](reference.md) |
| `text-only` | text 讲法（guidanceChain 同 figure，无图） | [reference.md](reference.md) |
| `top-split` | 计算讲法（要点→详解→答案，禁 problemBrief/guidanceChain/group） | [calc-teaching-spine.md](calc-teaching-spine.md) + [calculation-marks.md](calculation-marks.md) |

- **layout = `top-split` 的题**：禁 `problemBrief` / `guidanceChain` / `guidanceLayout` / `step.group` / `step.figure`；`agent.type` 仍需 explain/ask；排版问题（长式换行、右栏、滚动）查 [calc-engine-layout.md](calc-engine-layout.md)，勿在 `tex` 里加 `\\` 或改 region 打补丁。
- 非 top-split 题保持原 figure/text 契约不变。

## 执行步骤

1. 读 [reference.md](reference.md)；若该题 layout 为 `top-split`，改读 [calc-teaching-spine.md](calc-teaching-spine.md) 与 [calculation-marks.md](calculation-marks.md)
2. 按 schema 修改 `lesson/{id}/plan.json`
3. 运行：

```bash
npm run plan:check
```

4. 告知用户查看 `lesson/{id}/plan.json`（只产出 json，不导 md）

## 禁止

- 不要产出 xlsx 逐字稿或 md 稿
- 未通过 plan:check 前不要 codegen 到 courses/（用户另说）

---
name: revise-lesson-plan
description: >-
  用户审 plan.json 后指出修改（第 N 步口播、互动等）：只改 plan.json 并重跑检查。
  触发：改第几步、口播改成、plan 修改。
disable-model-invocation: true
---

# Skill 3：revise-lesson-plan

## 输入

- 现有 `lesson/{id}/plan.json`
- 用户修改意见（步号 / action 名 / 字段）

## 步骤

1. 只改用户指定的 step 或 quickQA；例题 quickQA 保持 3–5 道本题具体数据/关系题且答案唯一，练题不得新增 quickQA
2. 若改环节标题（guidanceChain title）→ 回 **lesson-outline** 改 `teachingStages[].title`，再同步 plan 的 `guidanceChain`（仅 title，无 desc）；改口播时保持 **TTS 逐字稿契约**（纯中文、无符号/数字/括号，见 [step-splitting.md](../fill-lesson-plan/step-splitting.md) 口播节）
3. 若改阶段结构、例练配对或增删步 → 建议先回 **lesson-outline** 更新 outline
4. 写 plan.json
5. `npm run plan:check`
6. 在对话里复述改动点；刷新看板 `npm run pipeline:board -- <courseId>`

## 禁止

- 默认不重写 outline
- 不 codegen 除非用户明确要求

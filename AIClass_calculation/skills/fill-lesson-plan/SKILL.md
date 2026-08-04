---
name: fill-lesson-plan
description: >-
  大纲就绪后：从动态 teachingStages 拆分 steps/action，组合 phrase-bank 口播，产出纯计算题 plan.json。
  触发：填充 plan、写完整讲法。
disable-model-invocation: true
---

# Skill 2：fill-lesson-plan

## 前置

- `lesson/{id}/outline.json` 存在且 `outlineStatus` 为 `approved`（`plan:check` 已通过）
- 本仓只处理纯计算题：`layout` 固定为 `top-split`，不写 `figureTemplate` 或 `steps[].figure`

## 必读

- 已确认的 [`math_syllabus/lesson/{id}/outline.json`](../../math_syllabus/lesson/)（唯一大纲来源，无 md 稿）
- **[calc-teaching-spine.md](../lesson-plan/calc-teaching-spine.md)** — **上屏四段 + action 命名**（对齐 module_template；**优先于** outline 环节 1:1 映射）
- [teaching-design.md](../lesson-outline/teaching-design.md) — 口播动机、难点展开
- [step-splitting.md](step-splitting.md) — 详解微步、互动步约定
- [calculation-marks.md](../lesson-plan/calculation-marks.md) — `.calc-*` 类名与 retainPush
- [calc-engine-layout.md](../lesson-plan/calc-engine-layout.md) — 公式 fit / 左栏滚动 / previewOk（plan 不写排版字段）
- [phrase-bank.json](../lesson-plan/phrase-bank.json) ＋ [phrase-bank.md](../lesson-plan/phrase-bank.md) — 口播句库（自 AIClass）
- [phase-routing.md](../lesson-plan/phase-routing.md) — moduleType → 开场句 / quickQA 对照
- [reference.md](../lesson-plan/reference.md) — **plan schema 与硬契约**（TTS 逐字稿等）
- [math-typesetting.md](../lesson-plan/math-typesetting.md) — 屏幕数学排版

## 步骤

1. 读 outline：锁定 `teachingStages[]` 与 `positioning` / `entryPoint` / `closing`；**按 calc-teaching-spine 折叠**，勿 1:1 每环节一个 action
2. 定 action 前缀（例题 `例_`、练题 `练_`）；要点阶段 ≤4 action（`_要点_起` → `_要点_条*` → 可选 `_要点_问/答`）
3. **开场步（`id: "start"`）**：口播 positioning；top 推 `calc-stem` + **原题展开式** `calc-eq`（禁擅自改 ∑）
4. **要点**：`_要点_起` 只推【要点】section；`_要点_条*` retainPush 累加 1–2 条 `calc-key-list`（合并 read-problem + entry-point 结论）
5. **详解_起**：**仅** right `calc-key-pin`（+ 可选 `calc-key-tex`）；**无 retainPush**
6. **详解步**：每步 `calc-solve-note` + `calc-solve-step`（`tex` 完整一行，勿 `\\` 换行）；**禁止**首步再推【详解】section；retainPush 含详解_起 id
7. **答案步**：`calc-answer calc-answer--final`；closing.recap 口播
8. 顶层 `layout: "top-split"`；例题 `quickQA[]` 3–5，`quickQALayout: "above-body"`
9. 写 `plan.json` → `npm run plan:check`

## 自检（落盘前）

**屏幕与口播**

- [ ] 屏幕极简：算式/数据/短语级结论；解释在口播
- [ ] 口播是 TTS 逐字稿：无阿拉伯数字/英文字母/数学符号，无括号屏幕说明
- [ ] push 使用 calculation-marks 类名；布局 `top-split`；长式 `tex` 单行交给引擎 fit（见 calc-engine-layout）
- [ ] 要点无多行化简；详解不重复策略口号；答案晚出

**教学设计兑现**

- [ ] 开场兑现 positioning；难点讲了「为什么」
- [ ] 每小题/环节闭环：要点 → 详解步… → 答案
- [ ] 开场步无互动；详解阶段 ≥1 互动
- [ ] 最后一步含 closing.recap

**结构**

- [ ] 无 `figureTemplate` / `steps[].figure` / `problemBrief` 上屏卡
- [ ] 详解累加用新行 + `retainPush` 保右栏钉
- [ ] example 的 quickQA（若有）答案唯一

## 禁止

- `_要点_审题`、`_要点_所求`、`_要点_策略`、`_要点_入手` 等文字题式 action 名
- 未经确认修改 outline 环节链
- 把 action 写回 outline
- 写入 `figureTemplate` 或 `steps[].figure`

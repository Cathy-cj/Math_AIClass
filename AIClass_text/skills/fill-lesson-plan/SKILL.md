---
name: fill-lesson-plan
description: >-
  大纲就绪后：从动态 teachingStages 拆分 steps/action，组合 phrase-bank 口播，产出纯文字题 plan.json。
  触发：填充 plan、写完整讲法。
disable-model-invocation: true
---

# Skill 2：fill-lesson-plan

## 前置

- `lesson/{id}/outline.json` 存在且 `outlineStatus` 为 `approved`（`plan:check` 已通过）
- 本仓只处理纯文字题：`layout` 固定为 `text-only`，不写 `figureTemplate` 或 `steps[].figure`

## 必读

- 已确认的 [`math_syllabus/lesson/{id}/outline.json`](../../math_syllabus/lesson/)（唯一大纲来源，无 md 稿）
- [teaching-design.md](../lesson-outline/teaching-design.md) — **备课方法论**：口播必须兑现 outline 里的开场定位/切入点/推导循环/互动/收尾设计
- [step-splitting.md](step-splitting.md) — **环节内微步展开（from→get 一步步走，核心）**、action 命名、section 审题、互动步约定
- [text-only-marks.md](../lesson-plan/text-only-marks.md) — 高亮/标签传参（红/黄/绿）
- [phrase-bank.json](../lesson-plan/phrase-bank.json) ＋ [phrase-bank.md](../lesson-plan/phrase-bank.md) — 口播句库与组合规则
- [phase-routing.md](../lesson-plan/phase-routing.md) — moduleType → 开场句 / quickQA 对照
- [reference.md](../lesson-plan/reference.md) — **plan schema 与硬契约**（TTS 逐字稿、agent.type、guidanceChain 仅 title、push 类型与揭晓方式、环节槽位）
- [math-typesetting.md](../lesson-plan/math-typesetting.md) — 分式、根号、上下标等屏幕数学排版

## 步骤

1. 读 outline：锁定 `teachingStages[]` 顺序与各段 `goal` / `approach` / `loop` / `difficulty` / `linkBack` / `trap` / `interactions`，以及顶层 `positioning` / `entryPoint` / `closing`；按 `teachingStages[]` 顺序逐段展开
2. 定 action 前缀（如 `体1_`），按各段 `difficulty` + [step-splitting.md](step-splitting.md) 把每个大环节**铺成微步**：`loop.from → loop.get` 之间的每个中间量、每次代入、每次变形独立一拍，难点环节按「动机 → 操作 → 回看」展开，易段一两步带过；总步数由题目难度决定，**没有上限**，禁止向 8 步之类的固定数字靠拢
3. **开场步（group 0，约 30 秒）**：展开 `positioning`（hook → represents → generalSkill / examRelevance），配 phrase-bank 变化措辞，**禁 banned**、禁逐字抄范例；记录 `phraseIds`。禁止一上来就讲题
4. **审题环节**（text-only）：用 `section` 标签上屏「已知 / 求」（`tagTone: known|ask` + `lead`），逐步追加正文；**不上屏**旧 `problemBrief` 嵌入卡；**禁止**问/答步与 `userResponse`；审题结尾可口白关键约定
5. **从哪入手环节**：通常 1 步，口播展开 `stuckPoint` / `observe` / `rejectedPaths`，讲清**为什么选这个思维范式**；右栏 strategy 卡只压范式短语（≤12 字）。**禁止**把推导环节的操作微步提前讲（具体怎么拆、怎么算占比从第一个推导 group 开始）
6. **推导环节**：按各段 `loop`（from→get）**现场一步步推**——`get` 是终点不是展示内容，禁止整块上屏或一口气念完，屏幕算式逐行长出来（微步展开见 step-splitting.md）；**难点环节的每个关键动作先口播动机（此刻缺什么、为什么想到这个工具、别的路为什么不行）再讲操作、再回看**——只宣布操作等于复述答案，不合格；段首按 `difficulty` 做难度落差播报（最难段敲黑板、最易段送信心，措辞变体）；`linkBack` 织进口播；`trap` 做陷阱预警（`trap.warn` 变体）；每道 `interactions[]` 落成 **问步＋答步**（原样使用 ask/options/answer，问句语气有热情）；**group 2..N 每个大环节至少一道互动**——outline 没覆盖的环节，从微步里挑关键一小步设过程级简单小问（选择/口答/填空，见 step-splitting.md 互动步约定）
7. **提取已知 / 列式计算**：亮标数据（`transition.phase` 变体）→ 逐段列式（`transition.compute` 变体）；**最后一步**除答案外必须兑现 `closing.recap`（星级拼装复盘）＋ `takeaway`（`closing.recap` / `closing.win` 变体）
8. 顶层写 `layout: "text-only"` 与 `guidanceLayout: "interleaved"`；正文步骤 `group` 与动态环节序号一一对应
9. **例题快问快答**：仅 `moduleType: "example"`，从 outline 的 `quickQASkeleton` 原样转写出独立顶层 `quickQA[]`（3–5 题），并写 `quickQALayout: "above-body"`。它**不属于** `steps[]` / `push`；不要手写打开、出题、揭晓 action，codegen 会按例题前缀生成。逐题核对是本题具体数据/关系/中间量，且答案唯一，禁止开放题。
9.1 **练习题拍照作答**：`moduleType: "practice"` 不在 plan 中手写拍照 action 或作答结果 push；codegen 会在练习入口 action 后自动生成 `{actionPrefix}_作答_拍照`。该组件仅请求宿主拍照，OCR 结果由宿主通过 `photo_result` 回传。
10. 每步填充 `action`、`push`、`agent.type`（explain/ask）、`agent.description`（**TTS 逐字稿**，契约见 [reference.md](../lesson-plan/reference.md)）、`moduleNote`
11. 从 outline `teachingStages[]` 复制 `guidanceChain`：**仅 `{ title }`，不写 `desc`**（已废弃）；**禁止**在 step 上写 `guidanceDesc`
12. 复制 `lessonContext`、`outlineId`；写 `lesson/{id}/plan.json`（不再填写题目来源）
13. 运行：

```bash
npm run plan:check
```

14. plan:check 有 warning → 按标签重写后再检查（常见：`[post-answer]` 答步口播判对错、`[read-problem]` 审题环节有误互动、`[stage-interaction]` 某 group 缺互动、`[banned]` 开场禁用语）
15. 在对话里附讲法摘要；**自动**进入 course-arrange / codegen-lesson。刷新看板：`npm run pipeline:board -- <courseId>`（`planOk` 自动推断）

## 自检（落盘前）

**屏幕与口播**

- [ ] 屏幕文字极简：push 行全是算式/数据/短语级结论，解释性长句都在口播里（口播静音后屏幕像板书）
- [ ] 屏幕用数学符号：`△ABD` / `S△ABD` / `∠A` / `cm²`，没有把「三角形」「平方厘米」等口播读法写上屏（题干原文除外）
- [ ] 口播全部是 TTS 逐字稿：无阿拉伯数字/英文字母/数学符号，无括号屏幕说明，只有 AI 老师说出口的话
- [ ] push / 选项中的分式、根号、上下标使用 LaTeX，未用 Unicode 数学符号模拟

**教学设计兑现（对照 outline）**

- [ ] 开场步兑现了 positioning（30 秒定位，没有直接开讲题）
- [ ] 审题点名了问句陷阱；结尾有知识预告＋范式级 strategy 一句＋难度播报
- [ ] 各推导环节口播兑现了 loop / difficulty 落差 / linkBack / trap
- [ ] 每个环节 from→get 之间**现场一步步推**：中间量、代入、变形各占一拍，`loop.get` 没有整块上屏、没有一口气念完，屏幕算式往下叠加（前序行保留）
- [ ] 难点环节讲了「为什么这样做」（动机 → 操作 → 回看），不是答案复述；关键动作出现前学生已知道为什么需要它
- [ ] 审题环节（group 1）无问/答步；outline 每道 interactions 都落成了问步＋答步，题目原样未改；**group 2..N 每个大环节至少一道互动**，outline 没覆盖的环节补了过程级简单小问（一步能答，不另造考点）
- [ ] 最后一步含 closing.recap 星级拼装复盘
- [ ] plan 环节顺序与 outline.teachingStages 一致；解析/列式与 analysisModel（logicChain / computeSteps）一致

**结构与数据契约**

- [ ] 每个环节槽位都有内容：group 1 用 section「已知/求」逐步填满；其余每个 group 至少一张右栏卡；「从哪入手」有范式级 strategy 短语卡，「提取已知」有数据卡
- [ ] 审题无 `problemBrief` / `readStem`；已知/求分步上屏并与 `stemClass` 同步；讲解 `--em`、得数 `--green`
- [ ] 右栏板书每拍用**新** `replaceKey` 往下叠；禁止同 key 覆盖前序 working/compute
- [ ] `guidanceLayout: "interleaved"`；group 0 可重复，正文完整覆盖 1..guidanceChain.length
- [ ] example 的 `quickQA[]` 为 3–5 道本题具体数据/关系题，均有唯一标准答案；不是开放题，且 `quickQALayout` 为 `above-body`
- [ ] 各环节展开深度与其 `difficulty` 匹配（难段成倍展开、易段简短）；难点环节没有为压总步数而合并「为什么」；quickQA 仅 example
- [ ] 无 banned 子串；问题步有 userResponse；compute 有 push

## 禁止

- 未经确认修改 outline 环节链
- 把 action 写回 outline
- 写入 `figureTemplate` 或 `steps[].figure`

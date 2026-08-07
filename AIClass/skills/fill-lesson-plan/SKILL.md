---
name: fill-lesson-plan
description: >-
  大纲就绪后：从动态 teachingStages 拆分 steps/action/动画，组合 phrase-bank 口播，产出 plan.json。
  触发：填充 plan、写完整讲法。
disable-model-invocation: true
---

# Skill 2：fill-lesson-plan

## 前置

- `lesson/{id}/outline.json` 存在且 `outlineStatus` 为 `approved`（`plan:check` 已通过）
- **有图题**：须已完成 [figure-space-clarify](../figure-space-clarify/SKILL.md)——`figure-spec.json` 的 `status` 为 `confirmed`，且用户已明确 **「图形 OK」**；无图题豁免

## 讲法分派（先定 layout 再填）

同一 course 可混排三种讲法，由该题 `layout` 决定：

- **`top-split`（计算讲法）**：走 [calc-teaching-spine.md](../lesson-plan/calc-teaching-spine.md) 的**上屏四段**（开始→要点→详解_起→详解_步→答案），**禁止** `problemBrief` / `guidanceChain` / `step.group` / `step.figure`；push 类名与 retainPush 查 [calculation-marks.md](../lesson-plan/calculation-marks.md)；排版（长式换行、右栏、左栏滚动）查 [calc-engine-layout.md](../lesson-plan/calc-engine-layout.md)，`tex` 单行交给引擎 fit；本 SKILL 步骤 4–8 的 figure/text 契约（problemBrief 快照、guidanceChain、interleaved）对 top-split 题**全部不适用**
- **`figure-text` / `text-over-figure` / `left-right` / `text-only`（figure/text 讲法）**：按本 SKILL 原流程

## 必读

- 已确认的 [`math_syllabus/lesson/{id}/outline.json`](../../math_syllabus/lesson/)（唯一大纲来源，无 md 稿）
- [teaching-design.md](../lesson-outline/teaching-design.md) — **备课方法论**：口播必须兑现 outline 里的开场定位/切入点/推导循环/互动/收尾设计
- [step-splitting.md](step-splitting.md) — **环节内微步展开（from→get 一步步走，核心）**、action 命名、problemBrief 契约、互动步约定
- [figure-animation.md](figure-animation.md) — **左图标注 SOP**（高亮+标注优先，少弹窗）
- [phrase-bank.json](../lesson-plan/phrase-bank.json) ＋ [phrase-bank.md](../lesson-plan/phrase-bank.md) — 口播句库与组合规则
- [phase-routing.md](../lesson-plan/phase-routing.md) — moduleType → 开场句 / quickQA 对照
- [reference.md](../lesson-plan/reference.md) — **plan schema 与硬契约**（TTS 逐字稿、agent.type、guidanceChain 仅 title、push 类型与揭晓方式、环节槽位）
- [math-typesetting.md](../lesson-plan/math-typesetting.md) — 分式、根号、上下标等屏幕数学排版

## 步骤

1. 读 outline：锁定 `teachingStages[]` 顺序与各段 `goal` / `approach` / `loop` / `difficulty` / `linkBack` / `trap` / `interactions`，以及顶层 `positioning` / `entryPoint` / `closing`；按 `teachingStages[]` 顺序逐段展开
2. 定 action 前缀（如 `体1_`），按各段 `difficulty` + [step-splitting.md](step-splitting.md) 把每个大环节**铺成微步**：`loop.from → loop.get` 之间的每个中间量、每次代入、每次变形独立一拍，难点环节按「动机 → 操作 → 回看」展开，易段一两步带过；总步数由题目难度决定，**没有上限**，禁止向 8 步之类的固定数字靠拢
3. **开场步（group 0，约 30 秒）**：展开 `positioning`（hook → represents → generalSkill / examRelevance），配 phrase-bank 变化措辞，**禁 banned**、禁逐字抄范例；记录 `phraseIds`。禁止一上来就讲题
4. **审题环节**：从 outline 原样复制 `problemBrief` 并按动画逐条快照（已知条数 → 求 → 关键，禁止 readStem push，`group: 1`）；**禁止**问/答步与 `userResponse`（见 reference.md「审题环节禁止互动」）；read-problem 的 `trap`（问句陷阱）必须在「求」揭示时点名；审题结尾三连：知识预告 → `entryPoint.strategy` 范式一句 → 全题难度播报（`difficulty.report` 变体）
5. **从哪入手环节**：通常 1 步，口播展开 `stuckPoint` / `observe` / `rejectedPaths`，讲清**为什么选这个思维范式**；右栏 strategy 卡只压范式短语（≤12 字）。**禁止**把推导环节的操作微步提前讲（具体怎么拆、怎么算占比从第一个推导 group 开始）
6. **推导环节**：按各段 `loop`（from→get）**现场一步步推**——`get` 是终点不是展示内容，禁止整块上屏或一口气念完，屏幕算式逐行长出来（微步展开见 step-splitting.md）；**难点环节的每个关键动作先口播动机（此刻缺什么、为什么想到这个工具、别的路为什么不行）再讲操作、再回看**——只宣布操作等于复述答案，不合格；段首按 `difficulty` 做难度落差播报（最难段敲黑板、最易段送信心，措辞变体）；`linkBack` 织进口播；`trap` 做陷阱预警（`trap.warn` 变体）；每道 `interactions[]` 落成 **问步＋答步**（原样使用 ask/options/answer，问句语气有热情）；**group 2..N 每个大环节至少一道互动**——outline 没覆盖的环节，从微步里挑关键一小步设过程级简单小问（选择/口答/填空，见 step-splitting.md 互动步约定）
7. **提取已知 / 列式计算**：亮标数据（`transition.phase` 变体）→ 逐段列式（`transition.compute` 变体）；**最后一步**除答案外必须兑现 `closing.recap`（星级拼装复盘）＋ `takeaway`（`closing.recap` / `closing.win` 变体）
8. left-right 且有 `guidanceChain` 时，顶层写 `guidanceLayout: "interleaved"`；正文步骤 `group` 与动态环节序号一一对应
9. **例题快问快答**：仅 `moduleType: "example"`，从 outline 的 `quickQASkeleton` 原样转写出独立顶层 `quickQA[]`（3–5 题），并写 `quickQALayout: "above-body"`。它**不属于** `steps[]` / `push`；不要手写打开、出题、揭晓 action，codegen 会按例题前缀生成。逐题核对是本题具体数据/关系/中间量，且答案唯一，禁止开放题。
10. **练题先拍照**：仅 `moduleType: "practice"`，入口步仍只放题干与开场口播；不写拍照 action 或作答结果 `push`。codegen 自动在入口后插入拍照动作，宿主通过 `photo_result` 回传 OCR；结果显示后进入审题讲解。
11. 每步填充 `action`、`figure.state`、`figure.note`、`push`、`agent.type`（explain/ask）、`agent.description`（**TTS 逐字稿**，契约见 [reference.md](../lesson-plan/reference.md)）、`moduleNote`
12. 从 outline `teachingStages[]` 复制 `guidanceChain`：**仅 `{ title }`，不写 `desc`**（已废弃）；**禁止**在 step 上写 `guidanceDesc`
13. 复制 `lessonContext`、`outlineId`；`source` 只写真实出处；写 `lesson/{id}/plan.json`
14. 运行：

```bash
npm run plan:check
```

15. plan:check 有 warning → 按标签重写后再检查（常见：`[post-answer]` 答步口播判对错、`[read-problem]` 审题环节有误互动、`[stage-interaction]` 某 group 缺互动、`[banned]` 开场禁用语）
16. 在对话里附讲法摘要；**自动**进入 course-arrange / codegen-lesson。刷新看板：`npm run pipeline:board -- <courseId>`（`planOk` 自动推断）

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

- [ ] 每个环节槽位都有内容：除 group 1（problemBrief 兜底）外每个 group 至少一张右栏卡；「从哪入手」有范式级 strategy 短语卡，「提取已知」有数据卡
- [ ] problemBrief 已知/求必填、关键可选，无知识点字段；审题动画每步同步更新快照，未一次显示全部
- [ ] 右栏板书每拍用**新** `replaceKey` 往下叠；禁止同 key 覆盖前序 working/compute
- [ ] left-right 多环节使用 interleaved；group 0 可重复，正文完整覆盖 1..guidanceChain.length
- [ ] 有左图变化的 step 含 `figure.actions[]`（非仅 note 一句话）
- [ ] example 的 `quickQA[]` 为 3–5 道本题具体数据/关系题，均有唯一标准答案；不是开放题，且 `quickQALayout` 为 `above-body`
- [ ] practice 未在 plan 中硬编码拍照 action 或作答结果 push；入口后由 codegen 自动插入拍照动作并衔接讲解
- [ ] 各环节展开深度与其 `difficulty` 匹配（难段成倍展开、易段简短）；难点环节没有为压总步数而合并「为什么」；quickQA 仅 example
- [ ] 无 banned 子串；问题步有 userResponse；compute 有 push
- [ ] 含「体积 ⅓ / 同底同高」的互动步：左图是**体积份数**对比，未用 `heightRatio` 画「高度 1/3」

## 禁止

- 未经确认修改 outline 环节链
- 把 action/figure 写回 outline
- 有图题在 **图形 OK** 前填 plan

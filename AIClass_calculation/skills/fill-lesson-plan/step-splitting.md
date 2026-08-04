# 阶段拆分与右栏 push 约定

fill-lesson-plan 阶段必读。本仓仅纯计算题（`layout: top-split`）。**上屏骨架**见 [calc-teaching-spine.md](../lesson-plan/calc-teaching-spine.md)；类名见 [calculation-marks.md](../lesson-plan/calculation-marks.md)；**公式 fit / 滚动 / 预览**见 [calc-engine-layout.md](../lesson-plan/calc-engine-layout.md)。

## action 命名

**硬契约**（与 module_template 对齐，plan:check 会拦）：

```text
{前缀}_开始 → {前缀}_要点_起 → {前缀}_要点_条* → [可选 _要点_问/答]
→ {前缀}_详解_起 → {前缀}_详解_步NN → {前缀}_答案
```

**禁止**：`{前缀}_要点_审题|所求|策略|入手|分析`、详解首步推【详解】section、要点阶段超过 4 个 action。

~~也可沿用通用形 `{前缀}_步骤{NN}_{动词}_{简述}`~~ — **计算题禁用**，易滑向文字题模板。

## region（top-split）

| region | 何时用 | 展示方式 |
|--------|--------|----------|
| top | 入口题干 | `calc-stem` / `calc-eq` |
| left | 要点展开、详解累加、答案 | `.calc-*` 类名见 calculation-marks |
| right | 钉住要点摘要 | `calc-key-pin`；详解步 `retainPush` |
| left/right | oral / choice | 互动卡 |

### 右栏累积＝往下叠加

“累积”指**每拍新增板书往下追加**，前序内容保留可见——**不是**用后拍 snapshot 原位盖掉前拍。

- 每拍只写**本拍新增**行；用**新的** `replaceKey`（题内语义，如 `{id}:tri-half`、`{id}:tri-fold`）→ 运行时 `append` 往下叠
- **禁止**多步 working/compute 共用一个 `replaceKey` 再推「只有本拍新句」的 snapshot（会整卡覆盖，前序板书消失）
- `replaceKey` **仅**用于真·改写同一语义槽：口答揭晓挂回、刻意修正同一行、strategy 卡原地改措辞等
- 不同阶段（要点/详解）的内容本来就各自保留；同阶段内靠**不同 key** 往下排

`replaceKey` 命名用题内语义槽，例如 `{id}:rect-count`、`{id}:tri-half`。不得强制使用 readStem/formula/compute 后缀。

### 屏幕文字极简（口播讲理，屏幕留证）

硬性口径——短语级、字数上限（汉字 ≤ 24 / 选项 ≤ 12）、**屏幕用数学符号而汉字读法只属于口播**、结论上屏不上推导、图上标注数字/词语级——**唯一权威是 [teaching-design.md](../lesson-outline/teaching-design.md) 第四节**，此处不重复。fill 阶段另注意：

- 互动题面与选项从 outline `interactions[]` 原样落屏，选项保持短语级
- 自检法：把某步口播静音，屏幕剩下的应是「能抄进笔记的板书」，而不是一段课文

### 纯计算逐步揭示（对齐 module_template）

- **一 action 尽量只上屏一小步**：不要把多行化简捆在同一步
- 入口：`region:"top"` 题干（`calc-stem` / `calc-eq`），不见答案
- 要点：`calc-label--key` + `calc-key-list`（1～2 条）；关键词可用 `calc-em`
- 详解：每拍 `calc-solve-note` + `calc-solve-step`；详解起钉右栏要点并 `retainPush`
- **`calc-solve-step` 的 `tex` 写完整一行**；引擎自动 **先缩字、再在 `=`/除号处断行**（不在 `+`/`-` 处断行）——见 [calc-engine-layout.md](../lesson-plan/calc-engine-layout.md)；禁止 `\\` 手工换行
- 答案晚出：`calc-answer--final` + `highlightAnswer`
- 传参表见 [calculation-marks.md](../lesson-plan/calculation-marks.md)
- 互动步尽量只放 choice/oral，不夹带大块板书

### 题干与要点（禁止 problemBrief 上屏）

- 禁止 plan 写上屏 `problemBrief`，禁止 `card: "readStem"`，禁止上屏 `knowledge`
- 策略进要点区，演算进详解区——二者不得混写
- 传参见 [calculation-marks.md](../lesson-plan/calculation-marks.md)

## 环节内微步展开（from → get 的路要一步步走）

**outline 只给宏观流程，fill 的核心职责是把每个大环节铺成微步。** 每个 stage 的 `loop.from` 是起点、`loop.get` 是终点声明——**`get` 永远不是某一步的展示内容**，禁止把它整块搬上屏或一口气念完；结果必须带着学生现场一步步**列出来**：

- 每个中间量的出现、每次代入、每次作差/变形/配方，都是独立一拍：先口播这一步在干什么、为什么（难点按动机 → 操作 → 回看），屏幕只落这一拍新增的那一行
- 例（build-height，`get` 为「BC：y＝-x+3，H（m，-m+3），PH＝-m²+3m」）：缺的是 P 到 BC 的高、纵坐标顶不上（动机）→ 由 B、C 现场求出 BC（一拍）→ 设 m 得 P 坐标（一拍）→ 作 PH∥y 轴、讲清为什么竖着作（一拍）→ x＝m 代入 BC 得 H（一拍）→ 纵坐标作差得 PH（一拍）——六拍走完，而不是三行结果一次亮出
- 屏幕算式**往下叠加**：每拍新 push 一条（新 `replaceKey`），学生看着板书往下长，前序行不消失
- 认知关键的一跃尽量交给互动，让学生自己迈（见下「互动步」）

## 按动态教学目标拆分

- 一步一个认知 beat；同一 stage 内可以“展示 → 提问 → 揭晓 → 小结”
- **难点环节一个「为什么」一拍**：动机（此刻缺什么、为什么想到这个工具）、操作、回看各占一步，关键一步尽量留给互动让学生自己迈；易段一两拍带过
- **总步数没有上限**：由逻辑链长度和难点数量决定，展开深度只看各段 `difficulty`（没有步数预算字段），禁止为凑固定步数（如 8 步）合并难点
- 模型、公式、关键关系或互动目的变化时，进入下一个 stage
- card 类型由当前内容决定，不由 phase/slug 决定
- `phase` 写当前阶段的中文名（开场 / 要点 / 详解 / 答案），纯展示用

## 开场步与收尾步

- **开场步**（`{前缀}_开始`，固定 `id: "start"`）：约 30 秒口播，内容来自 outline `positioning`（hook → 代表性 → 普遍性/真题背景），不讲题、不报已知；题干 push `region: "top"`
- **收尾步**（最后一个 `算` 步）：报答案后必须口播 outline `closing.recap`（星级拼装复盘）＋ `takeaway`，再庆祝收束（`closing.win` 变体）

## 互动步（问/答步对）

- **开场步禁止互动**（硬契约见 [reference.md](../lesson-plan/reference.md)）：只上题干与口播，不设问/答步；互动从**要点提问条**或**详解步**开始
- **详解阶段至少一道互动**：outline 设计的考点级 `interactions[]` 优先，`ask` / `options` / `answer` 原样落入 push 与 `userResponse`，不得改题；outline 没覆盖到的难点，fill 从详解微步里挑**认知关键的一小步**，改写成**过程级简单小问**（选择 / 口答 / 填空），答案就是该微步的结论（如「把 x＝m 代入 BC，H 的纵坐标是多少？」），同样必填 `answerType` / `userResponse`
- 过程级小问保持简单直接（一步之内能答），不另造考点、不与 outline 互动重复；考点级互动仍只能来自 outline
- 问步：动词 `问`，push 用 `oral` / `choice` / `fill`（与 `form` 对应），必填 `answerType`、`userResponse`（按「意思相近即可」口径，含常见等价说法）
- 揭晓格式因 widget 而异：`oral` 两段式——答步再 push `{ attachStepId, answer }` 挂回问卡；`choice` 单段式——`answer` 与 `question`/`options` 写在问步**同一个 push**，运行时步过自动揭晓，答步只口播不再 push（见 reference.md「揭晓方式两种」）
- 问步口播 = 铺垫＋问句，语气有热情、有节奏感；问句本身与屏幕题面一致
- 答步：动词 `答`，紧跟问步；口播中立揭晓并继续推导，**不得**口播对/错或假定学生答对（硬契约见 [reference.md](../lesson-plan/reference.md)「互动揭晓步口播」）；可用 `interaction.reveal` / `interaction.comfort` 的中性过渡变体
- 位置：放在该环节的认知关键点上（答案是解锁下一步的钥匙），不放在环节末尾凑数

## 布局与字段

- plan 顶层必填 `"layout": "top-split"`
- **每个区域不得空白**：`region: "top"` 题干常驻；要点阶段左栏落 `calc-key-*`；详解阶段左栏落 `calc-solve-*`、右栏钉要点（`calc-key-pin`）；答案落 `calc-answer--final`
- 预览须满足 [calc-engine-layout.md](../lesson-plan/calc-engine-layout.md) 清单（与单题无关，全课统一）
  - 「从哪入手」：把 `entryPoint.strategy` 压成要点短语（4–12 字），操作留给详解
  - 纯口播过渡步可以无 push，但要点与详解阶段不能一张卡都没有
- 详解阶段用 `retainPush` 保留右栏钉与已讲左栏行；新行往下叠

## 每步必填

- `id`（题内短 id 如 `s01`，**不预拼** plan.id 前缀——codegen 自动拼）, `action`, `phase`
- `agent.type`（**必填**，schema 强制：讲解/展示/揭晓/计算步写 `explain`，互动问步写 `ask`）
- `agent.description`（**TTS 逐字稿**，纯中文，见下「口播」）
- 问题步：`answerType`, `userResponse`；问后必有答步
- **答步 / 过渡口播步**可以无 `push`（仅口播）；运行时不得插入 action 占位文字
- 正文/公式/计算/互动步：`push` 按本题教学意图选择
- 左栏追加板书：每拍本拍新增行 + 新的题内语义 `replaceKey`（勿复用 key 覆盖）

## 口播（agent.description ＝ TTS 逐字稿）

契约**唯一权威是 [reference.md](../lesson-plan/reference.md)「agent.description ＝ TTS 逐字稿」**：纯中文汉字（数字/算式写读法，几何点名可留大写字母）、符号一律写读法（加/减/乘/除/三角形/角/度/根号，单位写汉字）、禁括号屏幕说明（制作备注归 `moduleNote`）、只用中文标点。fill 阶段另注意：

- 一步一个 beat；超 ~100 字拆两步
- phrase-bank 组合开场，记录 `phraseIds`，禁 banned

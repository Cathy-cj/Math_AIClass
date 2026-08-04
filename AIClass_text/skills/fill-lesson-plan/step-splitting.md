# 阶段拆分与右栏 push 约定

fill-lesson-plan 阶段必读。本仓仅纯文字题（`layout: text-only`）。

## action 命名

`{前缀}_步骤{NN}_{动词}_{简述}`

| 动词 | 用途 |
|------|------|
| 开始 | 开场一步 |
| 展 | 展示、讲解、过渡 |
| 问 | 互动提问（配答步） |
| 答 | 揭晓上一问 |
| 亮 | 图上亮标数据 |
| 算 | 列式计算 |

前缀由题型定，如组合体 `体1_`、例题 `例1_`。

## 右栏 region / card

| region | card | 何时用 | 展示方式 |
|--------|------|--------|----------|
| top | — | 仅开场 | 题干全文，一步 |
| right | 题内语义名 | 当前动态环节 | 按教学意图选择 note/formula/working/ammo |
| right | — | oral / choice | 互动卡，不占 text 卡 |

### 右栏累积＝往下叠加

“累积”指**每拍新增板书往下追加**，前序内容保留可见——**不是**用后拍 snapshot 原位盖掉前拍。

- 每拍只写**本拍新增**行；用**新的** `replaceKey`（题内语义，如 `{id}:tri-half`、`{id}:tri-fold`）→ 运行时 `append` 往下叠
- **禁止**多步 working/compute 共用一个 `replaceKey` 再推「只有本拍新句」的 snapshot（会整卡覆盖，前序板书消失）
- `replaceKey` **仅**用于真·改写同一语义槽：口答揭晓挂回、刻意修正同一行、strategy 卡原地改措辞等
- 不同 group 的内容本来就各自保留；同 group 内靠**不同 key** 往下排

`replaceKey` 命名用题内语义槽，例如 `{id}:rect-count`、`{id}:tri-half`。不得强制使用 readStem/formula/compute 后缀。

### 屏幕文字极简（口播讲理，屏幕留证）

硬性口径——短语级、字数上限（汉字 ≤ 24 / 选项 ≤ 12）、**屏幕用数学符号而汉字读法只属于口播**、结论上屏不上推导、图上标注数字/词语级——**唯一权威是 [teaching-design.md](../lesson-outline/teaching-design.md) 第四节**，此处不重复。fill 阶段另注意：

- 互动题面与选项从 outline `interactions[]` 原样落屏，选项保持短语级
- 自检法：把某步口播静音，屏幕剩下的应是「能抄进笔记的板书」，而不是一段课文

### text-only 逐步揭示（对齐 module_template）

- **一 action 尽量只上屏一小步**：不要把多条已知、多行算式捆在同一步
- 审题：先 `已知` lead 一条 → 再 hang 行追加 → 再 `求`；同步用 `stemClass` 点亮题干（红）
- 开场题干用 `class: "tx-stem"` + `tx-stem-mark--*`（未点亮）；讲解关键词用 `--em`（黄）；得数用 `--green`
- 高亮/标签传参表见 [text-only-marks.md](../lesson-plan/text-only-marks.md)
- 后续推导同样逐步追加；互动步尽量只放 choice/oral，不夹带大块板书

### 审题上屏（section，禁止 problemBrief）

- 用 `section`「已知/求」逐步揭示；禁止 plan 写 `problemBrief`，禁止 `card: "readStem"`，禁止上屏 `knowledge`
- 审题步骤 `group: 1`；一 action 一条已知或一行 hang，最后再上「求」
- 传参见 [text-only-marks.md](../lesson-plan/text-only-marks.md)

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
- `phase` 写本题 stage 的中文标题；生成器只依据 `guidanceChain + group` 路由，不解析名称

## 开场步与收尾步

- **开场步**（`{前缀}_开始`，`group: 0`）：约 30 秒口播，内容来自 outline `positioning`（hook → 代表性 → 普遍性/真题背景），不讲题、不报已知；题干 push `region: "top"`
- **收尾步**（最后一个 `算` 步）：报答案后必须口播 outline `closing.recap`（星级拼装复盘）＋ `takeaway`，再庆祝收束（`closing.win` 变体）

## 互动步（问/答步对）

- **审题环节（group 1）禁止互动**（硬契约见 [reference.md](../lesson-plan/reference.md)「审题环节禁止互动」）：只写 section 已知/求与口播，不设问/答步
- **其余大环节（group 2..N）至少一道互动**：outline 设计的考点级 `interactions[]` 优先，`ask` / `options` / `answer` 原样落入 push 与 `userResponse`，不得改题；outline 没覆盖到的环节，fill 从该环节微步里挑**认知关键的一小步**，改写成**过程级简单小问**（选择 / 口答 / 填空），答案就是该微步的结论（如「把 x＝m 代入 BC，H 的纵坐标是多少？」），同样必填 `answerType` / `userResponse`
- 过程级小问保持简单直接（一步之内能答），不另造考点、不与 outline 互动重复；考点级互动仍只能来自 outline
- 问步：动词 `问`，push 用 `oral` / `choice` / `fill`（与 `form` 对应），必填 `answerType`、`userResponse`（按「意思相近即可」口径，含常见等价说法）
- 揭晓格式因 widget 而异：`oral` 两段式——答步再 push `{ attachStepId, answer }` 挂回问卡；`choice` 单段式——`answer` 与 `question`/`options` 写在问步**同一个 push**，运行时步过自动揭晓，答步只口播不再 push（见 reference.md「揭晓方式两种」）
- 问步口播 = 铺垫＋问句，语气有热情、有节奏感；问句本身与屏幕题面一致
- 答步：动词 `答`，紧跟问步；口播中立揭晓并继续推导，**不得**口播对/错或假定学生答对（硬契约见 [reference.md](../lesson-plan/reference.md)「互动揭晓步口播」）；可用 `interaction.reveal` / `interaction.comfort` 的中性过渡变体
- 位置：放在该环节的认知关键点上（答案是解锁下一步的钥匙），不放在环节末尾凑数

## guidance 与 group（text-only 必做）

- Plan 顶层必须写 `"guidanceLayout": "interleaved"`
- 可见正文 group 从 1 开始，与 `guidanceChain[]` 一一对应；`group: 0` 仅用于开场
- 正文必须完整覆盖 `1..guidanceChain.length`，不允许缺号或越界
- 讲解 push（默认进 slot；也可显式 `region: "main"` / `"right"`）必须进入本 group 的 `.cc-guide-slot`
- **每个环节槽位不得空白**（desc 已废弃）：group 1 由 section「已知/求」填满；其余每个 group 至少落一张卡——
  - 「从哪入手」环节：把 outline `entryPoint.strategy` 压成**范式级**短语卡（4–12 字，如「化整为零」；如 `replaceKey: "{id}:strategy"`）。操作步骤不进此卡，留给推导 group
  - 「提取已知」环节：落数据/亮标卡（`card: "ammo"`）
  - 纯口播过渡步可以无 push，但**整个 group** 不能一张卡都没有
- 切换到下一 group 后，已完成 group 的内容继续保留；同 group 内板书靠不同 `replaceKey` 往下叠

## 每步必填

- `id`（题内短 id 如 `s01`，**不预拼** plan.id 前缀——codegen 自动拼）, `action`, `phase`, `group`
- `agent.type`（**必填**，schema 强制：讲解/展示/揭晓/计算步写 `explain`，互动问步写 `ask`）
- `agent.description`（**TTS 逐字稿**，纯中文，见下「口播」）
- 问题步：`answerType`, `userResponse`；问后必有答步
- **答步 / 过渡口播步**可以无 `push`（仅口播）；运行时不得插入 action 占位文字
- 正文/公式/计算/互动步：`push` 按本题教学意图选择
- 右栏追加板书：每拍本拍新增行 + 新的题内语义 `replaceKey`（勿复用 key 覆盖）
- 侧栏 `guidanceChain[].title` 在大纲阶段已定，fill 时只复制 title；**不写 `desc` / `guidanceDesc`**（已废弃）

## 口播（agent.description ＝ TTS 逐字稿）

契约**唯一权威是 [reference.md](../lesson-plan/reference.md)「agent.description ＝ TTS 逐字稿」**：纯中文汉字（数字/算式写读法，几何点名可留大写字母）、符号一律写读法（加/减/乘/除/三角形/角/度/根号，单位写汉字）、禁括号屏幕说明（制作备注归 `moduleNote`）、只用中文标点。fill 阶段另注意：

- 一步一个 beat；超 ~100 字拆两步
- phrase-bank 组合开场，记录 `phraseIds`，禁 banned

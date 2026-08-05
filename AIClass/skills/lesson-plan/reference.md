# lesson-plan 规范（共享 reference）

本目录为 **多 Skill 共享**规范，不是单独 @ 的大 Skill。见各 Skill 的 SKILL.md。

## 职责边界

| 层级 | outline | plan |
|------|---------|------|
| 粒度 | 本题**大环节** + **解析/列式** | **逐步** action、动画、互动、口播 |
| 人工审 | —（auto `outlineOk`） | —（auto `planOk`）；**图形 OK** 为唯一人工停点 |
| 禁止 | `action`、`figureState`、`pushKind`、逐步 `beat` | — |

## 文件

| 文件 | 用途 |
|------|------|
| [reference.md](reference.md) | plan / outline schema |
| [phase-routing.md](phase-routing.md) | 讲法配方、阶段路由 |
| [phrase-bank.json](phrase-bank.json) | fill 阶段选句 |
| [phrase-bank.md](phrase-bank.md) | 组合规则说明 |

## 两阶段产物

| 阶段 | 路径（唯一产物） | 推进 |
|------|------|--------|
| 大纲 | `lesson/{id}/outline.json` | `plan:check` 通过 → auto `outlineOk` |
| 图形 | `figure-spec.json` + preview | **图形 OK**（有图时，唯一人工停点） |
| 讲法 | `lesson/{id}/plan.json` | `plan:check` 通过 → auto `planOk` |

**AI 只输出 json，不导出 md 稿**；`outline:export` / `plan:export` 仅供人工自愿使用。

## outline.json schema

```json
{
  "id": "vol1",
  "title": "...",
  "stem": "...",
  "answer": "62.8",
  "unit": "立方分米",
  "moduleType": "example",
  "difficulty": 4,
  "figureTemplate": "cylinder-cone-stack",
  "knowledgeTags": [],
  "lessonContext": {
    "slot": "standalone",
    "archetype": "compositeSplit",
    "unitIntro": false,
    "afterPlanId": null
  },
  "analysis": "由图可知，圆柱和圆锥底面积相等…",
  "solution": ["3.14×2²＝12.56（平方分米）", "…"],
  "analysisModel": {
    "stem": { "known": [], "ask": "", "knowledge": [], "key": "" },
    "logicChain": ["…"],
    "computeSteps": ["3.14×2²=12.56", "…"]
  },
  "problemBrief": {
    "known": ["圆柱和圆锥共用同一个圆底", "r＝2dm，h柱＝4dm，h锥＝3dm"],
    "ask": "组合体的总体积",
    "key": "共用底面积别漏"
  },
  "positioning": {
    "represents": "本题代表哪类题、在单元/题型谱系中的位置",
    "generalSkill": "带走的通用方法、以后哪里还会用",
    "examRelevance": "可选：真题/考试背景",
    "hook": "开场悬念一句话"
  },
  "entryPoint": {
    "stuckPoint": "学生为什么会卡住、卡在哪",
    "observe": "第一眼观察什么",
    "strategy": "解题思维范式（4–12 字，可迁移同类题；非操作步骤，如「化整为零」）",
    "rejectedPaths": ["可选：排除的死路及原因"]
  },
  "teachingStages": [
    {
      "slug": "split-solid",
      "title": "倒推·拆开组合体",
      "goal": "先 S，再 V柱 + V锥",
      "approach": "拆上下两段，引出两个体积公式",
      "loop": { "from": ["共用圆底", "r＝2dm"], "get": "S＝12.56，两段体积可分别求" },
      "difficulty": 3,
      "linkBack": "可选：复用的旧知识/前面环节结论",
      "trap": "可选：本段陷阱",
      "interactions": [
        {
          "form": "choice",
          "ask": "…",
          "options": ["…", "…"],
          "answer": "…",
          "tests": "考察什么（必填，禁 1+1 式）"
        }
      ]
    }
  ],
  "closing": {
    "recap": "星级拼装复盘：五星＝二星分段＋四星转弯＋三星陷阱",
    "takeaway": "一句话带走"
  },
  "quickQASkeleton": [
    {
      "form": "判断（故意说错）",
      "question": "圆锥体积和圆柱体积公式相同，对不对？",
      "answer": "不对，圆锥体积要乘三分之一",
      "tests": "辨析本题使用的体积公式"
    }
  ],
  "outlineStatus": "draft"
}
```

### 内部分析与屏幕展示契约

- `analysisModel` 只供 Agent 分析与人工审大纲；`knowledge` 永不进入课件展示。
- `problemBrief` 是审题环节的固定内容：`known`、`ask` 必填，`key` 可选；由统一组件嵌入第一环节，不单独出卡。
- `positioning` / `entryPoint` / `closing` 与各环节的 `loop` / `difficulty` / `linkBack` / `trap` / `interactions[]` 是**备课设计字段**（见 [teaching-design.md](../lesson-outline/teaching-design.md)），供人工审大纲与 fill 阶段展开口播，不直接进入屏幕。
- `teachingStages[]` 骨架（example/practice）：**`read-problem / 审题环节` → `entry-point / 从哪入手` → 推导环节×N（题目专属命名，各带 `loop`）→ 提取已知（短链题可并入列式）→ 列式计算**。

### teachingStages[] 字段

| 字段 | 说明 |
|------|------|
| `slug` | 题内唯一的英文短标识，描述本题任务；不得套固定 phase 菜单 |
| `title` | 中文环节名（展示用） |
| `goal` | 本段要建立的解题理解 |
| `approach` | 本段讲法要点（**不含** action / 动画 state 名） |
| `loop` | 推导环节必填：`{ from: [本轮依据], get: "本轮求出的新量" }`，上一轮 `get` 进下一轮 `from` |
| `difficulty` | 推导环节星级（与全题同尺度），用于难度播报与收尾拼装 |
| `linkBack` | 可选：本段复用的旧知识/前面环节结论 |
| `trap` | 可选：本段陷阱（审题陷阱写在 read-problem 上） |
| `interactions[]` | 备课设计的互动题：`form`（oral/choice/fill）、`ask`、`options`（choice）、`answer`（意思相近口径）、`tests`（必填） |

`outlineStatus`: `draft` | `approved`

**不得出现**：`stepSkeleton`、`stepBudget`（已废弃——步数预算只会限制展开，深度由 `difficulty` 决定，见 teaching-design「难点展开」）、`guidanceChain`（已并入 `teachingStages[]`）、`guidanceDesc` / `desc`（已废弃，课件不再展示环节副标题）、`action`、`figureState`。

### 例题快问快答

- 仅 `moduleType: "example"` 写 `quickQASkeleton`，数量为 **3–5 条**；`practice` / `homework` 不写。
- `quickQASkeleton[]` 用字段 **`question`**（与 `teachingStages[].interactions[]` 的 **`ask`** 不同对象，勿混用）。
- 每题必须针对**本题**已经出现的具体条件、图形关系、公式辨析或计算中间量，且有唯一、明确的标准答案。
- 题型只用判断、单空、短答案；允许“故意说错”的判断题。禁止问思路、方法选择或感受等开放问题。
- 快问快答绑定该例题，但不是独立 problem，也不属于 `teachingStages[]`。

## plan.json

从 approved outline 的 `teachingStages[]` + `analysisModel` **展开**为 `steps[]`（fill-lesson-plan 阶段才定 action / figure / push）。

### 顶层额外字段

- `lessonContext` — 从 outline 复制
- `outlineId` — 同 id
- `phraseIds` — 可选，fill 时记录的 phrase-bank id
- `problemBrief` — 从 outline 原样复制；`known`、`ask` 必填，`key` 可选，不得加入 `knowledge`
- `guidanceChain` — 从 outline `teachingStages[]` 复制**仅 `{ title }`**，不写 `desc`；课件播放时**不得**再改
- `guidanceLayout` — left-right 且含 guidanceChain 时固定为 `interleaved`，使每个 group 的内容进入对应环节卡
- `source` — 仅填写真实题目来源；未知时留空，不用题型名称代替
- `quickQA` — 仅例题填写。它是独立于 `steps[]` 的顶部快问快答配置；codegen 自动产生打开、显示问题、显示答案动作。
- `quickQALayout` — 例题固定为 `"above-body"`，把快问快答显示在例题容器顶部。

### 顶部题号契约

- Plan 只声明 `moduleType`、真实 `source` 与课程顺序，不手写“例1/练1”
- codegen 按课程内同类型顺序生成：`example → 例N`、`practice → 练N`、`homework → 作业N`
- 完整 `title` 是模块标题，不作为 `.course-label`

### plan step 对象

每步含 `id`、`action`、`phase`（题内中文 title）、`group`、`agent`、`figure`、`push`、`moduleNote`。仅开场使用 `group: 0`；读图/审题步骤属于第一环节并使用 `group: 1`，后续环节按 `teachingStages[]` 顺序连续编号。

- `id`：**题内短 id**（`start`、`s01`、`s02`…），题内唯一即可；codegen 落地时自动拼成 `{plan.id}_{step.id}`，plan 里**不要**自己预拼前缀。`attachStepId` 引用的也是这个短 id。
- `agent`：`{ "type": "...", "description": "..." }` **两个字段都必填**（schema 强制）。`type` 取 `explain`（讲解/展示/揭晓/计算步）或 `ask`（互动问步）；引擎不按 type 分支渲染，但缺失会过不了 `course:check`。

**禁止**在任何层级写 `guidanceDesc` / `desc`（已废弃）。

#### agent.description ＝ TTS 逐字稿

`agent.description` 是给 AI TTS 朗读的**逐字稿**，只写 AI 老师要说出口的话：

- **全部中文汉字**：数字、算式写读法（「三点一四乘四等于十二点五六」「二分之一」），不出现阿拉伯数字、小写字母、LaTeX；几何点名可保留大写字母（「三角形ABD」，TTS 按字母读）
- **禁止特殊符号**：＋−×÷＝ 写「加/减/乘/除/等于」，△ 写「三角形」，∠ 写「角」，° 写「度」，% 写「百分之」，√ 写「根号」，单位写汉字（「平方分米」）
- **不写括号说明**：屏幕/动画内容不进逐字稿——动画细节写 `figure.note` / `figure.actions[]`，给制作者的备注写 `moduleNote`
- 标点只用中文标点（，。？！、：；……）

**互动揭晓步口播（答步）**：action 含 `_答_`、push 含 `attachStepId` 的 oral 揭晓步、或 choice 问步之后仅口播的答步——

- **禁止**口播判定学生对错（对/错/没错/不对/答对了/答错了/你说得对 等），**禁止**假定学生已答对（如「对，就是…」）
- **应写**中立揭晓标准要点并继续推导（「这里要看…」「标准做法是…」「不管刚才怎么选，关键在…」）
- 屏幕 widget 仍可高亮正确项；口播与屏幕判定分离

**审题环节禁止互动（group 1）**：`guidanceChain[0]` 固定为「审题环节」，对应 `group: 1`——

- **禁止**任何互动问/答：不得写 `userResponse`；不得 push `oral` / `choice` / `fill` 问卡
- outline 的 `read-problem` 阶段不得写 `interactions[]`
- 审题只做 `problemBrief` 渐进快照 + 口播（陷阱点名、知识预告、难度播报等）

**其余大环节（group 2..N）**至少一道互动：outline 考点级 `interactions[]` 优先；未覆盖的环节由 fill 补过程级简单小问（细则见 [step-splitting.md](../fill-lesson-plan/step-splitting.md)）。

#### 互动来源（两层）

| 层级 | 来源 | fill 可否新造 |
|------|------|---------------|
| **考点级** | outline 各推导环节的 `interactions[]` | **否**——`ask` / `options` / `answer` / `tests` 原样落入 push |
| **过程级** | fill 从该环节微步挑关键一小步改写 | **是**——仅用于满足 group 2..N 覆盖率；一步能答、不另造考点 |

#### push 类型

**屏幕极简与符号契约**（唯一权威：[teaching-design.md](../lesson-outline/teaching-design.md) 第四节）：push 上屏只留短语级关键信息（汉字 ≤ 24 / 选项 ≤ 12，题干置顶除外）；**屏幕用数学符号**（`△ABD` / `S△ABD` / `∠A` / `cm²`），汉字读法只属于口播。

**每个环节槽位必须有内容**：除 group 1（`problemBrief` 自动嵌入兜底）外，每个 group 至少落一张右栏卡；「从哪入手」落 `entryPoint.strategy` 范式级短语卡（4–12 字，非操作步骤），「提取已知」落数据卡（拆步细则见 [step-splitting.md](../fill-lesson-plan/step-splitting.md)）。

禁止生成 `card: "readStem"` 或在 push 中展示“知识点”。已知/求/关键统一由 `problemBrief` 嵌入审题环节的 `.cc-guide-slot`，不会被步骤清理。

审题每步用 `step.problemBrief` 声明当前完整显示快照，并与 Figure 动画同步：

```json
{ "group": 1, "problemBrief": { "known": 1 } }
{ "group": 1, "problemBrief": { "known": 2, "ask": true } }
{ "group": 1, "problemBrief": { "known": 2, "ask": true, "key": true } }
```

`known` 表示显示前 N 条已知。快照必须单调增加；“求”先于“关键”出现。禁止容器创建时一次显示全部内容。

**口答 / 选择 / 填空**（互动步；考点级题目来自 outline，过程级小问见上表）：

```json
{ "type": "oral", "region": "right", "badge": "口答", "question": "…" }
{ "type": "oral", "attachStepId": "s09", "answer": "相等" }
{ "type": "choice", "region": "right", "question": "…", "options": ["12.56", "25.12"], "answer": "12.56" }
{ "type": "fill", "region": "right", "parts": [
  { "kind": "text", "value": "3.14×4÷4＝" },
  { "kind": "blank", "answer": "3.14", "placeholder": "?" },
  { "kind": "text", "value": "（cm）" }
] }
```

#### 用户提交与练题拍照协议

- 互动上行严格为裸对象（`protocolKind` 归一）：选择 `{ type: "user_submitted", kind: "course_choice", value }`，填空/连线为 `course_fill`，口答为 `voice`；不得带 `source`、`status`、action、题目或上下文字段。非拍照且无 `value` 时不上报。
- 拍照请求严格为 `{ type: "user_submitted", kind: "course_photo" }`，无 `value`；宿主以 `{ type: "photo_result", value }` 回传 OCR 内容（同样不得附加其他字段）。
- `practice` 的拍照动作由 codegen 自动生成并紧跟开始动作；plan 不写拍照 action、回显 action 或清除 action。OCR 可含 LaTeX，运行时回传 `answer_result_shown`，不推进教学步骤。

**揭晓方式两种，不要混用**：

- `oral` 是**两段式**：问步只 push 问题；答步再 push `{ "attachStepId": "<问步短id>", "answer": "…" }` 把答案挂回问卡。
- `choice` 是**单段式**：`question` / `options` / `answer` 写在**同一个 push** 里，运行时在步骤过后自动揭晓对错，**不写**第二个揭晓 push。
- `options` 可以是字符串数组，也可以是 `{ "value": "…", "label": "…" }` 对象数组；`answer` 必须命中某个选项的 value（纯字符串选项时 value 就是字符串本身），否则 `course:check` 报 `Choice answer is not present in options`。

**算式区**（`card`: `formula` | `ammo` | `compute` | `working`，往下叠加）：每拍本拍新增行 + **新** `replaceKey`；禁止多步共用同一 key 覆盖前序板书。

```json
{
  "type": "text",
  "region": "right",
  "card": "compute",
  "replaceKey": "vol1:compute-s",
  "lines": ["底面积：3.14×2²＝12.56（dm²）"]
}
```

**题干置顶**（仅开场）：`region: "top"`，无 `card`。

#### quickQA 顶部配置

`quickQA` 不进 `steps[]`，也不写进 `push`。它绑定当前例题的模块，由运行时在顶部单题显示：

```json
{
  "quickQALayout": "above-body",
  "quickQA": [
    {
      "id": "qa1",
      "question": "圆心走的路比 AB 长，对不对？",
      "answer": "不对，一样长"
    },
    {
      "id": "qa2",
      "question": "圆心在 B 点转直角弯，转了＿＿圈。",
      "answer": "四分之一",
      "fillBlank": true
    }
  ]
}
```

- `quickQA` 数量为 3–5，每题的 `id` / `question` / `answer` 必填。
- AI 播放顺序是：打开一次 → 显示问题 → 留出作答时间 → 显示答案；每题重复后再进入练题。
- 这是口头自答后揭晓的检查，不采集学生答案；需要提交判定时使用正常 `choice` / `fill` 互动。

#### figure.state 命名

| 前缀 | 用途 |
|------|------|
| `default` | 完整图 |
| `intro_*` | 审题逐项读 |
| `split_*` / `formula_*` | 倒推、公式 |
| `compare_*` | 分段对比互动 |
| `ammo_*` | 提取亮标 |

**动画规格**：`figure.note`（L1 摘要）+ **`figure.actions[]`**（L2 逐步操作）+ 可选 `transition`；见 [figure-animation.md](../fill-lesson-plan/figure-animation.md)。

详见 [step-splitting.md](../fill-lesson-plan/step-splitting.md) 与 [reference.md](reference.md)。

## 命令

```bash
npm run plan:check   # 唯一必跑；md 导出脚本仅人工自愿使用
```

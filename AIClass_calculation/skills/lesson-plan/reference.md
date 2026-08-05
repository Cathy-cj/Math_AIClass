# lesson-plan 规范（共享 reference）

本目录为 **多 Skill 共享**规范，不是单独 @ 的大 Skill。见各 Skill 的 SKILL.md。

**本仓（纯计算）补充：**

- 口播/TTS/句库契约与 AIClass 同源（下文 `agent.description` 等）
- 屏幕呈现权威见 [calculation-marks.md](calculation-marks.md)（`layout: "top-split"`、`.calc-*`、要点 vs 详解）；运行时布局/公式 fit 见 [calc-engine-layout.md](calc-engine-layout.md)
- 禁止一切图形字段；无 `figureOk` 门禁

## 职责边界

| 层级 | outline | plan |
|------|---------|------|
| 粒度 | 本题**大环节** + **解析/列式** | **逐步** action、互动、口播 |
| 人工审 | —（auto `outlineOk`） | —（auto `planOk`） |
| 禁止 | `action`、`pushKind`、逐步 `beat`、`figureTemplate` | `figureTemplate`、`figure` |

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
- `problemBrief`（outline）：`known`、`ask` 必填，`key` 可选——**仅备课分析，不上屏**；课件题干/要点/详解传参见 [calculation-marks.md](calculation-marks.md)。
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

**不得出现**：`action`、`figureState`、`figureTemplate`。

### 例题快问快答

- 仅 `moduleType: "example"` 写 `quickQASkeleton`，数量为 **3–5 条**；`practice` / `homework` 不写。
- `quickQASkeleton[]` 用字段 **`question`**（与 `teachingStages[].interactions[]` 的 **`ask`** 不同对象，勿混用）。
- 每题必须针对**本题**已经出现的具体条件、数量关系、公式辨析或计算中间量，且有唯一、明确的标准答案。
- 题型只用判断、单空、短答案；允许“故意说错”的判断题。禁止问思路、方法选择或感受等开放问题。
- 快问快答绑定该例题，但不是独立 problem，也不属于 `teachingStages[]`。

## plan.json

从 approved outline 的 `teachingStages[]` + `analysisModel` **展开**为 `steps[]`（fill-lesson-plan 阶段才定 action / push）。

### 顶层额外字段

- `lessonContext` — 从 outline 复制
- `outlineId` — 同 id
- `phraseIds` — 可选，fill 时记录的 phrase-bank id
- **禁止** plan 顶层或 step 写 `problemBrief`（不上屏；备课字段留在 outline）
- `layout` — 必填，固定为 `"top-split"`（schema 强制）
- 呈现传参：`.calc-*`、要点/详解/答案 — 见 [calculation-marks.md](calculation-marks.md)
- `quickQA` — 仅例题填写。它是独立于 `steps[]` 的顶部快问快答配置；codegen 自动产生打开、显示问题、显示答案动作。
- `quickQALayout` — 例题固定为 `"above-body"`，把快问快答显示在例题容器顶部。

### 顶部题号契约

- Plan 只声明 `moduleType` 与课程顺序，不手写题号；不再填写或上屏题目来源
- codegen 按题型生成顶部标签：`example → 例`、`practice → 练`、`homework → 作业`（无序号）
- action 前缀用 `例_` / `练_` / `作业_`（与 `actionPrefix` 一致，无序号）
- 完整 `title` 是模块标题，不作为 `.course-label`

### plan step 对象

每步含 `id`、`action`、`phase`（题内中文 title）、`agent`、`push`、`moduleNote`。开场步固定 `id: "start"`；其后按「要点条 → 详解_起 → 详解_步k → 答案」顺序排步（见 [calculation-marks.md](calculation-marks.md)）。

- `id`：**题内短 id**（`start`、`s01`、`s02`…），题内唯一即可；codegen 落地时自动拼成 `{plan.id}_{step.id}`，plan 里**不要**自己预拼前缀。`attachStepId` 引用的也是这个短 id。
- `agent`：`{ "type": "...", "description": "..." }` **两个字段都必填**（schema 强制）。`type` 取 `explain`（讲解/展示/揭晓/计算步）或 `ask`（互动问步）；引擎不按 type 分支渲染，但缺失会过不了 `course:check`。

#### agent.description ＝ TTS 逐字稿

`agent.description` 是给 AI TTS 朗读的**逐字稿**，只写 AI 老师要说出口的话：

- **全部中文汉字**：数字、算式写读法（「三点一四乘四等于十二点五六」「二分之一」），不出现阿拉伯数字、小写字母、LaTeX；几何点名可保留大写字母（「三角形ABD」，TTS 按字母读）
- **禁止特殊符号**：＋−×÷＝ 写「加/减/乘/除/等于」，△ 写「三角形」，∠ 写「角」，° 写「度」，% 写「百分之」，√ 写「根号」，单位写汉字（「平方分米」）
- **不写括号说明**：屏幕内容不进逐字稿；给制作者的备注写 `moduleNote`
- 标点只用中文标点（，。？！、：；……）

**互动揭晓步口播（答步）**：action 含 `_答_`、push 含 `attachStepId` 的 oral 揭晓步、或 choice 问步之后仅口播的答步——

- **禁止**口播判定学生对错（对/错/没错/不对/答对了/答错了/你说得对 等），**禁止**假定学生已答对（如「对，就是…」）
- **应写**中立揭晓标准要点并继续推导（「这里要看…」「标准做法是…」「不管刚才怎么选，关键在…」）
- 屏幕 widget 仍可高亮正确项；口播与屏幕判定分离

**开场与要点前半段禁互动**：开场步（`start`）只上题干与口播，不得写 `userResponse`、不得 push `oral` / `choice` / `fill` 问卡；outline 的 `read-problem` 阶段不得写 `interactions[]`。互动从**要点提问条**（选择/口答）或**详解中间步**开始。

**详解阶段至少一道互动**：outline 考点级 `interactions[]` 优先（放难点步）；未覆盖处由 fill 从详解微步挑关键一小步补过程级简单小问（细则见 [step-splitting.md](../fill-lesson-plan/step-splitting.md)）。

#### 互动来源（两层）

| 层级 | 来源 | fill 可否新造 |
|------|------|---------------|
| **考点级** | outline 各推导环节的 `interactions[]` | **否**——`ask` / `options` / `answer` / `tests` 原样落入 push |
| **过程级** | fill 从该环节微步挑关键一小步改写 | **是**——仅用于保证详解阶段有互动；一步能答、不另造考点 |

#### push 类型

**屏幕极简与符号契约**（唯一权威：[teaching-design.md](../lesson-outline/teaching-design.md) 第四节）：push 上屏只留短语级关键信息（汉字 ≤ 24 / 选项 ≤ 12，题干置顶除外）；**屏幕用数学符号**（`△ABD` / `S△ABD` / `∠A` / `cm²`），汉字读法只属于口播。

**每个区域必须有内容**：题干进 `region: "top"`（固定常驻）；要点条进左栏（`calc-key-*`），其中入手策略落 `entryPoint.strategy` 范式级短语（4–12 字，非操作步骤），审题结论/数据清单并入要点条；详解 `calc-solve-*` 左栏逐步下叠、要点钉右栏（`calc-key-pin`）；答案落 `calc-answer--final`（拆步细则见 [step-splitting.md](../fill-lesson-plan/step-splitting.md)）。

禁止生成 `card: "readStem"` 或在 push 中展示“知识点”。题干进 `region:"top"`；策略进要点（`calc-label--key`）；演算进详解步——传参见 [calculation-marks.md](calculation-marks.md)，禁止一步甩出全部详解与答案。

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

### 宿主提交与拍照协议

- 普通互动上报严格为 `{ type: "user_submitted", kind, value }`，其中 `kind` 映射：
  choice → `course_choice`、fill/matching → `course_fill`、oral → `voice`。
- 拍照按钮只上报 `{ type: "user_submitted", kind: "course_photo" }`；`user_submitted` 禁止
  添加 `source`、`status`、action、context 或题目对象。
- 练题由 codegen 自动追加 `{actionPrefix}_作答_拍照`，排在开始 action 之后；宿主以
  `{ type: "photo_result", value }` 回传 OCR 文本与 LaTeX。回显不属于 plan step，不推进教学。

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

详见 [step-splitting.md](../fill-lesson-plan/step-splitting.md) 与 [reference.md](reference.md)。

## 命令

```bash
npm run plan:check   # 唯一必跑；md 导出脚本仅人工自愿使用
```

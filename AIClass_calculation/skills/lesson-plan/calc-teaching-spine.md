# 计算题上屏骨架（对齐 module_template）

**本文件是计算题「备课 → plan → 屏幕」映射的唯一权威。**  
Golden 参考：[`module_template/lesson/modules/01-calc-equations.js`](../../../module_template/lesson/modules/01-calc-equations.js)、[`numeric-arithmetic-sample.md`](../../../module_template/lesson/designs/numeric-arithmetic-sample.md)。

类名与 push 字段见 [calculation-marks.md](calculation-marks.md)。口播/TTS 见 [reference.md](reference.md)。

## 屏幕四段（fill 必须折叠到此）

```text
{前缀}_开始        → top：calc-stem + calc-eq（完整原式，禁止 ∑ 压缩除非原题即如此）
{前缀}_要点_*      → left：【要点】短条 1–2 条 + 可选 choice
{前缀}_详解_起      → right only：calc-key-pin 精简摘要（无 retainPush）
{前缀}_详解_步*     → left：calc-solve-note + calc-solve-step 一对一拍
{前缀}_答案         → left：calc-answer--final
```

**禁止**把 outline 的每个 teachingStage 各变成一个独立 action。

## outline 内部 → fill 上屏映射

| outline 环节（内部备课） | fill 落屏 | 禁止 |
|------------------------|-----------|------|
| read-problem + entry-point | 合并为 **1 次【要点】**：1–2 条 `calc-key-list` | `例_要点_审题/所求/策略/入手` 等独立 action |
| 推导 teachingStages | `calc-solve-note` + `calc-solve-step` 微步 | 整块 dump `loop.get`；详解首步推【详解】section |
| 提取已知 + 列式计算 | 并入详解最后几步 | 单独「要点_所求」「列式」action |
| entryPoint.strategy | 4–12 字范式，写入要点条或右栏钉 | 长段策略口号上屏 |

outline 仍可写 `read-problem → entry-point → 推导×N → 提取已知 → 列式`（思考链）；**fill 只产出上表四段**。

## Action 命名（硬契约）

| 阶段 | 允许 | 禁止 |
|------|------|------|
| 开场 | `{前缀}_开始` | — |
| 要点 | `{前缀}_要点_起`、`_要点_条1`、`_要点_条2`、`_要点_问`、`_要点_答` | `_要点_审题`、`_要点_所求`、`_要点_策略`、`_要点_入手`、`_要点_分析` |
| 详解 | `{前缀}_详解_起`、`_详解_步01`…（或 `_详解_步1`） | `_详解_审题`、每题重复推【详解】section |
| 答案 | `{前缀}_答案` | — |

前缀：例题 `例_`、练题 `练_`（无题号时可不加数字；多小题用 `例1_` / `例2_`）。

## 要点阶段（≤4 个 action 含问/答）

1. **`_要点_起`**：只 push `calc-label calc-label--key` section（【要点】+ 本题招数标题，4–12 字）
2. **`_要点_条*`**：`retainPush` 累加 1 条 `calc-key-list`（≤24 字/条，关键词 `calc-em`）
3. **可选 `_要点_问/答`**：choice/oral，`calc-key-choice`
4. 要点阶段 **只占 left**；right 空

## 详解_起（切换拍）

- push **仅** `region:"right"`：`calc-key-pin` + 比左栏更短的摘要
- 有裂项/通项公式时，右栏可用 `calc-key-tex` 钉公式（见 template 例2）
- **禁止** `retainPush`（引擎清左栏要点；右栏由本步 push 钉住）
- **禁止** 同拍 push left

**引擎清屏（top-split，勿在 plan 里绕过）：**

| 拍 | 引擎行为 |
|----|----------|
| `详解_起` | 清 **左栏** 全部 sideEffect；清 **右栏** 旧 sideEffect；再 push 本步 right 钉 |
| `详解_步*` | 仅清 **左栏** 非 retain 步；**右栏 retain 步（含详解_起 id）必须保留** |
| `retainPush` | 必须写 plan step `id`（codegen 加 plan 前缀）；详解步首个 retain 必须是 `详解_起` 的 id |

容器须 `layout:"top-split"` + `guidanceLayout:"stacked"`（codegen 默认）；**禁止** interleaved 文字题布局。  
**运行时验收**（右栏、公式 fit、左栏底留白、预览刷新）见 [calc-engine-layout.md](calc-engine-layout.md)。

## 详解步

- 每步 **一对**：`calc-solve-note`（注释）+ `calc-solve-step`（`display:true`, `align:left`, tex）
- **`tex` 写完整算式一行**；引擎按 [calc-engine-layout.md](calc-engine-layout.md) 自动缩字/在 `=` 处断行，**勿**用 `\\` 手工拆行，**勿**为长裂项式拆成多个 action
- `retainPush` 必须含 `详解_起` 的 step id + 已讲详解步 id
- **禁止** 在第一个详解步再 push `calc-label`【详解】大标题（template 无此标签）
- 一 action 一小步；`loop.get`  never 整屏亮相

## 题干

- top：`calc-stem`（「求下列各式的值。」/「计算。」等）+ `calc-eq calc-eq--stem` 或 `calc-eq-index` + `calc-eq`
- **用原题展开式**，勿擅自改成求和符号 unless 原题即 ∑
- 开场步 **禁止互动**

## 右栏钉 vs 左栏要点

| | 左栏要点 | 右栏钉 |
|--|----------|--------|
| 时机 | 要点阶段 | 详解_起 起 |
| 长度 | 1–2 条完整句 | 更短；可含 1 条 `calc-key-tex` |
| 示例 | 「1. 观察分母，同乘常数，**一次去分母**。」 | 「同乘去分母 · 合并移项」 |

## 布局常数（codegen 默认）

与 template 一致：`splitLeftWidth: "58%"`，`splitMinHeight: 420`，`edgePad: 28`，`gap: 24`，`bodySize: 24`，`lineHeight: 1.55`，`textAccumulate: true`，`guidanceLayout: "stacked"`。

## 反模式（plan:check 会拦）

- 要点阶段超过 4 个 action（含问/答）
- action 名含 `_要点_审题|所求|策略|入手|分析`
- `详解_起` 的 push 含 `region: left` 或 `main`
- `calc-solve-step` 前无同拍 `calc-solve-note`
- 要点条超过 2 条 calc-key-list（问/答步除外）
- 详解阶段重复 push【详解】section

## 与 teaching-design 的关系

- **teaching-design**：动机、难点、互动设计、TTS 口播质量（方法论）
- **本文件**：屏幕结构与 action 骨架（呈现）
- 取 teaching-design 的**思考**，取本文件的**上屏**；二者不可混为一谈

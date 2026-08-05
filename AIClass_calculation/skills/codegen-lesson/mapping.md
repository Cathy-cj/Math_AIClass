# plan.json → AIClass Calculation Course 映射

对齐 [calc-teaching-spine.md](../lesson-plan/calc-teaching-spine.md)、[calculation-marks.md](../lesson-plan/calculation-marks.md)、[calc-engine-layout.md](../lesson-plan/calc-engine-layout.md) 与 golden [`module_template/lesson/modules/01-calc-equations.js`](../../../module_template/lesson/modules/01-calc-equations.js)。

## 模块骨架

```js
window.__lessonRegisterModule({
  id: 'mod_{id}',
  title: '…',
  sideEffects: [ /* plan.steps[1..] */ ],
  quickQA: [ /* 可选 */ ],
  containers: [{
    id: 'c_{id}',
    label: '例',
    layout: 'top-split',
    guidanceLayout: 'stacked',
    edgePad: 28,
    gap: 24,
    splitLeftWidth: '58%',
    splitMinHeight: 420,
    bodySize: 24,
    lineHeight: 1.55,
    textAccumulate: true,
    steps: [{
      id: '{id}_start',
      action: '{前缀}_开始',
      push: [ /* region:top 题干 calc-stem / calc-eq */ ]
    }]
  }]
})
```

**禁止** `figure` / `figureTemplate` / `problemBrief` 嵌入卡。

## sideEffect 一条

```js
{
  id: '{id}_s01',
  action: '{前缀}_要点',       // 与 plan 一致
  kind: 'exercise',
  containerIdx: 0,
  description: '…',            // TTS 逐字稿摘要
  retainPush: ['{详解_起 id}', …],  // 详解步/答案：显式 id 列表
  scroll: {},                   // codegen 默认注入；阻尼跟滚
  push: [ /* 与 plan.push 同结构，含 region/class */ ]
}
```

## 区域与类名

| 阶段 | region | class 要点 |
|------|--------|------------|
| 题干 | `top` | `calc-stem`、`calc-eq`、`calc-eq-index` |
| 要点 | `left` | `calc-label calc-label--key`、`calc-key-list`、`calc-em`、`calc-key-choice` |
| 钉要点 | `right` | `calc-key-pin` + 要点摘要 |
| 详解 | `left` | `calc-solve-note` + `calc-solve-step`（或 `solveStep`） |
| 答案 | `left` | `calc-answer calc-answer--final` + `highlightAnswer` |

## 讲法骨架 → action

```text
{前缀}_开始 → top 题干
{前缀}_要点_* → left 要点（retainPush 保前序要点 id）
{前缀}_详解_起 → 只 push right 钉摘要；**无 retainPush**（清左栏）
{前缀}_详解_步k → left 演算；retainPush = [详解_起, 已讲步…]
{前缀}_答案 → left 结果；retainPush 同上扩一层
```

## retainPush（top-split 专用语义）

| 步 | retainPush | 引擎效果 |
|----|------------|----------|
| 要点条/问 | 前序要点 step id | 左栏要点往下叠 |
| **详解_起** | **省略 / 空** | 清掉全部已有 sideEffect（左栏要点消失），再钉右栏 |
| 详解步 / 答案 | `[详解_起 id, …]` | 只保右钉 + 已讲演算，左栏继续往下长 |

## push 往下叠加

- 详解逐步：**新行追加**，配合 `retainPush` 保留右栏钉与已讲左栏行
- `replaceKey` 仅用于真·改写同一语义槽；禁止同 key 顶掉前序演算行

## 例题快问快答

- `quickQA[]` 不属于 `steps[]`；codegen 按例题前缀生成打开/出题/揭晓

## 练习题拍照作答

课程模块不生成拍照作答 `push`。生成器为每个练习题自动追加
`{actionPrefix}_作答_拍照`，并在 action catalog 中排在该题 `{actionPrefix}_开始` 之后、
首个教学 sideEffect 之前。宿主先派发此 action，课件才显示左栏“作答结果 / 拍照上传”组件。

点击上传时课件严格上报：

```js
{ type: 'user_submitted', kind: 'course_photo' }
```

OCR 由宿主负责，完成后向 iframe 回传：

```js
{ type: 'photo_result', value: '识别到：$x=3$，验算：$$2x+1=7$$' }
```

结果只回显到最近一次拍照 action 对应练习题的 `top-split` 左栏，由 KaTeX 渲染；
它不判题、不提交、不推进教学步骤。挂载成功后课件回传 `answer_result_shown`。

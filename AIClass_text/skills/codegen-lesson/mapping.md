# plan.json → AIClass Course 映射

## 模块骨架

```js
window.__lessonRegisterModule({
  id: 'mod_{id}',
  title: '…',
  sideEffects: [ /* plan.steps[1..] */ ],
  quickQA: [ /* 可选，从 plan.quickQA 展开 */ ],
  containers: [{
    id: 'c_{id}',
    label: '例1',          // codegen 按 moduleType + 课程内顺序自动生成
    source: '（真实来源）', // 原样来自 plan.source
    layout: 'text-only',
    // text-only：不上屏 problemBrief；审题用 section 已知/求
    guidanceChain: [ /* 从 plan.guidanceChain */ ],
    guidanceLayout: 'interleaved',
    textAccumulate: true, // 不同逻辑卡可累计；板书默认不同 replaceKey 往下叠
    steps: [{
      id: '{id}_start',
      action: '{前缀}_开始',
      push: [ /* 题干 top */ ]
    }]
  }]
})
```

## 例题快问快答

- `plan.quickQA[]` 是**当前例题模块的独立顶部区**，不属于 `steps[]`、`sideEffects[]` 或课程的第三道 problem。
- `quickQALayout: "above-body"` 时，运行时在例题 `.course-body` 前挂载单题快问区；每题动作顺序为打开 → 显示问题 → 显示答案。
- 生成器按例题 `actionPrefix` 自动生成每题的三个 action；plan 中不手写这些 action。

## sideEffect 一条

步骤 id 由生成器自动拼成 `{plan.id}_{step.id}`——plan.json 里的 `id` 保持题内短 id（`s01`），**不要**在 plan 里预拼前缀。

```js
{
  id: '{id}_s01',
  action: '{前缀}_步骤01_展_…',  // 与 plan 完全一致
  kind: 'exercise',
  containerIdx: 0,
  group: 1,                       // 对齐 plan.group
  description: '…',               // 口播摘要或 moduleNote
  push: [ /* 与 plan.push 同结构 */ ]
}
```

## push 往下叠加

`plan.push[].replaceKey` 必须原样保留。运行时约定：

- **不同** `replaceKey`：各自保留并往下追加（板书默认做法）
- **相同** `replaceKey`：原位替换旧 block——**仅**用于真·改写（揭晓挂回等），禁止用来「长算式」
- 每拍 working/compute 只写本拍新增行 + 新 key

```js
{
  type: 'text',
  card: 'working',
  replaceKey: 'ex1:tri-half',
  lines: ['右侧三条', '$=\\frac{1}{2}$']
}
// 下一拍另开 key，例如 ex1:tri-fold，不要复用 ex1:tri-half
```

text-only 多环节使用 `interleaved`：每个 step 的 `group` 对应一个
`.cc-guide-slot`。不同 group 的内容保留；同 group 内靠不同 `replaceKey` 往下叠。

生成器只按 `guidanceChain + group` 路由；`phase` 和 stage slug 均为题内语义，不参与分支判断。`group: 0` 仅为开场且不显示环节。text-only 审题内容以 push 中的 `section`「已知/求」为准，不嵌入 `problemBrief`。

高亮与标签只靠 plan 传参（引擎 CSS 已固化）：题干 `stemClass` 加 `--lit`→红；讲解 `--em`→黄；得数 `--green`→绿。详见 [text-only-marks.md](../lesson-plan/text-only-marks.md)。

## 接线清单

1. 标准 Plan 登记到 `courses/{courseId}/course.json`
2. `npm run lesson:generate -- {courseId}`
3. `npm run course:export -- {courseId}`

## Agent 作答结果回显

课程模块不生成手写板或作答结果 `push`。练习题入口 action 已执行、目标容器创建后，
宿主 Agent 完成外部手写板/OCR，再向 iframe 发送：

```js
{
  action: '作答结果_回显',
  params: {
    content: '识别到：$x=3$，验算：$$2x+1=7$$',
    targetAction: '{该练习题入口 action}'
  }
}
```

`content` 是文字和 `$...$` / `$$...$$` LaTeX 的混合内容。它仅在该题左栏正文讲解流顶部
回显，随后随讲解推进被自动滚动顶出；不参与 `user_submitted`、前端判题或 action 推进。需要移除时发送
`作答结果_清除` 并传入同一 `targetAction`。

# make text runtime：纯文字运行时映射

## 职责

将 `renderProfile: "text"` 的 plan 编译为现有 `text-only` 运行模块，定义该 profile 的 action 顺序、文字容器/高亮、quickQA、拍照和列式挖空的执行落点。

## 输入

- 已通过检查的 text plan；
- `common.md` 的课程公共登记、debug 和 pipeline 边界；
- 当前纯文字仓的模块映射、文字标记与 engine 模板能力。

## 输出

- `text-only` 容器、模块、side effects 与 action catalog；
- 已映射的 section、累积板书与文字高亮；
- text profile 的 quickQA、练题拍照和列式挖空动作；
- 按既有文字运行时完成的检查、生成和预览结果。

## 禁止项

- 不写入 `figure`、`figureTemplate` 或 Figure 模块；
- 不将 outline 当作模块生成真源；
- 不改 plan 的教学拍、标题、TTS、互动内容或上屏证据；
- 不在 common 或 debug 中决定本 profile 的 action 细节；
- 不把当前 text-only 模板表述为已可同课混用的运行时。

## 容器与 action 骨架

此 profile 使用：

- `layout: "text-only"`；
- 有引导链时的 `guidanceLayout: "interleaved"`；
- 审题区由 plan 的 `section`（如已知、求）表达，不嵌入 figure profile 的 `problemBrief`；
- `textAccumulate` 保留不同语义的文字卡片。

典型映射为：

```text
开始 → 其余 plan steps 的顺序 side effects
```

开始动作进入容器 steps，其余 plan steps 进入 side effects。每个 side effect 保留 plan 的题内短 id、group、description 与 push；生成器负责为模块 id 或题目动作添加既有前缀。runtime 不依据 phase 或 stage slug 重新排序。

当前模块契约等价于：

```js
window.__lessonRegisterModule({
  id: "mod_{planId}",
  sideEffects: [/* plan.steps 从第二步开始 */],
  quickQA: [/* 仅 example */],
  containers: [{
    id: "c_{planId}",
    layout: "text-only",
    guidanceChain: [/* plan.guidanceChain */],
    guidanceLayout: "interleaved",
    textAccumulate: true,
    steps: [/* plan.steps[0] */]
  }]
})
```

- plan 的短 id 在生成时拼为 `{plan.id}_{step.id}`；`attachStepId` 同样在生成时加前缀。
- `containerIdx` 与所属题容器的下标一致；多题课程不得把所有 side effect 混入一个容器。
- 例题 `quickQA` 自动生成打开、显示问题、显示答案 action；它不是额外 problem。

## 累积、section 与高亮

- 不同语义的 `replaceKey` 使卡片向下累积；相同 key 仅用于真实改写，不能覆盖推导过程。
- `group` 与 `guidanceChain` 共同路由交错讲解区域；开场 group 不显示为引导环节。
- 文本的重点标记必须通过 plan 传入既有类名和参数：题干醒目、讲解强调、得数强调分别使用当前引擎已固化的 text-only 标记。
- 容器和 CSS 只消费这些标记；runtime 不从 TTS 或标题猜测要高亮的文本。

## quickQA、拍照与列式挖空

- example quickQA 是例题模块顶部独立区域。runtime 生成打开、显示问题、显示答案的 action，不新增 problem。
- practice 在开始动作后生成拍照动作。上传上报 `user_submitted/course_photo`；宿主以 `photo_result` 回传混合文字与 LaTex 内容。结果只显示在最近一次拍照对应题区，不参与判题、提交或动作推进。
- 可选的宿主回显 action 为 `作答结果_回显`，内容只显示在目标练题正文流中，不参与判题或推进；清除时使用 `作答结果_清除` 和同一目标入口 action。
- 列式挖空是否存在、问题与答案由 plan 决定；text runtime 只把 fill / 互动放在 plan 指定的文字卡片与容器位置。

## 预览验收

至少确认：

- `text-only` 容器、section、交错引导链和文字高亮均正确；
- 文字卡按不同 `replaceKey` 累积，真实改写才复用 key；
- quickQA、拍照回显与列式挖空出现于规定 action；
- 从开始动作可完整到达答案。

## 当前实现边界

这份文件描述目标 text profile，不变更纯文字仓既有 schema、codegen 或 engine。统一 `renderProfile` 调度和按题 runtime 选择仍为**待 engine 改造**；共享引擎已可按 plan 的 `layout` 同课混排不同模板（8-1-mix 已验证）。

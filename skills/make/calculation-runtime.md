# make calculation runtime：纯计算运行时映射

## 职责

将 `renderProfile: "calculation"` 的 plan 编译为现有 `top-split` 运行模块，定义该 profile 的 action 顺序、容器、`calc-*` 呈现、quickQA、拍照和列式挖空的执行落点。

## 输入

- 已通过检查的 calculation plan；
- `common.md` 的课程公共登记与 pipeline 边界；
- 根 `plan/calculation/plan.md`、`presentation.md`、`preview.md` 与当前 calculation engine 模板能力。

## 输出

- `top-split` 容器及对应模块、side effects、action catalog；
- `.calc-*` 所需的 push / `retainPush` 映射；
- 计算 profile 的 quickQA、练题拍照和列式挖空执行动作；
- 按计算布局验收完成的 preview 结果。

## 禁止项

- 不使用 `figure`、`figureTemplate` 或 `problemBrief`；
- 不把 plan 的教学内容重新折叠、改标题、改 TTS 或增删互动；
- 不在课程级 CSS 覆盖共享 `.calc-*` 契约；
- 不用单题手工换行或额外 region 修补引擎布局；
- 不将当前 calculation 模板包装成可与其它 profile 混用的已实现能力。

## 容器与 action 骨架

此 profile 使用：

- `layout: "top-split"`；
- `guidanceLayout: "stacked"`；
- 顶部题干区与左右分栏的既有计算布局；
- `textAccumulate` 与运行时提供的滚动/公式适配行为。

典型 action 顺序由本 runtime 决定：

```text
开始 → 要点（可多拍） → 详解起（右栏钉） → 详解步（可多拍） → 答案
```

- `开始` 把题干推到 `top`；
- 要点推入左栏，并按既有语义保留前序要点；
- `详解起` 只建立右栏钉，清理前序要点展示；
- 后续详解和答案逐行加入左栏，保留右栏钉与已完成演算；
- action 的实际命名必须映射 plan 与既有生成器，不能由 common 或 debug 临时推断。

当前模块映射为：开始 step 写入 `containers[].steps`，其余 plan steps 编译为 `sideEffects[]`；side effect 保留 `id`、`action`、`containerIdx`、`description`、`push`、需要时的 `retainPush` 与滚动配置。多题模块中一题一个 container，所有 side effect 必须写正确的 `containerIdx`。

## 容器、push 与 retainPush

| 内容 | 容器落点 | 既有呈现契约 |
|---|---|---|
| 题干 | `top` | `calc-stem`、公式相关 `calc-*` |
| 要点 | `left` | key / emphasis / choice 类 |
| 要点摘要 | `right` | `calc-key-pin` |
| 详解 | `left` | `calc-solve-note`、`calc-solve-step` |
| 答案 | `left` | `calc-answer`、最终答案强调 |

`retainPush` 只在此 profile 按计算运行时语义设置：要点逐拍累积；`详解起` 不保留先前要点；详解步和答案保留右钉及已讲演算。新演算行必须累积，`replaceKey` 仅用于真正原位改写。

## quickQA、拍照与列式挖空

- example 的 quickQA 属于当前例题模块的独立顶部区；runtime 生成打开、出题、揭晓动作，不能作为第三道 problem。
- practice 的拍照动作由 runtime 在开始后、首个教学 side effect 前插入；上报 `user_submitted/course_photo`，接收宿主的 `photo_result`，只回显而不判题或推进动作。
- 普通互动上报只允许 `{ type: "user_submitted", kind, value }`；`choice` 对应 `course_choice`，`fill`/matching 对应 `course_fill`，`oral` 对应 `voice`。不得额外附带 source、status、action、context 或题目对象。
- 练题拍照只上报 `{ type: "user_submitted", kind: "course_photo" }`；宿主以 `{ type: "photo_result", value }` 回传，显示后可回传 `answer_result_shown`。
- plan 已决定是否存在列式挖空及其内容；calculation runtime 只把它放入计算详解/答案前的既有容器并映射对应互动动作。

## debug、CLI 与回归

- 课程专属 debug 页从 parent shell 的 `help` 动态获取 action catalog，支持搜索、模块切换、重置、重载与回包日志；禁止维护固定按钮清单。
- 现行顺序是在 `engine/` 执行 `course:check` → `lesson:generate` → `course:preview`；生成前还应完成内容侧 `plan:check`。预览验收由 agent 在对话中记录。
- 预览必须走 HTTP 地址，不用 `file://`。引擎 / codegen 改动后重新 export，并对 debug iframe 强制刷新；涉及 layout、公式 fit 或跟滚的引擎改动须运行既有 `npm test` 回归。

## 预览验收

在既有 check / generate / preview 后，至少确认：

- `top-split` 分栏和右栏钉正常；
- 长公式有正确 fit / 缩放策略；
- 左栏可滚动，底缘、分式和答案不裁切；
- 从开始能走到答案，练题拍照和 quickQA 在规定位置可用。

## 当前实现边界

以上是 calculation profile 的唯一 runtime 说明。统一 `renderProfile` 字段及与 text / figure 的按题 runtime 选择均为**待 engine 改造**；共享引擎已可按 plan 的 `layout` 同课混排不同模板（8-1-mix 已验证）。

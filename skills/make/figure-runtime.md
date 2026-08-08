# make figure runtime：有图运行时映射

## 职责

将 `renderProfile: "figure"` 的 plan 与已确认的 `figure-spec.json` 编译为现有 `left-right` 运行模块、Figure 注册模块和 action catalog；运行时仅实现规格能力并执行 plan 已指定的状态与动作。

## 输入

- 已通过检查的 figure plan；
- `status: "confirmed"` 的 `figure-spec.json` 及其预览参考；
- `common.md` 的课程公共登记、debug 与 pipeline 边界；
- 当前有图仓的 Figure registry、JSXGraph / View3D 和模块模板能力。

## 输出

- `left-right` 容器、普通课程模块、side effects 与 action catalog；
- `_<figureTemplate>-figure.js` 等 Figure 注册实现；
- 由 plan 的 `figure.state/actions` 驱动的图形状态切换和动作执行；
- figure profile 的 quickQA、拍照、列式挖空执行动作及预览结果。

## 禁止项

- 不改 figure spec 的对象、坐标、视窗、网格、初态或已确认空间关系；
- 不新增 spec 未定义的图形能力或动画；
- 不决定 TTS、screenTitle、互动内容或每拍图形动作的时机；
- 不在未通过图形 OK 前生成正式 Figure runtime；
- 不把目标 profile 混用能力称为当前 engine 已实现。

## 模块与容器

此 profile 使用：

- `layout: "left-right"`；
- Figure 注册名与 `plan.figureTemplate` 对齐；
- 按既有 `guidanceChain + group` 路由的交错引导区域；
- `problemBrief` 在既有首个审题环节中渐进展示；
- 不同 `replaceKey` 的右栏卡片向下累积。

开始 action 进入容器 steps，其余 plan steps 依原顺序进入 side effects。模块生成保留 plan 的 group、description、push 和 figure 指令；runtime 不根据阶段语义重排 action。

## Figure spec 到模块

Figure 模块必须：

1. 从 confirmed spec 原样使用二维 `board` 或三维 `bounds/home`、对象坐标、初始状态和交互设置。
2. 将 spec 的稳定构件 id 注册为 plan actions 可引用的目标。
3. 覆盖 plan 中出现的每一个 `figure.state`，并执行其指定的 `figure.actions[]`。
4. 以当前 Figure kit 的标签能力渲染图上标签；图上标签不假定经过右栏 KaTeX 管道。

全量重绘可以是现有实现策略，但视觉状态必须可辨。若 plan 所需 state/action 不存在，回到 figure specification 设计并重新预览确认；runtime 不得临时补画。

## action、动画与板书边界

- `figure.state` 是状态机键，`figure.note` 是给人审阅的摘要，`figure.actions[]` 是按数组顺序执行的动画指令。
- plan 决定每一拍用哪个 state、哪些动作、何时发生；runtime 只编译与执行。
- 图形动作细节不写入 TTS；TTS 仍来自 plan。
- 左图变化和右栏 push 可同步执行，但 runtime 不得借同步改变 plan 的教学节奏。
- 新右栏推导行使用新 `replaceKey`；复用 key 仅限真正改写。

## quickQA、拍照与列式挖空

- example quickQA 绑定当前例题模块，runtime 生成打开、出题、揭晓动作。
- practice 拍照 action 紧跟开始 action；上传严格上报 `user_submitted/course_photo`，宿主的 `photo_result` 只回显到该练题区域，不判题、不推进。
- 列式挖空内容来自 plan；figure runtime 将其放入 plan 指定的 left-right 卡片/互动动作，必要时执行 plan 已指定的相关图形高亮，不能新增高亮意图。

## 预览验收

至少确认：

- 默认图与 confirmed spec、`figure-preview.html` 一致；
- 图中每个 plan state 和 action 都能执行，构件目标正确；
- 左图、problemBrief、引导区与右栏累积同步但不互相覆盖；
- quickQA、拍照回显、列式挖空和从开始到答案的动作链均可用。

## 当前实现边界

本文件是 figure runtime 规范。统一 `renderProfile`、按题选择模板的 runtime 调度仍是**待 engine 改造**；共享引擎已可按 plan 的 `layout` 同课混排不同模板（8-1-mix 已验证）。

# figure：图形规格与人工确认

## 职责

在 `outline` 与 `plan` 之间，为 `renderProfile: "figure"` 的题目把已确定的图形教学职责落实为可预览、可实现的 `figure-spec.json`，并完成唯一的人工「图形 OK」确认（把规格置 `confirmed`）。

## 输入

- 已批准的 `outline.json`，其中包含 `needsFigure`、`figureTemplate` 与每个 beat 的图形教学职责；
- 题干、题图或截图，以及已有的图形约束；
- 必要时已有的课程编排信息，用于确认图形规格。

## 输出

- 题目目录中的 `figure-spec.json`；
- 由引擎预览工具生成并保留的 `figure-preview.html`；
- 用户已审阅预览并明确确认后，规格状态变为 `confirmed`。

## 禁止项

- 不写或改写 `plan.json`、screenTitle、TTS、互动题干或答案；
- 不决定某个教学拍何时播放何种图形动作；
- 不直接编写课程 Figure 模块、action 名称或运行时容器；
- 不以文字描述替代实画预览，也不把“嗯 / 好 / ok”当作图形确认。

## 必读组合

1. 总是读取本文件与 [specification.md](specification.md)。
2. 读取已批准 outline 中的图形 addon 信息；它只说明每个 beat 希望学生从图上理解什么。
3. 不读取 make runtime 作为规格依据；运行时只消费已确认的规格。

## 流程与确认

```text
approved outline
  → figure-spec.json（draft）
  → figure-preview.html（实画）
  → 用户明确“图形 OK”或“按这个画”
  → figure-spec.json（confirmed）
  → plan
```

1. 先判定二维或三维，并记录所用图形引擎能力。
2. 将题目关系落实为对象、坐标、初始状态以及可复用状态/动作能力；坐标来源必须可追溯。
3. 在有图仓 `engine/` 运行 `npm run figure:preview -- <lessonId>`，从 spec 生成预览，不手写自包含预览页。
4. 请人直接查看预览；收到具体修改意见时，修改 spec 后重新生成预览。
5. 仅在用户明确确认后把 `figure-spec.json` 的 `status` 置为 `confirmed`；`plan-check` 会强制校验该状态。

## 四层边界

| 层 | 决定什么 |
|---|---|
| outline figure addon | 图为何服务教学；某个 beat 要看懂的关系 |
| figure specification | 图有哪些对象、坐标、初态、状态与动作能力 |
| plan figure | 每个 plan step 何时使用哪些 state/actions |
| make figure runtime | 将已给定的 plan/spec 编译为可执行模块 |

本阶段只负责第二层。`visualIntent` 可以作为规格的可追溯输入，但不能演变为逐拍动画时间表。

## 当前实现边界

统一 `renderProfile` 调度尚未实现；共享引擎已可按 plan 的 `layout` 同课混排不同模板（8-1-mix 已验证），但在完成统一字段改造前，它仍不是目标 schema 的可执行承诺。

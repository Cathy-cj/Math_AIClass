# 共用互动规则（目标 SOP）

**职责：** 规定互动来源、问答闭环，以及最终列式挖空的决策边界。  
**输入：** outline 的互动意图、各 beat 的教学目标和已知量。  
**输出：** plan 中具体的互动类型、题面、空格、标准答案和揭晓步骤。  
**禁止项：** 不决定任何 profile 的显示位置；不由 runtime 擅自补题；不把具体空格或答案写回 outline。

> `interactionIntent.kind: "formula-completion"` 与目标 `interaction` 字段尚未进入统一 schema/lint；当前实现仍使用既有 oral/choice/fill push 契约。

## 两层互动

- **考点级：** outline 决定要测什么及题意；plan 原样落实题面、选项、答案和揭晓。
- **过程级：** 未覆盖的关键微步可由 plan 补一题，必须一步可答、不另造考点、不与考点级重复。
- 审题阶段不设互动；其余教学环节在需要学生跨越的认知节点安排互动，不在段尾凑数。
- 问步与答步形成闭环；具体 widget 是否单段揭晓或两段揭晓，按现有运行时契约处理。

## 当前 widget 协议（兼容 production）

互动问步须有 `agent.type: "ask"`、`answerType` 与 `userResponse`；`userResponse` 写可接受的意思相近口径。答步通常为 `agent.type: "explain"`，口播中立揭晓，不评价学生对错。

| widget | 问步 | 揭晓与校验 |
|---|---|---|
| `oral` | push `question`；不预先写答案 | 另设答步，push `{ "attachStepId": "<问步短 id>", "answer": "…" }`，将答案挂回原问卡。 |
| `choice` | 同一个 push 写 `question`、`options`、`answer` | 单段式，运行时随步骤揭晓；不要再推第二个答案 widget。`options` 可为字符串或 `{value,label}`，`answer` 必须命中某个 value。 |
| `fill` | 同一个 push 的 `parts` 由 text / blank 组成 | 每个 blank 写可判定的 `answer`；只用于一步即可完成的表达式。 |

开场不得互动或写 `userResponse`。考点级问题的 `ask`、`options`、`answer`、`tests` 从 outline 原样转录；过程级微问只能补当前理解缺口，不改变考点。宿主提交、拍照等消息属于 make/runtime，不在这里伪造字段。

## 最终量的列式挖空

职责必须分层，不能混放：

| 决定 | 责任层 |
|---|---|
| 是否需要列式挖空 | outline |
| 空在哪里、答案是什么、如何揭晓 | plan（本文件） |
| 显示在计算/文字/图形界面的哪里 | profile plan |

当且仅当最终量已经具备下列条件时，outline 应声明 `formula-completion` 互动意图，plan 必须落实为填空：

1. 已知量足以组成**唯一**的求解表达式；
2. 表达式是学生可在**单步**内列出的；
3. 题意与单位明确，答案可稳定判定。

若表达式存在合理的多种写法、仍需多步推导、依赖未得到的中间量，或无法在一拍内回答，则不强行挖空。

目标 outline 只写意图，例如：

```json
{ "interactionIntent": { "kind": "formula-completion", "goal": "列出最终量的完整算式" } }
```

目标 plan 才写具体 `fill` 的文本片段、空格、等价答案口径和揭晓内容。profile 只安排其呈现位置，不能改变“是否挖空”的教学决定。

`interactionIntent` 和目标 `interaction` 对象仍未进入当前 schema；当前生产只能按本节 `push`、`answerType`、`userResponse`、`attachStepId` 协议表达。

# 话术库说明

结构化数据见 [phrase-bank.json](phrase-bank.json)。

## 这是什么？

**可复用的口播短句库**，供 fill-lesson-plan 阶段**拼进** `agent.description`，不是完整讲稿。

| 类型 | 干什么 | 举例 |
|------|--------|------|
| `opening.*` | 开场引子 | 「先别急着动笔…」 |
| `transition.*` | 环节过渡 | 「倒推一下——」 |
| `difficulty.report` | 自然带难度 | 「这题四颗星…」 |
| `trap.warn` | 点坑（口语） | 「这儿容易想岔——」 |
| `interaction.*` | 提问前后、揭晓后中性过渡 | 「说到点子上了」 |
| `closing.*` | 收尾、小结 | 「这道题，拿下！」 |
| `bridge.next` | 接下一题 | 「同类题再来一道…」 |

**不要写进 phrase-bank 的：**

- 导演备注（如「暂停，等孩子说」）→ 写 `moduleNote` 或 plan 元数据
- 带具体年级（六年级、五年级…）
- 作业专用开场（本仓不做 homework 链）
- 播报腔（「难度播报」「陷阱预警！」）

## 组合规则

1. `{前缀}_开始` = 1 条 `opening.example` + 1 句本题定位 + 可选 1 条 `difficulty.report`（≤120 字）
2. 每 phase 首步可选 1 条 `transition.phase`（同 plan 内 id 不重复）
3. 开算前 1 条 `transition.compute`（轮换 tc-*）
4. 点坑用 `trap.warn` 接本题具体内容，不要只喊口号
5. 收尾 `closing.win`；compositeSplit 可加 `closing.recap`
6. 同一 plan 内 **phrase id 不得重复**；相邻两步起首 4 字不得相同

## 难度怎么说

- 口语自然带星级：`dr-01`～`dr-04`
- **禁止**「难度播报：」等主持人口吻
- 也可不用 phrase，在 `agent.description` 里按本题写一句

## 禁用（banned）

见 json 的 `banned` 数组。命中须重写，含：**难度播报、陷阱预警、具体年级、导演腔**。

## 口播密度

一步一个 beat；口播超 ~100 字拆成两步。`agent.description` 是 TTS 逐字稿（纯中文、禁括号说明，契约见 [reference.md](reference.md)）——屏幕样式与分区说明写 [calculation-marks.md](calculation-marks.md) / `moduleNote`，不进口播。

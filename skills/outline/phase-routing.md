# 推理题阶段路由：当前兼容规则

**职责：** 在写当前 `teachingStages[]` 前，根据真实推理链选择教学环节；不是固定 UI 模板。

## archetype 判断

- 单一公式、逻辑链不超过两层：`directFormula`。
- 等量传递、反求、逆用、多个量之间架桥：`relationBridge`。
- 组合对象、分段合并：`compositeSplit`。
- 规律、周期、重复结构：`patternCycle`。

先独立解题，再由 `analysisModel.logicChain` 校验。出现等量桥、逆用或两种关系时不得误用 `directFormula`。

## 当前文字题大环节

例题、练题均为：

```text
审题环节 → 从哪入手 → 题目专属推导环节 × N → 提取已知（需要时）→ 列式计算
```

第一环节固定 `read-problem / 审题环节`，第二环节固定 `entry-point / 从哪入手`。后续 title 必须描述题内任务，不能使用“推导环节”“公式环节”等菜单名；推导阶段均写 `loop.from → loop.get`。审题不设计互动，后续每阶段至少设计或补充一道可一步作答的互动。

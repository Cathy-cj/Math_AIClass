# 讲法配方与动态教学环节

Agent 在 **lesson-outline** 阶段读取本文件。archetype 只提示本题值得显式呈现的推理动作，不提供固定阶段链。

## 讲法配方（启发标签）

| archetype | 识别信号 | 通常需要关注 | 常见 strategy 范式（启发，非模板） | 总步数参考 |
|-----------|----------|--------------|-----------------------------------|------------|
| `directFormula` | 同一公式族、logicChain ≤2，且无跨图形关系或逆用 | 数据对应、直接代入、结果核对 | 对号入座 / 公式直代 | 8–12 |
| `relationBridge` | 等量传递、等高、逆用/反求、两个图形由关系连接 | 缺什么、等量桥、结果回代 | 化未知为已知 / 搭等量桥 | 12–16 |
| `compositeSplit` | 分段相加、组合体、多模型并列 | 拆分对象、各部分关系、合并范围 | 化整为零 | 16–22 |
| `patternCycle` | 周期、每 k 次、翻滚 N 次、路径次数 | 最小周期、整周期与余数、次数含义 | 先找周期 / 看重复结构 | 18–24 |
| `telescoping` | 分母相邻整数积、分子可裂项、连加求和 | 拆通项、倒数差、分组抵消 | 裂项相消 / 拆整留分 | 12–18 |
| `numericSum` | 立方差/平方和通项、大项数连加 | 通项变形、常数组与裂项组 | 拆常数裂项 / 通项变形 | 14–20 |

**总步数参考是量级下限提示，不是上限。** 总步数由 `logicChain` 长度和难点数量决定：难题远超参考区间是正常且应该的，简单题短一些也正常；**任何固定步数目标（如「控制在 8 步内」）都不存在**，禁止为落进某个区间压缩难点展开（见 [teaching-design.md](../lesson-outline/teaching-design.md)「难点展开」）。

以下任一命中，不得选择 `directFormula`：需要跨图形传递结果、使用两个公式族、含逆用/反求，或 `analysisModel.logicChain` 超过两层。

## 动态生成 teachingStages

骨架固定（example/practice），推导环节动态（见 [teaching-design.md](../lesson-outline/teaching-design.md)）：

```text
read-problem / 审题环节 → entry-point / 从哪入手 → 推导环节 ×N → 提取已知 → 列式计算
```

1. 先完整写 `analysisModel`：`stem`、`logicChain`、`computeSteps`；再写 `positioning`、`entryPoint`。
2. `problemBrief` 从题干分析中提取：`known`、`ask` 必填，`key` 仅在能避免关键误区时填写；`knowledge` 不展示。该内容嵌入第一环节，不单独出卡。
3. `teachingStages[]` 第一项固定为 `read-problem / 审题环节`，第二项固定为 `entry-point / 从哪入手`——**fill 时二者合并为 1 次【要点】**（见 [calc-teaching-spine.md](calc-teaching-spine.md)），不设独立 `_要点_审题` action。
4. 沿 `logicChain` 切推导环节：每个环节一轮「已知 → 未知」（`loop.from` → `loop.get`），上一轮 `get` 进下一轮 `from`。模型切换、公式切换、关键关系建立处拆段；目标相同则合并。短链 1 个推导环节，长链多个串联；**每个独立难点配自己的环节**，不许几个难点挤一段。
5. 推导环节之后是「提取已知」（清点数据）与「列式计算」（收尾拼装复盘）；短链题可把提取已知并入列式计算。example/practice 通常生成 **至少 4 个** `teachingStages`（knowledge 等其他类型至少 2 个），**多难点长链题可以更多**——环节数和步数都由题目决定，**没有上限**。
6. 推导环节 `title` 必须描述本题正在做的任务，如“倒推·看清一次翻滚”“建立等面积桥”；禁止“公式环节”“推导环节”等空泛菜单名。
7. 推导环节标 `difficulty` 星级，按需写 `linkBack` / `trap`，并在 `interactions[]` 设计互动题（考点级，全题 ≥2 道）。

每个 stage 必须有题内唯一 `slug`、`title`、`goal`、`approach`。archetype 不决定环节数量和名称。

### telescoping / numericSum 要点条模板（fill 参考）

- 条1：观察分母/结构 + `calc-em` 关键招（如「一次裂项相消」）
- 条2：操作提醒一句（如「先拆通项，再分组」）或 `calc-key-tex` 裂项公式（右栏钉）
- 禁止把「审题/所求/策略」拆成 3 条独立 action

## moduleType 叠加

| moduleType | lessonContext.slot 建议 | quickQA | 开场 |
|------------|-------------------------|---------|------|
| example | firstExample / standalone | 有，3–5 道本题具体数据/关系题 | phrase-bank `opening.example` |
| practice | afterExample（`afterPlanId` 指向例题） | 无 | `opening.practice` |
| homework | homework | 无 | 同 practice 或 `opening.continue` |

## lessonContext.slot

| slot | 含义 |
|------|------|
| unitIntro | 单元第一课 |
| firstExample | 本课第一道例题 |
| afterExample | 接上一道例题的练习 |
| homework | 作业 |
| standalone | 单题入库 |

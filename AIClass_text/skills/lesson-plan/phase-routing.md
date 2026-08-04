# 讲法配方与动态教学环节

Agent 在 **lesson-outline** 阶段读取本文件。archetype 只提示本题值得显式呈现的推理动作，不提供固定阶段链。

## 讲法配方（启发标签）

| archetype | 识别信号 | 通常需要关注 | 常见 strategy 范式（启发，非模板） | 总步数参考 |
|-----------|----------|--------------|-----------------------------------|------------|
| `directFormula` | 同一公式族、logicChain ≤2，且无跨图形关系或逆用 | 数据对应、直接代入、结果核对 | 对号入座 / 公式直代 | 8–12 |
| `relationBridge` | 等量传递、等高、逆用/反求、两个图形由关系连接 | 缺什么、等量桥、结果回代 | 化未知为已知 / 搭等量桥 | 12–16 |
| `compositeSplit` | 分段相加、组合体、多模型并列 | 拆分对象、各部分关系、合并范围 | 化整为零 | 16–22 |
| `patternCycle` | 周期、每 k 次、翻滚 N 次、路径次数 | 最小周期、整周期与余数、次数含义 | 先找周期 / 看重复结构 | 18–24 |

**总步数参考是量级下限提示，不是上限。** 总步数由 `logicChain` 长度和难点数量决定：难题远超参考区间是正常且应该的，简单题短一些也正常；**任何固定步数目标（如「控制在 8 步内」）都不存在**，禁止为落进某个区间压缩难点展开（见 [teaching-design.md](../lesson-outline/teaching-design.md)「难点展开」）。

以下任一命中，不得选择 `directFormula`：需要跨图形传递结果、使用两个公式族、含逆用/反求，或 `analysisModel.logicChain` 超过两层。

## 动态生成 teachingStages

骨架固定（example/practice），推导环节动态（见 [teaching-design.md](../lesson-outline/teaching-design.md)）：

```text
read-problem / 审题环节 → entry-point / 从哪入手 → 推导环节 ×N → 提取已知 → 列式计算
```

1. 先完整写 `analysisModel`：`stem`、`logicChain`、`computeSteps`；再写 `positioning`、`entryPoint`。
2. `problemBrief` 从题干分析中提取：`known`、`ask` 必填，`key` 仅在能避免关键误区时填写；`knowledge` 不展示。**仅备课字段，不上屏**；fill 时改写成 section「已知/求」逐步揭示。
3. `teachingStages[]` 第一项固定为 `read-problem / 审题环节`，覆盖读题、标条件、明确所求与关键（含问句陷阱点名）；对应步骤使用 `group: 1`。第二项固定为 `entry-point / 从哪入手`，展开 `entryPoint.strategy`（范式级，非操作步骤；见 teaching-design.md §2）。
4. 沿 `logicChain` 切推导环节：每个环节一轮「已知 → 未知」（`loop.from` → `loop.get`），上一轮 `get` 进下一轮 `from`。模型切换、公式切换、关键关系建立处拆段；目标相同则合并。短链 1 个推导环节，长链多个串联；**每个独立难点配自己的环节**，不许几个难点挤一段。
5. 推导环节之后是「提取已知」（清点数据）与「列式计算」（收尾拼装复盘）；短链题可把提取已知并入列式计算。example/practice 通常生成 **至少 4 个** `teachingStages`（knowledge 等其他类型至少 2 个），**多难点长链题可以更多**——环节数和步数都由题目决定，**没有上限**。
6. 推导环节 `title` 必须描述本题正在做的任务，如“倒推·看清一次翻滚”“建立等面积桥”；禁止“公式环节”“推导环节”等空泛菜单名。`group: 0` 仅用于开场。
7. 推导环节标 `difficulty` 星级，按需写 `linkBack` / `trap`，并在 `interactions[]` 设计互动题（考点级，全题 ≥2 道）。

每个 stage 必须有题内唯一 `slug`、`title`、`goal`、`approach`；不写 `stepBudget`、`guidanceDesc`（均已废弃）。archetype 不决定环节数量和名称。

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

---
name: lesson-outline
description: >-
  用户贴数学题后第一步（备课）：生成讲法大纲——开场定位、切入点、推导环节链、互动题设计、收尾拼装＋解析，不写 action/动画/逐步口播。
  触发：出大纲、写大纲、备课、梳理解题步骤、plan 大纲。
---

# Skill 1：lesson-outline（备课）

## 目标

产出 **`lesson/{id}/outline.json`**（唯一产物；**不再导出 outline.md**）。

大纲 = **一次完整备课**：不只是解析，而是把「这道题为什么值得学、学生会卡在哪、从哪切入、每轮推导干什么、在哪抛互动题、最后带走什么」全部设计好。用户审的是**备课质量**。**禁止**在此阶段写 plan.json、action 名或任何图形字段。

**备课是全流程中投入思考最多的一步——在这里多花时间和 token 是应该的。** 核心是找准并展开难点：难点靠自己独立解题的思维链找出来（不能只靠【分析】【详解】），难点环节必须按「动机 → 操作 → 回看」把「为什么这样做」讲给学生，而不是复述答案（见 [teaching-design.md](teaching-design.md)「难点识别／难点展开」）。

## 输入

- 题干 + 【答案】【分析】【详解】，或题目截图
- **规范 md**（word-to-math-spec 模板：`# N星-例` / `# N星-练`、题干/答案/解析等节）——按 md 分段识别单题/多题

## 必读

- [naming-from-md.md](../lesson-plan/naming-from-md.md) — **MD 输入时 courseId / lesson id 命名**
- [teaching-design.md](teaching-design.md) — **备课方法论（核心）**：开场定位、五步主循环、互动题设计红线、收尾拼装、屏幕极简原则
- [phase-routing.md](../lesson-plan/phase-routing.md) — 讲法配方（archetype）与环节生成规则
- [reference.md](../lesson-plan/reference.md) — outline schema（产出按 schema 自洽）

## 步骤

1. 定 `id`、`moduleType`，并明确本仓 `layout` 固定为 `text-only`（**不定 action 前缀**）；**md 输入时** `id` 按 [naming-from-md.md](../lesson-plan/naming-from-md.md)（单题 = md 基名，多题 = 基名 + `-ex1/-pr1/…`）
2. **先独立解题、标难点**：只看题干把题完整做一遍，记下思维链里每个「必须想到才行」的动作（设参、辅助线、换视角、逆用公式……）——这就是难点清单，供 `entryPoint` 与各段 `difficulty` 印证；【分析】【详解】用来校对结果，不用来代替自己的推演。然后写 `analysis`、`analysisModel`（题干信息、逻辑链、列式顺序）、`solution[]`
   - `analysisModel.stem.known/ask/knowledge/key` 供内部分析，其中 `knowledge` 禁止进入屏幕
   - 另写 `problemBrief`（**备课字段，不上屏**）：`known`、`ask` 必填；`key` 可选
3. 读【分析】匹配 **archetype**，写 `lessonContext`
   - 同时核对 `solution[]` 与 `analysisModel.logicChain[]` 的层数，不能只看题面关键词
   - 出现等量传递、等面积/等高、逆用公式、反求未知量时使用 `relationBridge`
   - `logicChain` 超过 2 层或涉及两个公式族时，禁止使用 `directFormula`
4. 写 **`positioning`**（开场定位 30 秒）：`represents` / `generalSkill` / `examRelevance` / `hook`，具体到本题
5. 写 **`entryPoint`**（切入点，**花最多思考的一步**）：`stuckPoint` / `observe` / `strategy`（**解题思维范式**，4–12 字，可迁移同类题）/ `rejectedPaths`。**禁止**把 `logicChain` 前几步或列式顺序写进 `strategy`（操作链进推导环节 `approach`/`loop`；略具体的防坑句进 `problemBrief.key`）。定范式时可参考 archetype 常见范式（见 phase-routing.md）
6. 沿 `analysisModel.logicChain` 生成 `teachingStages[]`，按固定骨架：
   **审题环节 → 从哪入手 → 推导环节×N → 提取已知 → 列式计算**
   - 第一项固定 `read-problem / 审题环节`；第二项固定 `entry-point / 从哪入手`
   - 推导环节数量由逻辑链长度决定：短链 1 轮，长链多轮串联；每轮写 `loop: { from, get }`，上一轮 `get` 进下一轮 `from`
   - 推导环节名必须描述本题任务（「倒推·看清一次翻滚」），禁止菜单名；短链题可把「提取已知」并入「列式计算」
   - 每段含题内唯一 `slug`、`title`、`goal`、`approach`；推导环节加 `difficulty`（星级）、可选 `linkBack` / `trap`；**不写 `stepBudget`**（已废弃——只会限制发挥）
   - 展开深度由该段 `difficulty` 决定：难点环节按「动机 → 操作 → 回看」成倍展开（≥5 星通常 4 步起），易段一两步带过；`approach` 里写清动机链，不许只写操作。**总步数没有上限**，禁止向任何固定步数靠拢
   - 不写 `guidanceDesc`（已废弃）
7. 设计**互动题**：在推导等环节的 `interactions[]` 写 `form / ask / options / answer / tests`（**禁止**写在 read-problem / 审题环节），按 teaching-design.md 红线（考点级、放认知关键点、全题 ≥2 道、禁无脑题）
8. 写 **`closing`**：`recap`（星级拼装复盘，与各环节 `difficulty` 对得上）+ `takeaway`
9. **example 写 `quickQASkeleton`**（3–5 条，无 push/action）：
   - 每题只问本题已出现的具体关系、数据或关键计算中间量，且必须有唯一明确答案。
   - 题型只用判断、单空、短答案；可故意给出本题常见误判再纠正。
   - 禁止“你觉得怎么做”“说说思路”等开放题，也不要机械重复最终答案。
   - quickQA 绑定本例题；不写成独立 problem 或 `teachingStages[]` 环节。
10. **practice** 写 `lessonContext.slot: "afterExample"` 与 `afterPlanId`，指向前一例题；沿同一教学骨架讲解，**不写** `quickQASkeleton`。
11. 落盘 json（`outlineStatus: approved`，`plan:check` 通过后）+ 运行结构检查：

```bash
npm run plan:check
```

12. 在**对话里**输出摘要（定位、切入点、环节链、互动、列式）供事后查阅；**自动**进入下一阶段 fill-lesson-plan
13. 若已挂到某门课：刷新看板 `npm run pipeline:board -- <courseId>`（`outlineOk` 由看板自动推断）

## 禁止

- 不写 `stepSkeleton`、不写 `action` / `pushKind`
- 不写完整 `agent.description` 或 phrase-bank 长开场（开场**内容**设计在 `positioning`，开场**口播**留给 fill）
- 不生成 plan.json
- 不把 archetype 当成固定阶段模板
- 不写没有 `tests` 的互动题；不出 1+1 式无脑互动

## archetype 自检

- [ ] 单公式直算才使用 `directFormula`
- [ ] 等面积/等量传递/逆用公式已使用 `relationBridge`
- [ ] `problemBrief` 已生成“已知/求”（备课用，不上屏），未写知识点字段
- [ ] `teachingStages[]` 能覆盖 `analysisModel.logicChain[]`，推导环节名称是本题专属任务

## 备课自检

见 [teaching-design.md](teaching-design.md) 末尾「设计自检」，落盘前逐项过。

## 对话摘要（非阻塞）

不再导出 outline.md。落盘 json 后，在对话里给出摘要：开场定位、切入点范式、环节链、互动题清单、收尾、标准答案。

本仓大纲完成后自动进入 fill-lesson-plan。

（如人工想要 md 文件版，可自行运行 `npm run outline:export -- {id}`；这不是流程步骤。）

## 缺信息才问

仅缺题干或答案时问 1 个问题。

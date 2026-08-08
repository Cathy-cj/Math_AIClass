---
name: outline
description: 以阶段优先方式完成数学题备课；按 renderProfile 读取共用与题型补充规则，产出兼容当前实现的 outline.json。
---

# Outline：备课阶段入口

## 输入

- 题干、答案；有条件时附分析、详解或题目图片。
- 当前仓库与课程上下文：题目 id、`moduleType`，以及现有仓已确定的渲染类型。
- 计算题、纯文字题或有图题的题型事实；不要从布局或既有 action 倒推教学设计。

## 输出

- 当前兼容基线的 `_output_/{grade}/{courseId}/{problemId}/outline.json`。
- 对话中的备课摘要：大环节的完整教学说明、切入点、推导链、互动意图、标准解与收尾。
- 有图题额外输出是否需要图形澄清的判断，供后续 figure 阶段使用。

## 职责

- 在 **outline 阶段**决定“教什么、为何这样引导”，而不是决定屏幕如何播放或每个环节叫什么标题。
- 先独立解题，形成可审查的关系或演算推理链，再用题目解析校对。
- 按题型读取下列组合；阶段优先于 common/profile 分类：

| 题目类型 | 必读文件 |
| --- | --- |
| 全部题目 | [common.md](common.md) |
| 纯计算 | [naming.md](naming.md) → [calculation.md](calculation.md) |
| 纯文字推理 | [reasoning-problem.md](reasoning-problem.md) → [phase-routing.md](phase-routing.md) |
| 有图推理 | [reasoning-problem.md](reasoning-problem.md) → [phase-routing.md](phase-routing.md) → [figure-addon.md](figure-addon.md) |

- 保持与当前三仓 `outline.json`、校验器和下游流程兼容：沿用现有 `analysisModel`、`positioning`、`entryPoint`、`teachingStages`、`closing` 等已实现字段及其仓内约束。

## 禁止项

- 不写屏幕标题、上屏摘要、action、push、TTS 逐字稿、CSS、JS、布局、坐标或动画。
- 不以现有屏幕分栏、模块模板或 action 前缀决定教学顺序。
- 不声称新 schema 已获 engine 支持。
- 不修改任何现有三仓 skills、engine、schema 或课程内容。

## 工作顺序

1. 确认题干和答案；信息仅缺其一时才提出一个聚焦问题。
2. 先独立完成求解，记录每个必须想到的转折、可能误区与验证方式。
3. 读取本入口指定的共用文件和题型补充文件，确定教学阶段与互动意图。
4. 以当前仓的 schema 写出兼容的 `outline.json`；由根 `content:check:<profile>` 负责当前校验。
5. 有图题只将图形教学职责传给后续 figure 阶段；图形 OK 仍按各现有仓流程执行。

## 当前实现基线

当前实现的教学大环节是 `teachingStages[]`，而非新 `stages[]/beats[]`。本阶段文件可以用“教学拍”描述设计粒度，但不得把它写入当前 JSON 的新字段。

`stages[]`、`beats[]`、`teachingNote`、`interactionIntent`、`renderProfile`、`screenTitle` 及 `plan.steps[].source` 尚未实现：只有 engine、schema、lint、codegen 同步实现并验证后，才能成为生产字段或硬约束。

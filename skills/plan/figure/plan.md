# 有图 Profile：计划与图形同步

**职责：** 规定有图题如何将逐拍讲解、互动和屏幕证据与已确认图形能力同步。  
**输入：** 共用 plan steps、已批准 outline、已确认的 `figure-spec.json`。  
**输出：** 带 figure profile 呈现意图及逐拍图形绑定的目标 plan。  
**禁止项：** 不重画图、不改坐标、不替代图形确认；不把图形动作细节写进 TTS；不在图形 OK 前进入 plan。

> figure 当前生产契约由本文件与 [presentation.md](presentation.md) 共同维护：现有仓可使用 `figure.state`、`figure.note`、`figure.actions[]` 与 left-right。`renderProfile`、`source`、`screenTitle`、`profileView` 仍未统一实现。

## 映射

- 使用 left-right：右侧保留当前教学拍的最小证据，左图只突出该拍需要看懂的关系。
- 审题通过 `problemBrief` 快照逐步展开已知、所求和关键；快照与图上高亮、尺寸或关系标注同步，题干对应片段用 `stemClass` 同步点亮。
- 每个有图变化的 step 同时给出状态、人工可读意图和按序可执行的动作；状态与动作必须来自 confirmed 图形规格。
- 图形动作的时机由 plan 决定，图形可用能力和对象定义由 figure 阶段决定。

## 动画与互动

- 一拍一项视觉变化：高亮、连线、标注、分离、填充等动作对应本拍讲解，不做装饰性弹窗。
- `figure.note` 只写摘要；具体动作写 `figure.actions[]`；TTS 只讲数学理由。
- 列式挖空若已由 outline 决定，可在填空拍高亮相关图形量；高亮不能替代条件的文字或口播说明。

## 当前接入约束

图上 label 不走右栏 LaTeX，体积比不画成高度比例；每个左图变化必须有 L1 note 与 L2 actions，完整字段约定见 [presentation.md](presentation.md)。

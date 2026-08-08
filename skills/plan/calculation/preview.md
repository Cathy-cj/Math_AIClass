# 计算 Profile：预览验收（目标 SOP）

**职责：** 定义 calculation profile 的视觉与交互验收。  
**输入：** 已生成的计算课件预览、top-split 容器和完整演算步骤。  
**输出：** 每题通过/未通过的预览结论与问题定位。  
**禁止项：** 不以计划字段、手工换行或课级 CSS 修补引擎布局；不宣称目标 profile runtime 已上线。

> 检查项与 calculation runtime 的容器、公式适配和滚动实现保持同步。

## 必查项

- 容器确为 `top-split`，左右区域可见；不是静默降级后的 `text-only`。
- 要点只在左侧；进入详解切换拍后右侧出现精简摘要并持续保留。
- 详解一拍一拍向下累积；答案出现前既有演算行不丢失。
- 长公式优先缩小保持一行；多重等式才在合适位置断行；不在 plan 中写 `\\` 强制断行。
- 滚到最后一条详解和答案，分式分母、根号和下伸部分不被底缘裁切。
- 首屏从题干开始，播放不会误滚到后续 action。

## 当前刷新与回归

- 用 HTTP 预览，不以 `file://` 验收；现行命令仍是 `course:check`、`lesson:generate`、`course:preview`，验收由 agent 在对话中记录。
- 改动引擎或 codegen 后，重新 export，并对 debug iframe 强制刷新；否则可能仍在看旧派生物。
- DOM 验收时确认 `data-layout="top-split"`、左右滚动区和 `详解_起` 后右栏的 `.calc-key-pin` 均存在。
- 公式 fit、自动断行、容器布局和跟滚是引擎职责。发现问题先修 engine 与相应回归，再更新本规则；不得以课程级 CSS、单题 JS、额外 region 或 `\\` 强制换行制作补丁。

本节只复述当前 calculation 的验收链。

# 文字 Profile：现行 text-only 呈现契约

**职责：** 将已确定的文字题 plan 映射到当前 `text-only` 容器、交错引导轨与已实现的高亮标记。  
**适用：** 纯文字题；本文件描述当前可生产字段，不引入目标 schema。

## 容器与引导路由

- 顶层固定 `layout: "text-only"`、`guidanceLayout: "interleaved"`。
- `guidanceChain` 从 outline 的 `teachingStages[]` 复制，条目只保留 `{ "title": "..." }`，禁止 `desc` / `guidanceDesc`。
- 开场唯一使用 `group: 0`；审题固定为 `group: 1`；后续 group 与 `guidanceChain` 连续一一对应。
- group 1 用 `problemBrief` 快照逐步展开已知/所求/关键，并用 `stemClass` 点亮题干对应片段（契约见 common/schema.md「题干高亮契约」）；每个其余 group 至少有一张屏幕卡。进入下一 group 时保留前面内容。
- `replaceKey` 不同表示向下追加；只在真正原位改写时复用同一 key。

## 标记与审题

| 用途 | 当前传参 |
|---|---|
| 题干 | `region:”top”`、`class:”tx-stem”`；待点亮片段包 `<span class=”tx-stem-mark”>` |
| 题干点亮 | 审题 step 的 `stemClass: [{ selector, add:”tx-stem-mark--lit” }]`；已知/所求红，关键黄（`--em`） |
| 审题快照 | step 的 `problemBrief`（known/ask/key）与题干高亮逐步同步 |
| 讲解关键词 | HTML 片段使用 `tx-stem-mark tx-stem-mark--em` |
| 结果强调 | HTML 片段使用 `tx-stem-mark tx-stem-mark--green` |
| 最终答案 | `class:”tx-label tx-label--answer”`、`tag:”答：”` |

题干只在开场上屏；审题用 `problemBrief` 快照 + `stemClass` 点亮题干（mark 片段写法、选择器与配色见 common/schema.md「题干高亮契约」）。引导轨由引擎 CSS 管理，只允许使用 `--cc-guide-dot-*`，不得写死 `--cc-guide-rail-x` 或自画导轨。

## 互动与上屏

- 审题 group 禁止 `oral`、`choice`、`fill` 及 `userResponse`。
- 后续每个 group 至少有一道考点级或过程级互动。
- `oral` 是问、答两拍：答拍用 `{ "attachStepId": "<短 id>", "answer": "..." }`。
- `choice` 在问拍同时写 `question`、`options`、`answer`；`answer` 必须命中一个 option value。
- 每拍只放本拍新增证据；互动问拍不夹带大段板书。

## 预览要求

确认 `text-only`、section、交错引导轨、题干/讲解/结论三类高亮、不同 `replaceKey` 的累积、quickQA、练题拍照回显和从开场到答案的完整播放均正常。

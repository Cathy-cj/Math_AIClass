# 文字 Profile：计划与呈现

**职责：** 规定纯文字题如何把逐拍教学内容映射为 text-only 呈现。  
**输入：** 共用 plan steps、文字题已知/所求、关系推导与互动。  
**输出：** 带 text profile 呈现意图的目标 plan。  
**禁止项：** 不定义计算分栏、图形 state/actions；不写"知识点"卡。

> 当前引擎已支持 `text-only`、`interleaved`、`guidanceChain`、`group` 与 `tx-*` 标记。本文件和 [presentation.md](presentation.md) 定义其现行生产契约；`renderProfile`、`profileView`、`screenTitle`、`source` 尚未实现，不能写入当前 JSON。

## 映射

- 开场在顶部显示题干；审题用 `problemBrief` 快照逐步展开已知/所求/关键，并用 `stemClass` 同步点亮题干对应片段。
- 正文使用 `text-only` 与 `interleaved`：每个教学环节落自己的证据，前序推理保留。
- 讲解关键词用强调标记，最终结论用结论标记；颜色只服务当前证据，不替代 TTS 解释。
- 审题固定 group 1，不设互动；推导环节把互动放在关系识别、关键中间量或最终列式之前。

## 当前 action 与步骤骨架

```text
{前缀}_开始
→ {前缀}_步骤NN_展_…
→ 可选 {前缀}_步骤NN_问_… / {前缀}_步骤NN_答_…
→ {前缀}_步骤NN_算_…
```

- plan 顶层使用 `layout:"text-only"`、`guidanceLayout:"interleaved"`，并携带只含 title 的 `guidanceChain`。
- 每步使用题内短 id、`action`、`phase`、`group`、`agent`、`push`、`moduleNote`；开场为 `start/group:0`。
- `group:1` 用 `problemBrief` 快照 + `stemClass` 题干高亮完成审题；group 2 起每组至少一张卡和一道互动。
- `agent.description`、互动两段式、屏幕简洁与数学排版仍先服从 `plan/common/*`，当前 text 的字段/标记细则见 [presentation.md](presentation.md)。

## 列式挖空

当 outline 已判定为唯一单步算式时，使用文字题现有 fill/卡片承载空格，放在所需条件全部出现之后、完整算式揭晓之前。文字高亮可指出所用条件，但不得借 UI 再次判断是否该挖空。

## 当前接入约束

接入当前文字仓仍需遵循 `text-only-marks.md` 的 `tx-*` 类名与 `stemClass` 用法；题干 mark 片段与审题点亮契约见 common/schema.md「题干高亮契约」。不要为目标字段修改现有 engine、schema 或课程内容。

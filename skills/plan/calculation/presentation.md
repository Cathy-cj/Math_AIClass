# 计算 Profile：上屏呈现与现行 marks

**职责：** 规定 calculation profile 的要点、详解、答案呈现以及列式挖空的落位。  
**输入：** 已完成标题/TTS/互动/屏幕证据的 calculation plan steps。  
**输出：** 目标 `profileView.calculation` 呈现意图与对现有 top-split 的映射。  
**禁止项：** 不重写共用教学、TTS、标题或互动决策；不为单题手工补公式换行或 CSS。

> `profileView.calculation` 和统一 profile 调度尚未实现；以下 `.calc-*`、区域、`retainPush` 和容器约定则是当前 calculation 的生产规则。

## 当前区域、类名与累积规则

| 区域 | 主要类 / widget | 用途 |
|---|---|---|
| `top` | `calc-stem`、`calc-eq`、`calc-eq--stem`、`calc-eq-index` | 题干及原题算式 |
| `left` | `calc-label calc-label--key`、`calc-key-list`、`calc-em`、`calc-key-choice` | 要点及其互动 |
| `right` | `calc-key-pin`、`calc-key-tex` | `详解_起` 后钉住的短摘要或公式 |
| `left` | `calc-solve-note`、`calc-solve-step`（或 `solveStep`） | 一拍一组的详解注释与完整算式 |
| `left` | `calc-answer calc-answer--final`、`highlightAnswer` | 最后才出现的答案 |

- `retainPush` 是模块 side effect 的**保留 step-id 列表**，不是 CSS 或“永不清屏”开关。要点拍保留前序要点；`详解_起` 省略它以清空左栏并重新钉右栏；后续详解和答案保留详解起 id 与已讲详解步 id。
- 演算新增行必须往下累积；`replaceKey` 只用于同一语义槽的原位改写，不能用同一 key 覆盖旧演算。
- 同一模块多题时每题一个 `containers[]` 项，side effect 的 `containerIdx` 必须等于该题容器下标；以 `head: "例"` / `"练"` 分组，不能把所有开始动作堆入一个容器。

## 已确认容器常量

当前 golden 容器是 `layout: "top-split"`、`guidanceLayout: "stacked"`、`textAccumulate: true`，并使用 `edgePad: 28`、`gap: 24`、`splitLeftWidth: "58%"`、`splitMinHeight: 420`、`bodySize: 24`、`lineHeight: 1.55`。

其它数值不在此猜测或扩写；若运行时实现改变，先核对 `AIClass_calculation/engine/src/styles/calc-explain.css` 与对应容器实现，再同步更新本文件。

## 呈现骨架

```text
开场 → 要点 → 详解切换 → 详解微步累积 → 答案
```

- 顶部显示原题；要点仅呈现一到两条策略证据。
- 进入详解时，将更短的策略摘要钉在右侧；左侧从首个演算微步开始累积。
- 每个详解微步呈现“本拍理由 + 一行完整算式”；中间结果不能整块跳出。
- 答案在最后突出显示，并保留必要的已讲演算链。

## 与当前实现的映射

接入现有计算仓时，沿用本目录的 `plan.md`、本文件与 `preview.md`：

- 容器为 `top-split`，要点在左侧，详解切换拍只钉右侧摘要。
- 详解用 `calc-solve-note` 与 `calc-solve-step` 成对呈现；答案用 `calc-answer--final`。
- `retainPush` 保留右侧钉与已完成详解；不要复用它绕过引擎清屏语义。

## 列式挖空位置

满足共用条件时，放在学生已获得全部所需量、但尚未展示最终算式的临界拍；通常位于详解末尾或答案前。其空格和答案在共用 interactions 中确定，本文件不重新判定是否需要。

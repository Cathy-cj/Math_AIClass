# 屏幕数学排版：当前兼容规则

屏幕数学统一使用 `$...$` 内的 LaTeX；JSON 中反斜杠写为 `\\`。中文说明和单位放在公式外。

```json
{
  "options": [
    { "value": "A", "label": "A. $\\frac{1}{2}$" },
    { "value": "B", "label": "B. $\\frac{1}{3}$" }
  ],
  "answer": "B"
}
```

- 禁止 `½`、`⅓`、`√2` 等 Unicode 数学替代写法。
- 显示用 LaTeX 不写入稳定的 `value` 或 `answer`；判题值保持独立。
- `agent.description` 是中文读法逐字稿，不复制屏幕 LaTeX。

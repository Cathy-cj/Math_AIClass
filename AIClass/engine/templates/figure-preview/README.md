# figure-preview — 审图预览页（引擎模板）

每道题在根 `_output_/{grade}/{courseId}/{problemId}/` 下生成 **`figure-preview.html`**，供双击本地审图。样式与逻辑统一走本目录，**不必每题手写 HTML**。

## 用法

在 `engine/`：

```bash
npm run figure:preview -- <courseId>/<problemId>
```

读取 `_output_/{grade}/{courseId}/{problemId}/figure-spec.json`（可选读 `outline.json` 补标题），写出同目录的 `figure-preview.html`。

改 spec 或 `preview.info` 后重新跑上述命令即可刷新。

## figure-spec 里的 preview 块

```json
{
  "preview": {
    "title": "例1 · 图形预览",
    "subtitle": "分数涂色面积",
    "info": [
      { "label": "外框", "value": "大长方形宽 <code>3</code>、高 <code>1</code>…" }
    ]
  }
}
```

- `info[]` 渲染在**图形下方**「图形参数」区；`value` 可含 `<code>`。
- 绘图仍用 spec 的 `board` / `points` / `segments` / `polygons`；构造点自动隐藏。

## 文件

| 文件 | 作用 |
|------|------|
| `preview.template.html` | 生成页骨架 |
| `preview.css` | 统一样式 |
| `preview-draw.js` | 隐藏构造点 + 线面分层绘制 + 底部信息面板 |

流程说明见根 [`skills/figure/specification.md`](../../../../skills/figure/specification.md)。

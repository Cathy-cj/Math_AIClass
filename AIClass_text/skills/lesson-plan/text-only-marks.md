# text-only 高亮与样式传参（对齐 module_template）

未来写 plan / 生成模块时，**只传这些类名与字段**即可复现模板样式，不必再写课级 CSS。

## 题干同步高亮（红）

开场题干：

```json
{
  "type": "text",
  "region": "top",
  "class": "tx-stem",
  "lines": [{
    "html": true,
    "text": "……<span class=\"tx-stem-mark tx-stem-mark--grow\">草均匀生长</span>……"
  }]
}
```

审题步用 `stemClass` 点亮（加 `--lit` → **红**）：

```json
"stemClass": [
  { "selector": ".tx-stem-mark--grow", "add": "tx-stem-mark--lit" },
  { "selector": ".tx-stem-mark--pair", "add": "tx-stem-mark--lit" }
]
```

## 讲解关键词（黄）

讲解区 HTML 用 `--em`：

```html
<span class="tx-stem-mark tx-stem-mark--em">日长</span>
```

- `--em` → **黄**
- 讲解区若误写 `--lit`，引擎也会按区域自动显示为黄（避免和题干红混淆）

## 结论/得数（绿）

```html
<span class="tx-stem-mark tx-stem-mark--green">40（份）</span>
```

## 审题标签

| 用途 | 传参 |
|------|------|
| 已知 | `"type":"section","tag":"已知","tagTone":"known","lead":"…","leadHtml":true` |
| 求 | `"type":"section","tag":"求","tagTone":"ask","lead":"…"` |
| 挂行追加 | 文本块加 `"hangAfterTag": true` |
| 小节徽章 | `"type":"section","tag":"求每天生长的草量"`（无 title/lead） |
| 最终答 | `"class":"tx-label tx-label--answer","tag":"答：","title":"…"` |

## 逐步揭示

- **一 action 尽量只上屏一小步**
- 题干 `region:"top"` 只在开场；讲解默认进 interleaved slot
- 布局固定：`layout:"text-only"` + `guidanceLayout:"interleaved"`
- 字号/纸格/引导轨由引擎 CSS 提供，课级 `lesson.css` 只放 token，不重写板式
- 引导链圆点与竖茎绑定在 `.cc-guide-track`（同列 DOM）；只改 `--cc-guide-dot-*`，**禁止**写死 `--cc-guide-rail-x` 或再画面板级虚线

## 不要做

- 不要再嵌 `problemBrief` 上屏卡（text-only 已废弃）
- 不要用灰底卡片包讲解区
- 不要把题干高亮与讲解高亮都写成同一种颜色类却指望不同色——题干用 `--lit`，讲解用 `--em`
- 不要把引导链条与节点拆开定位（无面板级 `::before` 虚线、无课级写死 `--cc-guide-rail-x`）

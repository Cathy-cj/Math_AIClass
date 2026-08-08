# Plan 阶段入口

**职责：** 将已批准的 outline 教学拍翻译为逐拍的标题、TTS、互动和上屏证据，目标产物为 `plan.json`。  
**输入：** 已批准的 `outline.json`；figure profile 还输入已确认的 `figure-spec.json`。  
**输出：** 含逐拍来源追溯的目标版 `plan.json` 设计。  
**禁止项：** 不改 outline 的教学顺序或教学意图；不生成 JS；不重画图；不把尚未实现的目标字段说成当前 engine 已支持。

> 计算课按 `common/schema.md` 的 calculation 兼容段与 `plan/calculation/*` 落盘；文字课按 text 兼容段与 `plan/text/*` 落盘；有图题按 `plan/figure/*` 自检。`screenTitle`、`source`、`profileView` 等未实现字段仍不可写入当前生产 JSON。

## 必读组合

所有 profile 均读取：

1. `common/teaching.md`
2. `common/voice.md`
3. `common/phrase-bank.json`
4. `common/interactions.md`
5. `common/screen-copy.md`
6. `common/math-typesetting.md`
7. `common/schema.md`

再按 `renderProfile` 读取：

| profile | 追加文件 |
|---|---|
| `calculation` | `calculation/plan.md`、`calculation/presentation.md`、`calculation/preview.md` |
| `text` | `text/plan.md` |
| `figure` | `figure/plan.md` |

## 工作顺序

1. 保持 outline 的教学顺序；一个教学拍必要时可拆成多个微步。
2. 为每拍确定自然完整的标题、TTS、互动和屏幕证据。
3. 共用规则决定“怎样讲”；profile 规则只决定“在哪里、以什么布局显示”。
4. calculation 与 text 当前生产时，依 `common/schema.md` 的对应兼容字段和各仓 `plan:check` 落盘；figure 仍仅按目标 schema 自检。

## 当前实现边界

- 当前 outline 使用 `teachingStages[]`、`loop` 等字段，尚未实现目标模型的 `stages[] → beats[] → teachingNote`。
- 当前 plan 未强制 `source`、`screenTitle`、`titleOrigin`、`interaction`、`screenEvidence` 或 `profileView`。
- 当前 engine 尚未以统一 `renderProfile` 字段调度 calculation/text/figure，也无目标 `profileView` 字段；但共享引擎已可按 plan 的 `layout` 同课混排 `top-split` / `left-right` / `text-only`（8-1-mix 已验证）。

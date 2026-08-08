# AIClass Platform Skills

根目录 `skills/` 是本平台制作 SOP 的唯一真源。目录按制作阶段组织：

```text
outline → figure（仅有图）→ plan → make
```

## 从哪里开始

| 当前工作 | 入口 | 产物 |
|---|---|---|
| 设计教学步骤 | [outline/SKILL.md](outline/SKILL.md) | `outline.json` |
| 有图题实画并确认图形 | [figure/SKILL.md](figure/SKILL.md) | `figure-spec.json`、`figure-preview.html` |
| 写每拍标题、口播、互动和上屏 | [plan/SKILL.md](plan/SKILL.md) | `plan.json` |
| 编译、检查和预览课程 | [make/SKILL.md](make/SKILL.md) | 模块、debug 页、派生物 |
| 命名、流程与 CLI | [make/pipeline.md](make/pipeline.md) | courseId、现有 CLI |

## 必读组合

### Outline

| 题型 | 必读 |
|---|---|
| 纯计算 | `outline/common.md` → `outline/naming.md` → `outline/calculation.md` |
| 纯文字 | `outline/common.md` → `outline/reasoning-problem.md` → `outline/phase-routing.md` |
| 有图 | `outline/common.md` → `outline/reasoning-problem.md` → `outline/phase-routing.md` → `outline/figure-addon.md` |

### Plan

所有题先读：

```text
plan/common/teaching.md
plan/common/voice.md
plan/common/phrase-bank.json
plan/common/interactions.md
plan/common/screen-copy.md
plan/common/math-typesetting.md
plan/common/schema.md
```

再追加：

| `renderProfile` | 追加文件 |
|---|---|
| `calculation` | `plan/calculation/plan.md`、`presentation.md`、`preview.md` |
| `text` | `plan/text/plan.md`、`plan/text/presentation.md` |
| `figure` | `plan/figure/plan.md`、`plan/figure/presentation.md` |

### Make

| `renderProfile` | 必读 |
|---|---|
| `calculation` | `make/pipeline.md` → `make/common.md` → `make/calculation-runtime.md` |
| `text` | `make/pipeline.md` → `make/common.md` → `make/text-runtime.md` |
| `figure` | `make/pipeline.md` → `make/common.md` → `make/figure-runtime.md`，并读取 confirmed `figure-spec.json` |

## 核心边界

- outline 决定“教什么”：完整 `teachingNote`、互动意图、图形教学职责。
- figure 决定“图有什么”：对象、坐标、可用状态和动作能力。
- plan 决定“每拍怎么讲和怎么显示”：标题、TTS、互动、上屏、图形动作时机。
- make 决定“如何运行”：模块、容器、action 映射、检查和预览。

`screenTitle` 属于 plan；除“审题”“从哪入手”外，outline 不预设屏幕标题。

## 当前限制

共享引擎（`AIClass/engine`）已支持同一课程混排不同布局模板（`top-split` 计算 / `left-right` 有图 / `text-only` 文字，8-1-mix 已验证）；它由每个 plan 的 `layout` 字段驱动，无需统一字段。`stages[]`、`beats[]`、`teachingNote`、`screenTitle`、`source`、统一 `renderProfile` 字段与 `profileView` 尚未被当前 engine/schema 实现，不可将它们写成当前生产 JSON 的硬字段。

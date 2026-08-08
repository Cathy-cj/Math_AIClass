# make：将计划编译为课程运行模块

> `common.md` 与 `calculation-runtime.md` 覆盖当前 calculation 的课程登记、模块映射、debug、CLI 与 preview 契约，可指导现有 calculation 课生产。

## 职责

读取已校验的 `plan.json`（有图时再读取已确认的 `figure-spec.json`），按照单一 `renderProfile` 的 runtime 规则生成课程壳、模块、debug 页，并执行检查、生成与预览。

## 输入

- `plan.json`，它是逐拍标题、TTS、互动、上屏证据和动作选择的真源；
- `course.json` 的课程与题目登记信息；
- `renderProfile`：`calculation`、`text` 或 `figure`；
- figure profile 的 confirmed `figure-spec.json`；
- 现有 engine 的模板、CLI 与校验能力。

## 输出

- 已登记的 `course.json`（在 `_output_/{grade}/<courseId>/course.json`）；
- `_output_/{grade}/<courseId>/.generated/lesson/modules/` 中对应模块；figure profile 另有 Figure 注册模块；
- `_output_/{grade}/<courseId>/debug/index.html`；
- 由现有检查、生成、预览流程更新的构建产物（`.generated/`）。

## 禁止项

- 不改教学拍顺序、screenTitle、TTS、互动、push 语义或图形教学意图；
- 不以 outline 代替 plan 生成模块；
- 不在 common 中决定 profile 的 action 顺序、容器或交互插入位置；
- 不把 `.generated/` 当作可手改真源；
- 不把按题 `renderProfile` 选择 runtime 或目标 `profileView` 描述为当前 engine 已支持能力（同课混排不同 `layout` 模板已按 plan 的 `layout` 验证，8-1-mix）。

## 必读组合

| renderProfile | 必读文件 |
|---|---|
| `calculation` | [common.md](common.md) + [calculation-runtime.md](calculation-runtime.md) |
| `text` | [common.md](common.md) + [text-runtime.md](text-runtime.md) |
| `figure` | [common.md](common.md) + [figure-runtime.md](figure-runtime.md) + confirmed figure spec |

一个题只能按它的 `renderProfile` 选择一个 runtime 文件。公共规则不复制到 profile runtime；profile runtime 也不重写 plan 的教学内容。

## 执行流程

1. 确认 plan 已通过内容检查；figure 题还必须已通过图形确认。
2. 读取 `common.md`，建立最小课程协议、课壳、debug 和 pipeline 内部状态边界。
3. 读取一个 runtime 文件，按该 profile 把 plan 编译为现有模块和 action catalog。
4. 运行当前仓已提供的 `course:check`、`lesson:generate`、`course:preview`；仅在该 profile 的 preview 要求满足后完成 preview 状态。
5. example 完成预览后，沿既有 pipeline 的配对关系推进 practice；不凭 runtime 自造题目顺序。

## 与前序阶段的边界

```text
outline：教什么
figure spec：图有什么对象和能力
plan：每拍怎样讲、何时触发图形
make：把上述结果编译为当前运行时可执行结构
```

make 对 plan 是保真映射层：可以选择既有运行时的 action、容器和实现方式，但不得借此重写教学设计。

## 当前实现边界

本目录规则覆盖 calculation 与 text 的生产入口；figure 相关规则见 `figure-runtime.md`。统一 `renderProfile` 字段与目标 `profileView` 仍是**待 engine 改造**；共享引擎已可按 plan 的 `layout` 同课混排不同模板（8-1-mix 已验证），但按题 `renderProfile` 选择 runtime 尚未实现。

# 有图 Profile：现行 left-right 呈现与动画契约

**职责：** 定义当前 AIClass 有图课的 plan 如何使用已确认的 `figure-spec.json`、`left-right` 容器和 Figure 动作。  
**边界：** 本文件只规定当前可执行的呈现字段；不修改 outline 的教学顺序，也不重新设计图形对象或坐标。

## 当前 plan 兼容字段

- 顶层固定 `layout: "left-right"`、`guidanceLayout: "interleaved"`，并使用只含 `title` 的 `guidanceChain[]`。
- 开场为 `group: 0`；审题为 `group: 1`，用 `problemBrief` 快照逐步展开已知/所求/关键，并用 `stemClass` 同步点亮题干对应片段（契约见 common/schema.md「题干高亮契约」），不设置互动。
- 后续 group 与 `guidanceChain` 连续对应；每个 group 至少落一张右栏证据卡并至少有一道互动。
- step 的 `figure` 可使用 `state`、`note`、`actions[]`、`transition` 与 `keepPrevious`；它们只选择 confirmed spec 已声明的对象和能力。
- 例题 `quickQA` 绑定模块顶部；练题拍照由 codegen 自动追加，plan 不写拍照 action。

## 图形动作

| 动作 | 用途 |
|---|---|
| `highlight` / `dim` | 让当前关系成为视觉焦点，或弱化非当前对象 |
| `show` / `hide` / `draw` | 显示 spec 已定义的点、线、辅助线或标记 |
| `label` | 显示 confirmed spec 已允许的图上标签 |
| `color` / `blink` | 辅助区分或核验，不替代数学依据 |

- `keepPrevious` 只用于保留仍有教学价值的前一步视觉状态；切换关系时应明确清理。
- 图形动作服务“看懂哪条关系”，不能把未经题干给定的外观关系伪装成结论。
- 同底等高等体积比较中，视觉填充比例表达体积份数，不能把体积比误画成高度比。

## 图文分工

- 左图：对象、位置、关系与状态。
- 右栏：已知、关系依据、关键式和结论；不同语义内容使用新的 `replaceKey` 向下累积。
- `problemBrief` 只通过审题阶段快照出现，之后由关系卡和图形状态承接；不得重复把整份 brief 常驻上屏。

## 当前 preview 验收

确认所有 `figure.state/actions` 只引用 confirmed spec 的能力；图与右栏关系同步；辅助线、标签和高亮在对应步骤出现；从开场能完整播放到答案；quickQA 与练题拍照位置正确。

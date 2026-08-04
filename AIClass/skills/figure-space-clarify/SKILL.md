---
name: figure-space-clarify
description: >-
  课件制图前的图形空间确认：用短对话澄清 2D/3D 几何关系，产出 figure-spec 后再画图。
  触发：确认图形、空间关系、怎么画图、figure 规格、制图确认、大纲完成后画图。
  在 lesson-outline 之后、编写 _*-figure.js / 填 figure.state 之前使用。
---

# Skill：figure-space-clarify（图形空间确认）

## 在课件流程中的位置

```
lesson-outline（outline approved）
    → figure-space-clarify（本技能，图形确认 OK — 唯一人工停点）
        → 编写 Plan figure.* / courses/.../_*-figure.js
            → course:check / lesson:generate / preview
```

- **讲法**先由 outline 定；**画什么**由本技能定；**怎么画进课件**再写 Figure 模块。
- 绘图实现：JSXGraph 2D + View3D（见 monorepo `docs/production/figure-tooling.md`）；引擎内 `engine/src/figures/`（`jxg-kit-2d.js` / `jxg-kit-3d.js` / `view3d-animate.js`）。
- **3D**：与 2D 同一 vendor（View3D）；须在 spec 里写明 `engine`: `jsxgraph-view3d`。

## 目标

产出（落在 authoring 题目录，与 outline 同级）：

| 产物 | 用途 |
|------|------|
| `lesson/{id}/figure-spec.json` | 给 `JXGKit2D` / `JXGKit3D` 的数据（points / edges|segments / faces|polygons）＋ `status` |
| `lesson/{id}/figure-preview.html` | **用 JS 实画的预览页**——人审的对象；确认后保留在课件文件夹，正式制作 Figure 模块时以它为参考 |

**确认不靠文字描述图**：直接用 JSXGraph 把图画出来给人看，人看图说「图形 OK」。这是**制作流程唯一的人工停点**。不产出 figure-space.md。

**禁止**在本阶段：写完整 `plan.json`、写 action 名、写逐步口播、直接大段改课件 runtime。

## 输入

- 题干 / 截图 / 已有 `outline.json`（含 `figureTemplate`）
- 大纲落盘且 `plan:check` 通过后的制图请求

## 触发后怎么做

### 0. 判断是否需要深确认

| 情况 | 深度 |
|------|------|
| 标准平面图形、关系题面已写清 | **标准**：下方问题树，一次一问（仍须实画 preview） |
| 仅投影图、立体、「打开的书」、倾斜容器、空间四边形 | **标准**：下方问题树，一次一问 |
| 本题无图 / 无 `figureTemplate` | **跳过本 skill**，不进入图形门禁 |

有图题**禁止**仅用文字描述代替实画确认；用户说「直接做 / 不用问」只表示跳过问答树，**不**豁免 preview。

### 1. 判定维度

先判定并写入 spec：`dimension`: `"2d"` | `"3d"`。  
不确定时 **只问这一题**（推荐项放前）：

> 这题左图按 **2D 平面几何** 做可以吗？若是立体关系再按 3D 确认。

### 2. 一次一问（按优先级）

**2D 优先问：**

1. **坐标系底板如何显示？**确认视窗范围、坐标轴、刻度与网格。函数/坐标题默认 `axis: true`、`grid: true`；若关闭网格，须由用户确认并记录理由。
2. 关键点 / 线段 / 圆是否齐全？有无隐藏交点要画出？
3. 直角、等长、平行、中点等标记落在哪？
4. **初始态关键点坐标从何而来？**逐点标为：题干给定 / 推导得到 / 动点代表位置；动点代表位置必须说明取值理由（如满足关系的整点、端点、中点），不得默认为随机。
5. 交互：讲课态点是否全部 `fixed`？（课件默认 **是**）

**3D 优先问（命中立体时）：**

1. 哪些点共面？两平面交线是哪条？
2. 点相对交线的上下/两侧关系？
3. 直角、等长落在哪条棱/哪个角？
4. 交互：是否 **仅旋转观察、不可拖点改形**？（默认 **是**）
5. 初始视角 / 复位姿态是否要指定？（可稍后 `captureHome`）

每轮 **只问 1 个问题**；带推荐默认，请用户确认或改正。

### 3. 实画确认（动手前必做，代替文字描述）

1. 按当前理解写 `figure-spec.json` 草稿（`"status": "draft"`）。若有坐标系，`board` 必须写 `boundingbox`、`axis`、`grid`、`keepAspectRatio`；函数/坐标题默认启用坐标轴和网格。另必须写 `initialState`：
   - `state: "default"`；
   - `coordinatePolicy: "show-key-coordinates"` 或 `"hide-representative-coordinate"`；
   - `coordinateSource` 逐点记录 `type`（`given` / `derived` / `representative`）与 `basis`。`representative` 必须写明该点满足的关系及选择理由，并明确不代表极值、答案或特殊位置。
2. 在 `engine/` 运行 **`npm run figure:preview -- <lessonId>`**（或 `node tools/figure-preview.mjs lesson/{id}/figure-spec.json`）——引擎模板生成 **`lesson/{id}/figure-preview.html`**（见 [`docs/production/figure-tooling.md`](../../docs/production/figure-tooling.md)）。**禁止**手写自包含 `initBoard` 预览页。
3. 请用户**双击打开 figure-preview.html 看图**，对话里只附一句要点＋检查清单：
   - [ ] 视窗、坐标轴、刻度/网格与题图及讲解需求一致
   - [ ] 空间/平面关系与题图一致
   - [ ] 直角/等长等标记无遗漏
   - [ ] 初始态每个关键坐标的来源与显示策略正确；动点代表位置不被误解为答案或极值
   - [ ] 交互符合讲课需求（点固定 / 仅旋转）
4. 用户指出偏差 → 改 spec ＋ preview 重画，再看；明确说 **「图形 OK」** / **「按这个画」** 才算定稿

用户只回「嗯 / 好 / ok」且尚未看过 preview → **继续澄清**，不要当成定稿。

### 4. 落盘格式

#### figure-spec.json 最小约定

与 `engine/src/figures/` 的 `JXGKit2D` / `JXGKit3D` 对齐：

**2D**

```json
{
  "id": "problem-id",
  "dimension": "2d",
  "engine": "jsxgraph-2d",
  "figureTemplate": "optional-template-name",
  "board": {
    "boundingbox": [-5, 5, 5, -5],
    "axis": true,
    "grid": true,
    "keepAspectRatio": true
  },
  "points": { "A": [0, 2], "B": [-2, 0], "C": [2, 0] },
  "initialState": {
    "state": "default",
    "coordinatePolicy": "show-key-coordinates",
    "coordinateSource": {
      "A": { "type": "given", "basis": "题干给定 A(0,2)" },
      "B": { "type": "representative", "basis": "动点初始取整点，满足所在直线；非答案位置" }
    }
  },
  "segments": [["A", "B"], ["B", "C"], ["C", "A"]],
  "polygons": [
    { "vertices": ["A", "B", "C"], "fillColor": "#3b82f6", "fillOpacity": 0.28 }
  ],
  "interaction": { "pointsFixed": true }
}
```

**3D**

```json
{
  "id": "problem-id",
  "dimension": "3d",
  "engine": "jsxgraph-view3d",
  "home": { "az": 1.05, "el": 0.42, "bank": 0 },
  "bounds": [[-5, 5], [-5, 5], [-5, 5]],
  "points": { "A": [0, 0, 2], "B": [-2, 0, 0], "C": [2, 0, 0] },
  "edges": [["A", "B"], ["B", "C"], ["C", "A"]],
  "faces": [
    { "vertices": ["A", "B", "C"], "fillColor": "#3b82f6", "fillOpacity": 0.4 }
  ],
  "interaction": {
    "pointsFixed": true,
    "trackball": true,
    "resetWith": "View3DAnimate"
  }
}
```

坐标无绝对标尺时：保持关系正确即可，viewport / bounds 留约 10–15% 边距。

### 5. 「图形 OK」之后

1. 在 `figure-spec.json` 顶层写 `"status": "confirmed"`（草稿阶段为 `"draft"`）；`figure-preview.html` **保留在题目文件夹**，正式写 `_*-figure.js` / 填 `figure.state` 时以它为基准参考。
2. 若已挂课：用 **course-pipeline** 写门禁  
   `npm run pipeline:board -- <courseId> --gate <problemId> figureOk`（在 `engine/`）
3. 告知下一步：
   - 用 kit / `engine/src/figures` 预览 spec；
   - 课件侧：写 `lesson/modules/_<figure>-figure.js`，并在 Plan 中绑 `figureTemplate` / `figure.state`。
4. **不要**在本技能内擅自开始长篇改 Plan actions，除非用户接着要求写 Figure/Plan。

## 与 lesson-outline 的衔接

- 本题有图 / `figureTemplate` 且 outline 已 approved → **主动建议**进入本技能（一句即可）。
- 若大纲阶段已能唯一确定图形且用户要求「连图一起出」→ 可在同会话进入本技能，但仍须完成「实画确认」（figure-preview.html 给人看过）。

## 禁止

- 一轮抛多个空间问题
- 未确认就写死复杂 3D 坐标当最终课件
- 用单张投影图「猜」深度还声称唯一正确
- 绕过 `AIClassFigureRegistry` 契约去改 Host 协议（本技能只出 spec / 描述）

## 自检

- [ ] `dimension` / `engine` 已写明
- [ ] 坐标系图已确认 `boundingbox`、坐标轴、刻度/网格；若关闭网格，已记录用户确认的理由
- [ ] 关系与题图标记一致
- [ ] 坐标系图已记录初始态关键点的来源；代表位置有可复核的选取理由，且 preview 已按策略显示或明确隐藏
- [ ] `interaction.pointsFixed` 符合讲课默认
- [ ] 用户已看过 `figure-preview.html` 实画并说 **图形 OK**
- [ ] 已落盘 `figure-spec.json`（含 `status`）＋ `figure-preview.html`（不产出 figure-space.md）

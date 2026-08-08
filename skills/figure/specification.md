# figure specification：图形对象与能力规格

## 职责

定义 `figure-spec.json` 的图形空间事实和运行时可用能力：对象、坐标、初始状态、状态集合、可执行动作能力以及预览验证条件。

## 输入

- outline figure addon 的 `needsFigure`、`figureTemplate` 与按 beat 记录的 `visualIntent`；
- 题干、题图、已知几何关系和用户澄清；
- 当前引擎已支持的 JSXGraph 二维或 View3D 能力。

## 输出

- 可供预览和 Figure runtime 消费的 `figure-spec.json`；
- 对应的 `figure-preview.html`；
- 清晰的 `draft` / `confirmed` 状态与可复核的图形约束。

## 禁止项

- 不写 TTS、screenTitle、互动、push、action 名或 plan step；
- 不规定每拍动画的播放时机、顺序或时长；
- 不在未确认前把推测的空间关系宣称为唯一正确；
- 不重写 engine 注册协议、课程壳或容器布局。

## 规格内容

### 一、空间与对象

spec 必须写清：

- `dimension`：`"2d"` 或 `"3d"`；
- `engine`：例如 `"jsxgraph-2d"` 或 `"jsxgraph-view3d"`；
- `figureTemplate`：供后续 Figure 模块注册与复用的模板标识；
- 二维的 `board`（视窗、坐标轴、网格、纵横比）或三维的 `bounds`、`home`；
- `points`、`segments` / `edges`、`polygons` / `faces` 等构成对象；
- 直角、等长、平行、尺寸线、隐藏线等题意所需标记；
- `interaction`：讲课态的固定点、三维观察与复位能力。

坐标无绝对标尺时可采用代表坐标，但必须保证关系正确并保留适当视窗边距。

### 二、坐标与初态可追溯性

`initialState` 至少说明默认状态及关键点的来源策略。每个关键点标为：

- `given`：来自题干；
- `derived`：由已知关系推得；
- `representative`：用于讲解的代表位置。

代表位置必须写清满足的关系和选择理由，并明确它不是答案、极值或未经证明的特殊位置。坐标系题还应说明是否显示关键坐标。

### 三、状态与动作能力

spec 定义的是后续 plan 可以调用的**能力目录**，而非教学拍的调度表：

- `states`：可复用的图形视觉状态，如默认、突出一组对象、显示一条辅助线；
- 对象稳定的构件 id，供 `targets` / `target` 引用；
- 支持的动作能力，如 `dim`、`highlight`、`color`、`draw`、`label`、`blink`、`separate`、`fill`、`show`；
- 各能力允许操作的构件及必要参数。

`label.text` 属于图上标签，不经过右栏 KaTeX 管道；其文本格式须与当前 Figure 实现能力一致。plan 可从此能力目录中选择动作，但只有 plan 决定选择哪一个、在哪一拍执行。

### 四、最小示例

```json
{
  "id": "example-01",
  "dimension": "2d",
  "engine": "jsxgraph-2d",
  "figureTemplate": "triangle-area",
  "status": "draft",
  "board": {
    "boundingbox": [-5, 5, 5, -5],
    "axis": true,
    "grid": true,
    "keepAspectRatio": true
  },
  "points": {
    "A": [0, 3],
    "B": [-3, 0],
    "C": [3, 0]
  },
  "initialState": {
    "state": "default",
    "coordinatePolicy": "show-key-coordinates",
    "coordinateSource": {
      "A": { "type": "given", "basis": "题干给定坐标" }
    }
  },
  "segments": [["A", "B"], ["B", "C"], ["C", "A"]],
  "states": {
    "show-base-height": {
      "availableTargets": ["BC", "height-line"]
    }
  },
  "actions": {
    "highlight": { "targets": ["AB", "BC", "CA"] },
    "draw": { "targets": ["height-line"] },
    "label": { "targets": ["height-line"] }
  },
  "interaction": { "pointsFixed": true }
}
```

`visualIntentByBeat` 可保留为从 outline 到图形规格的追溯信息，但不得在这里写为“第几拍播放何动作”。

## 预览与审图循环

1. 以 `status: "draft"` 保存 spec。
2. 使用现有引擎预览工具生成 `figure-preview.html`。
3. 审查视窗、关系、标记、坐标来源和讲课交互是否正确。
4. 有偏差则修改 spec 并重画预览。
5. 用户明确「图形 OK」或「按这个画」后才写 `status: "confirmed"`。

只要用户尚未看过预览，或回复仅是含糊认可，就不能把规格置为 `confirmed`。

## 与 plan / make 的接口

- plan 读取 confirmed spec，给每个 step 选择 `figure.state` 与 `figure.actions[]`，并决定其动画时机；
- figure runtime 原样实现规格对象/能力，并执行 plan 指定的状态和动作；
- runtime 不得私自增加对象、重定坐标或创造动画；这类变更必须回到本规格并重新预览确认。

## 当前实现边界

这里记录目标字段和职责划分，不意味着现有 schema 已校验 `states`、能力目录或跨 profile 调度。新增字段、lint、codegen 与引擎支持应在后续实现阶段同步落地。

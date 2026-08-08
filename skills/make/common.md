# make common：最小课程协议

## 职责

定义所有 runtime 共用的最小课程协议、课壳与课程专属 debug 页。

## 输入

- 已校验的 plan 元数据；
- 课程标识、题目登记与既有 engine 模板；
- runtime 已选择的 `renderProfile`。

计算课登记的当前命名和 `afterPlanId` 关系，先读 [../outline/naming.md](../outline/naming.md)；它不取代 course.json 的既有校验。

## 输出

- 可被 profile runtime 填充的 `course.json` 公共登记；
- 一门课对应一个课程壳和 debug 页。

## 禁止项

- 不决定 action 名称或 action 顺序；
- 不决定容器、layout、region、CSS 类或 side effect 路由；
- 不决定 quickQA、拍照、列式挖空的具体 action 与插入位置；
- 不改变 plan 的标题、口播、互动或图形指令；
- 不承诺当前 engine 尚未支持的混合模板能力。

## 最小课程协议

共享新引擎的课程登记至少需要区分年级、题目的教学角色与渲染方式：

```json
{
  "courseId": "course-01",
  "grade": 6,
  "authoring": {
    "problems": [
      {
        "problemId": "ex-01",
        "moduleType": "example",
        "renderProfile": "text",
        "order": 1,
        "actionPrefix": "例一"
      }
    ]
  }
}
```

- `problemId`：关联 plan 与模块的稳定标识；
- `grade`：所有引擎的必填年级；导出目录按它分为顶层 `dist/<grade>/<courseId>/`；
- `moduleType`：教学角色，例如 `example`、`practice`；
- `renderProfile`：由哪个 profile runtime 编译；
- `order`：课程内排序；
- `actionPrefix`：该题动作前缀。

`moduleType` 不等于 `renderProfile`。前者表达例题/练题等教学角色；后者表达渲染运行时。

每题的中间产物固定写入 `_output_/{grade}/<courseId>/<problemId>/`：`outline.json`、`plan.json`、可选 `figure-spec.json`、`figure-preview.html` 和生成的 `output.json` 共用这一目录。`actionPrefix` 与模块 action 名一致。例题 quickQA 绑定其 plan / 模块而非独立 problem；练题的 `lessonContext.afterPlanId` 指向配对例题，供 agent 在例题 preview 后推进。完整的按引擎命令与产物路径见 [pipeline.md](pipeline.md)。

## 课壳与课程专属 debug

1. 使用既有 `course:new` 或等价模板创建课程壳；courseId 的来源遵从现有命名约定。
2. 每门课保留 `_output_/{grade}/<courseId>/debug/index.html`。
3. debug 页复用当前 parent-shell 的动态协议：从 `help` 获取动作列表、搜索、切换模块、重置、重载和回包日志。
4. 禁止手写固定 action 按钮或把根级通用 debug 页当作该课的替代品。
5. 发布包的调试入口在顶层 `dist/<grade>/<courseId>/debug.html`（兼容引擎可保留包内 `debug/` 目录）；课程源目录中的 `debug/index.html` 仍是日常调试入口。

debug 页服务于**已由 profile runtime 生成的** action catalog；它不决定 catalog 的顺序或内容。

当前 debug catalog 通过 host `help` 消息动态发现。模块必须按既有 host 协议处理动作、普通 `user_submitted`、练题 `course_photo` 与宿主回传 `photo_result`；具体 kind、插入时机与回显行为只由 profile runtime 定义。

## 进度由 agent 维护

门禁状态文件（`pipeline.json` / `pipeline.md`）与 `pipeline:board` 工具已删除：`outlineOk` / `figureOk` / `planOk` / `previewOk` 不执行任何拦截，纯记录，现不再维护。图形确认以用户看过预览后的明确口令为准，落点为 `figure-spec.json` 的 `status: "confirmed"`（`plan-check` 强制校验）。制作进度由 agent 直接读 `_output_/{grade}/<courseId>/<problemId>/` 的文件存在性与状态判断。

当前 CLI 的完整制作顺序是：内容侧在根目录运行 `content:check:<profile>`，随后 engine 侧 `course:check`、`lesson:generate`、`course:preview`。预览须经 HTTP 服务访问；引擎或 codegen 改动后应重新 `course:export` 并强刷 debug iframe。所有发布包写入 `dist/<grade>/<courseId>/`。

## 不属于 common 的事项

| 事项 | 唯一归属 |
|---|---|
| action 顺序、top-split、retainPush、公式验收 | `calculation-runtime.md` |
| text-only、section/高亮、文字题交互落点 | `text-runtime.md` |
| left-right、Figure 注册、状态动作执行 | `figure-runtime.md` |
| 标题、TTS、互动内容、每拍图形时机 | plan |
| 对象、坐标、动画能力 | figure specification |

## 当前实现边界

目标协议中的统一 `renderProfile` 字段与按题 runtime 选择仍是**待 engine 改造**。共享引擎已可按 plan 的 `layout` 同课混排 `top-split` / `left-right` / `text-only`（8-1-mix 已验证）；本阶段不变更任何旧 course schema、CLI 或 debug 壳。

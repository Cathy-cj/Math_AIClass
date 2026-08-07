# 计算题引擎布局与排版（组件契约）

**本文件是 top-split 运行时、公式排版、左栏滚动的唯一权威。**  
内容侧只写 `plan.json`（`region` / `.calc-*` / `retainPush`）；**不要**在课级 CSS 或模块里重复实现布局/换行/缩字。

实现落点：

| 能力 | 引擎路径 |
|------|----------|
| 容器 DOM / region 路由 | `engine/src/core/shell/course-container.js` |
| 详解清屏 / 右栏钉 | `engine/src/core/shell/container-host.js` |
| 跟滚 / 底留白 | `engine/src/core/scroll/scroll-follow.js`、`course-scheduler.js` |
| 公式断点 | `engine/src/components/calc-tex-split.js` |
| 缩字 + 断行编排 | `engine/src/components/calc-line-fit.js` |
| 计算样式 | `engine/src/styles/calc-explain.css`、`course-container.css` |
| codegen 默认容器 | `engine/tools/aiclass.mjs` |

上屏 action 骨架见 [calc-teaching-spine.md](calc-teaching-spine.md)；push 类名见 [calculation-marks.md](calculation-marks.md)。

---

## 1. top-split 容器（全课硬契约）

每题模块 `containers[]` **必须**：

```json
{
  "layout": "top-split",
  "guidanceLayout": "stacked",
  "textAccumulate": true,
  "layoutParams": {
    "edgePad": 28,
    "gap": 24,
    "splitLeftWidth": "58%",
    "splitMinHeight": 420
  }
}
```

**DOM 结构（预览验收用）：**

```text
.course-container[data-layout="top-split"]
  .course-scroll-top          ← region: top（题干）
  .course-split
    .course-split-left
      .course-scroll-left      ← region: left（要点 / 详解 / 答案）
    .course-split-right
      .course-scroll-right     ← region: right（详解_起 钉要点）
```

| 检查项 | 通过标准 |
|--------|----------|
| `data-layout` | 必须是 `top-split`，**不能**是 `text-only` |
| 左右分栏 | 存在 `.course-split`、`.course-scroll-left`、`.course-scroll-right` |
| 右栏钉 | `详解_起` 后 `.course-scroll-right` 内有 `.calc-key-pin` |
| 布局模式 | **禁止** `guidanceLayout: "interleaved"`（文字题专用） |

**引擎维护约束：** `CourseContainer` 的 `LAYOUTS` 须包含 `top-split` / `left-right`；否则运行时会静默降级为 `text-only`（右栏消失）。回归见 `engine/tests/run-tests.mjs`。

---

## 2. region 与 retainPush（与 plan 对齐）

| region | 挂载目标 | 典型内容 |
|--------|----------|----------|
| `top` | `.course-scroll-top` | `calc-stem`、`calc-eq` |
| `left` | `.course-scroll-left` | 要点、详解步、答案 |
| `right` | `.course-scroll-right` | `详解_起` 的 `calc-key-pin` |

**引擎清屏（勿在 plan 绕过）：**

| 拍 | 行为 |
|----|------|
| `详解_起` | 清左栏全部 sideEffect；清右栏旧 sideEffect；push 仅 right 钉；**无 retainPush** |
| `详解_步*` | 仅清左栏非 retain 步；**必须 retain `详解_起` id** 保右钉 |
| `答案` | 同详解步 retain 语义 |

详见 [calc-teaching-spine.md](calc-teaching-spine.md)「引擎清屏」表。

---

## 3. 公式自动排版（calc-line-fit）

**作用范围（引擎自动，plan 无需字段）：**

- `calc-eq` / `calc-eq--stem`（题干）
- `calc-solve-step`（详解）
- `calc-answer` / `calc-answer--final`（答案）
- `calc-key-tex`（右栏公式钉）

**优先级（全课统一，非单题特例）：**

1. **先单行 + 缩小字号**（最低约 50% 原字号），使整式尽量保持一行  
2. 缩到极限仍溢出 → **再在顶层 `=`、`\div`、`\frac`/`\dfrac`/`\tfrac`/`\cfrac` 处断行**（多步推导 `=…=…` 自然拆行）  
3. **禁止**在顶层 `+` / `-` 处断行（裂项/连加一长式 → 单行缩字，不要拆成「第一项一行、后面一行」）

**内容侧写法：**

- 详解步 `tex` **写完整一行即可**；不要用 `\\` 手工换行凑排版  
- 多步等式（多个 `=`）可保持一个 `calc-solve-step`，引擎会按 `=` 断行  
- 单开头 `=` + 长连加式（如「原式全部裂项」）→ **一条 tex**，交给缩字  
- 不要用 Unicode 分式/根号；用 LaTeX `$...$` / `tex` 字段（见 [math-typesetting.md](math-typesetting.md)）

**不要：**

- 在 `lesson.css` 重写 `.calc-fit-line` / `.katex` 字号逻辑  
- 为某一题单独写 JS 换行

---

## 4. 左栏滚动与底留白

计算题 **左栏详解累加** 时：

- 滚动发生在 **`.course-scroll-left` 内**（stage 在 split 布局下锁定，不跟 whole-page 滚）  
- 左栏底留白：`--cc-scroll-bottom-inset: 48px`（`calc-explain.css`）  
- 跟滚须统计左栏**直接子级** `.lf-block` 与 KaTeX 真实高度（非仅 `.course-scroll-stack`）  
- `calc-solve-step` 保留分式下伸空间（`padding-bottom` / `overflow: visible`）

**预览验收：** 滚到该题**最后一条详解或答案**，检查分式分母、分数线是否被底缘裁切。

---

## 5. 预览 · 导出 · 引擎变更后刷新

```bash
cd engine
npm run course:check -- <courseId>
npm run lesson:generate -- <courseId>
npm run course:preview -- <courseId>    # HTTP；勿 file:// 打开
npm run course:export -- <courseId>     # 改引擎后必须 export
npm run pipeline:board -- <courseId> --complete-preview <problemId>
```

打开：`http://127.0.0.1:3456/debug/parent-shell/index.html?src=...`  
引擎或 codegen 变更后：**export + debug iframe 强刷（Ctrl+Shift+R）**。

### previewOk 验收清单（每题必做）

- [ ] 容器 `data-layout="top-split"`，可见左右分栏  
- [ ] `要点_*` 仅左栏；`详解_起` 后右栏出现钉住摘要（半透明背板）  
- [ ] `详解_步*` 左栏逐步下叠，右栏钉不丢  
- [ ] 长公式：优先单行缩字；多 `=` 推导才断行；分母不被底缘裁切  
- [ ] 首屏从题干顶部开始，非误滚到底部 action  

未通过 → 先查 [calc-engine-layout.md](calc-engine-layout.md) 与引擎实现，**不要**在 plan 里用 `\\` 或额外 region 打补丁。

---

## 6. 回归测试

```bash
cd engine
npm test    # 含 calc-tex-split、LAYOUTS、top-split 清屏断言
```

引擎改动布局/跟滚/公式 fit 时，须同步更新本文件与 `engine/tests/`。

---

## 与 sibling 文档的分工

| 文档 | 职责 |
|------|------|
| [calc-teaching-spine.md](calc-teaching-spine.md) | action 骨架、outline→fill 映射、retainPush 语义 |
| [calculation-marks.md](calculation-marks.md) | `.calc-*` 类名与 push 字段 |
| **本文件** | 运行时 DOM、公式 fit、滚动、预览验收 |
| [codegen-lesson/mapping.md](../codegen-lesson/mapping.md) | plan → 模块 JS 字段对照 |

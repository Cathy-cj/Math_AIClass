# 新建一套纯计算课程

示例：课程 `numeric-arithmetic`，标题「纯数字算式」。

跨包约定见 [README.md](./README.md)。日常做到预览。

引擎命令细节见 [`engine/docs/commands.md`](../../engine/docs/commands.md)。

## 1. 创建课程目录

**MD 输入时**：`courseId` = md 文件名去掉 `.md`（详见 [`naming-from-md.md`](../../skills/lesson-plan/naming-from-md.md)）。例：`sum-6-21-5star.md` → `courses/sum-6-21-5star/`。

在 `engine/` 下：

```bash
npm run course:new -- numeric-arithmetic "纯数字算式"
# MD 驱动（任选其一）：
npm run course:new -- sum-6-21-5star "六之二十一·5星裂项加减"
npm run course:new -- --from-md ../path/sum-6-21-5star.md "六之二十一·5星裂项加减"
npm run course:new -- ../path/sum-6-21-5star.md "六之二十一·5星裂项加减"
```

**MD 输入时**：`courseId` = md 文件名去掉 `.md`（权威见 [`naming-from-md.md`](../../skills/lesson-plan/naming-from-md.md)）。例：

```bash
npm run course:new -- sum-6-21-5star "六之二十一·5星裂项加减"
npm run course:new -- --from-md ../path/sum-6-21-5star.md "六之二十一·5星裂项加减"
```

创建后：

```bash
npm run pipeline:board -- numeric-arithmetic
```

## 2. 配置 authoring 根目录

```bash
copy workspace.example.json workspace.local.json
```

指向本仓 `math_syllabus` 根（见 `workspace.example.json`）。

## 3. 按题推进

每题：`lesson-outline` → `fill-lesson-plan` → `codegen-lesson` → check/generate/preview。  
呈现契约：[calculation-marks.md](../../skills/lesson-plan/calculation-marks.md)。  
口播契约：[reference.md](../../skills/lesson-plan/reference.md)（自 AIClass）。

标准单元：例题 → 练题。

## 4. 禁止

- 图形字段 / `_*-figure.js` / `figureOk`

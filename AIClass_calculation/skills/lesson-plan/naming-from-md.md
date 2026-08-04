# MD 输入 → courseId / lesson id 命名

Agent 与用户以 **`.md` 文件**作为题目输入时的唯一命名权威。引擎 `validSlug` 校验：`/^[a-z][a-z0-9-]{1,47}$/`（2–48 字符小写 ASCII slug）。

## 触发条件

- 用户给出 `.md` 文件路径，或
- 对话中明确「这份 md 就是本课输入」

## courseId（课件目录）

**`courseId` = MD 文件名去掉 `.md` 扩展名。**

| MD 文件 | courseId | 课件目录 |
|---------|----------|----------|
| `sum-6-21-5star.md` | `sum-6-21-5star` | `courses/sum-6-21-5star/` |
| `1-1-2star.md` | `1-1-2star` | `courses/1-1-2star/` |

建课命令（在 `engine/`）：

```bash
npm run course:new -- sum-6-21-5star "课程标题"
# 或
npm run course:new -- --from-md ../path/sum-6-21-5star.md "课程标题"
# 或（第一个参数以 .md 结尾时自动推导）
npm run course:new -- ../path/sum-6-21-5star.md "课程标题"
```

## lesson id（`math_syllabus/lesson/{id}/`）

### 单题 MD

文件中只有一道题（无多组 `# …-例` / `# …-练` 分段，或仅一组例练）：

- **`lesson/{id}/` 的 `id` 与 `courseId` 相同**

例：`foo-bar-2star.md`（单题）→ `courses/foo-bar-2star/` + `lesson/foo-bar-2star/`

### 多题 MD

同一文件含多组例/练（word-to-math-spec 星级 md 常见）：

- **`courseId` 仍用 MD 基名**
- 每道题单独目录，在基名上追加 `-ex1` / `-pr1` / `-ex2` / `-pr2` …

例：`sum-6-21-5star.md` 含 2 组例练：

| 角色 | id |
|------|-----|
| courseId | `sum-6-21-5star` |
| 例题 1 | `sum-621-5-ex1` |
| 练题 1 | `sum-621-5-pr1` |
| 例题 2 | `sum-621-5-ex2` |
| 练题 2 | `sum-621-5-pr2` |

多题后缀可压缩课次中的连字符（如 `6-21` → `621`），但 **courseId 保持与 md 文件名一致**。本仓参考课：`courses/sum-6-21-5star/`。

## 粘贴正文但无路径

用户只粘贴 md 正文、未给文件路径时：

- **必须**向用户确认文件名 / slug，或请用户提供 md 路径
- **禁止**自造与源 md 无关的 courseId

## slug 约束

- 须满足引擎 `validSlug`
- word-to-math-spec 规范要求「文件名/夹名无空格、无中文」，一般可直接用作 courseId
- 若 basename 不合法，请用户重命名 md 或当场指定合法 slug（并记录对应关系）

## 相关 SOP

- 流程入口：[production-flow](../production-flow/SKILL.md)
- 建课编排：[course-arrange](../course-arrange/SKILL.md)
- 大纲备课：[lesson-outline](../lesson-outline/SKILL.md)

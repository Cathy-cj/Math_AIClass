# math_syllabus

数学互动课的 **内容规划仓**：用 JSON 描述「讲什么、怎么讲」，人工审 Markdown，再 codegen 到 [`../courses`](../courses) + [`../engine`](../engine) 做课件。

本仓库 **不跑课件**，只产 outline / plan。Agent SOP 真源在 [`../skills`](../skills/)。

---

## 目录结构

```
math_syllabus/
├── lesson/                 # 按题存放：每题一个 {id} 文件夹
│   └── {id}/               # outline.json/md + plan.json/md
├── scripts/                # 导出 Markdown、校验、维护工具
├── package.json            # npm 脚本入口
└── README.md               # 本文件
```

### 各目录职责

| 目录 | 干什么 | 你平时动谁 |
|------|--------|------------|
| [`lesson/`](lesson/) | 每道题的 **outline + plan** 真源与审阅稿 | 审 `*.md`；改内容改 `*.json` |
| [`scripts/`](scripts/) | JSON → MD 导出、phrase 校验、从 plan 反推 outline | 跑 `npm run …` |
| [`../skills/`](../skills/) | **SOP 真源**（大纲/讲法/codegen/编排） | 调规范时改这里 |
| [`../AGENTS.md`](../AGENTS.md) | 任意 Agent 产品入口 | 一般只读 |

### scripts/

JSON 是真源，也是**唯一产物**——Agent 不再导出 md 审阅稿；`outline:export` / `plan:export` 仅供人工自愿导 md 看。日常：改完 JSON 后 `plan:check`。命令与脚本说明见 **[scripts/README.md](scripts/README.md)**。

---

## 两阶段工作流（批量 SOP）

```mermaid
flowchart LR
  input[贴题或截图]
  outline[outline.json]
  plan[plan.json]
  codegen[courses + engine]

  input -->|lesson-outline| outline
  outline -->|fill-lesson-plan| plan
  plan --> codegen
```

| 阶段 | 真源（唯一产物） | 推进方式 | 粒度 | 不含 |
|------|------|----------|------|------|
| ① 大纲 | `outline.json` | `plan:check` 通过后自动（auto `outlineOk`） | 大环节、解题思路、列式 | action、逐步口播 |
| ② 讲法 | `plan.json` | `plan:check` 通过后自动（auto `planOk`） | 逐步 action、正文 push、口播 | 图形字段 |

**顺序固定**：大纲 → plan → codegen。改某步口播 → 改 `plan.json` 对应 step → `npm run plan:check`。

---

## 怎么用（对话 + 命令）

### 1. 新题入库

1. 贴题干 + 【分析】【详解】或截图  
2. 对 Agent 说：**「出大纲」** → 生成 `lesson/{id}/outline.json`  
3. `npm run plan:check` 通过后自动进入下一阶段  
4. 自动 **填充 plan** → 生成 `plan.json`  
5. `plan:check` 通过后自动 codegen / 预览  
6. 改稿：说「第 N 步口播改成…」或自己改 JSON 后跑 `plan:check`  

### 2. 命令（在 `math_syllabus/` 目录）

```bash
# 内容检查（大纲结构、屏幕极简、口播多样性）——唯一必跑
npm run plan:check

# 可选：人工想看 md 稿时自行导出（Agent 不再运行）
npm run outline:export -- {id}
npm run plan:export -- {id}

# 维护：从已有 plan 反推 outline（勿当主流程）
npm run outline:sync-from-plan -- {id}
```

`outline:review` / `plan:review` 与 `outline:export` / `plan:export` **等价**（兼容旧名）。

### 3. Agent SOP

真源在 [`../skills`](../skills/README.md)；Cursor 经薄代理触发。

| Skill | 触发 | 产出 |
|-------|------|------|
| [production-flow](../skills/production-flow/SKILL.md) | 贴题、不清楚流程 | 导航全链路 |
| [course-pipeline](../skills/course-pipeline/SKILL.md) | 看板 | 进度 / 门禁 |
| [lesson-outline](../skills/lesson-outline/SKILL.md) | 出大纲 | `outline.json` |
| [fill-lesson-plan](../skills/fill-lesson-plan/SKILL.md) | 填充 plan | `plan.json` |
| [revise-lesson-plan](../skills/revise-lesson-plan/SKILL.md) | 改第几步 | 更新 `plan.json` |
| [codegen-lesson](../skills/codegen-lesson/SKILL.md) | 落地课件 | `courses/` 模块 |

共享规范：[`../skills/lesson-plan/`](../skills/lesson-plan/)。
---

## 命名约定

### 题目 id（`lesson/{id}/`）

- 短 slug：`ex1`、`hw03`、`equal-area-trap`  
- **/id 即文件夹名**，outline 与 plan 共用同一 id  

### plan 里 action 名

`{前缀}_步骤{NN}_{动词}_{简述}`，如 `体1_步骤02_展_半径`  

动词：开始 / 展 / 问 / 答 / 亮 / 算  

### JSON 与 MD 谁为准

| 文件 | 角色 |
|------|------|
| `*.json` | **真源**，Agent 与 codegen 读这个 |
| `*.md` | **导出**，给人审；改内容请改 JSON 再 export |

---

## 当前题目

仓库内尚无入库题目。贴题后按 Skills 新建 `lesson/{id}/`，再经 codegen 写入 `courses/`。

---

## 子目录说明

- [lesson/README.md](lesson/README.md) — 单题文件夹内四个文件分别是什么  
- [scripts/README.md](scripts/README.md) — 每个脚本干什么  
- [../skills/README.md](../skills/README.md) — Agent SOP 真源  
- [../AGENTS.md](../AGENTS.md) — 任意 Agent 入口  

---

## 与 courses / engine 的关系

跨包端到端流程与检查清单见 **[docs/production](../docs/production/)**。

```
math_syllabus（规划 + 审稿）  →  codegen-lesson  →  courses/ + engine/（可运行课件）
```

`plan.json` 就绪且 `plan:check` 通过后自动 **落地课件**，按 [codegen-lesson](../skills/codegen-lesson/SKILL.md) 写入课程目录。

### 本地验收

1. 在 [`../engine`](../engine) 运行 `npm run course:export -- {courseId}` 后打开调试壳  
2. 侧栏选对应题目 → 从入口 action 逐步验收  
3. 对照 `lesson/{id}/plan.json`

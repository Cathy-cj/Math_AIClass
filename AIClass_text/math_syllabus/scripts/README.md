# scripts — 导出与校验

Node ESM 脚本，从仓库根目录通过 `npm run` 调用。

## 脚本一览

| 文件 | npm 命令 | 作用 |
|------|----------|------|
| [export-outline-md.mjs](export-outline-md.mjs) | `outline:export` / `outline:review` | `lesson/{id}/outline.json` → **outline.md**（**人工可选**，Agent 不运行） |
| [export-plan-md.mjs](export-plan-md.mjs) | `plan:export` / `plan:review` | `lesson/{id}/plan.json` → **plan.md**（**人工可选**，Agent 不运行） |
| [check-phrase-variety.mjs](check-phrase-variety.mjs) | `plan:check` | 扫描所有 plan 开场是否命中 **banned**、是否重复（phrase-bank：`../skills/lesson-plan/phrase-bank.json`） |
| [sync-outline-from-plan.mjs](sync-outline-from-plan.mjs) | `outline:sync-from-plan` / `outline:from-plan` | 从 plan **反推** outline（维护/迁移用，非主流程） |
| [lesson-paths.mjs](lesson-paths.mjs) | （内部） | 统一解析 `lesson/{id}/` 路径 |

## 用法示例

```bash
# 改完 outline.json / plan.json 后（唯一必跑）
npm run plan:check

# 可选：人工想看 md 稿时自行导出（Agent 制作流程不产出 md）
npm run outline:export -- {id}
npm run plan:export -- {id}
```

参数 `{id}` 也可换成路径，如 `lesson/{id}/plan.json`。

## 设计说明

- **JSON 是真源**，md 仅用于人工审阅，可反复 export 覆盖。  
- 脚本名采用 **动词**：`export-*`（导出审阅稿）、`sync-*`（同步/反推）、`check-*`（校验）。  
- 已移除废弃的 `build-ex1-plan.mjs`（ex1 题已不在本仓）。

## 依赖

无第三方 npm 包，仅需 Node 18+。

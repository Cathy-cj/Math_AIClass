# lesson — 按题存放的内容

每道题一个文件夹 **`lesson/{id}/`**，`id` 为短 slug（如 `ex1`）。

## 四个文件

```
lesson/{id}/
├── outline.json    # ① 真源：大纲
├── outline.md      # ① 导出：给你审「讲什么」
├── plan.json       # ② 真源：讲法
└── plan.md         # ② 导出：给你审「怎么讲」
```

| 文件 | 阶段 | 内容 | 你怎么审 |
|------|------|------|----------|
| **outline.json** | ① | `phases[]` 环节链、`mathSkeleton` 解题骨架、**`guidanceDesc` 侧栏副标题**、答案 | 一般不看 JSON |
| **outline.md** | ① | 按环节编号的解题思路、标准答案、知识点 | 环节对不对、列式是否与【分析】一致 |
| **plan.json** | ② | `steps[]` 逐步：action、口播、figure、push；`guidanceChain` 从 outline 复制 | 一般改 JSON 后 export |
| **plan.md** | ② | 步骤总览 + 逐步口播 / 左图 / 右栏 | 口播、动画、互动 |

## 顺序

1. 先有 `outline.md` → 你说 **大纲 OK**  
2. 再产 `plan.md` → 你审讲法  
3. 小改：改 `plan.json` → `npm run plan:export -- {id}`  

**outline 里 never 出现** action 名、figure state；那些只在 plan 里。

## 新建一题

```text
lesson/
└── {新id}/
    ├── outline.json
    ├── outline.md      ← npm run outline:export -- {新id}
    ├── plan.json
    └── plan.md         ← npm run plan:export -- {新id}
```

Agent 按 skills 生成 JSON；你主要审两个 md。

当前仓库尚无入库题目；贴题后按 [lesson-outline](../../skills/lesson-outline/SKILL.md) 新建 `lesson/{id}/`。

Schema：[`skills/lesson-plan/reference.md`](../../skills/lesson-plan/reference.md)

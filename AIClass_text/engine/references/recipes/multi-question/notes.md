---
referenceOnly: true
sentinel: REFERENCE_ONLY_DO_NOT_COPY
archetype: multi-question
---
# 使用说明

适用于题目含多个明确问项的任务。先区分独立问项与依赖问项，再提取公共设定，避免重复建模。

当前 Plan 中每个问项应有唯一标识、依赖关系和独立输出；问项数量及顺序必须来自当前题目，而不是 sample。

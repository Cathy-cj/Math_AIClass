---
referenceOnly: true
sentinel: REFERENCE_ONLY_DO_NOT_COPY
archetype: composite-split
---
# 反模式

- 拆分后的部分相互重叠或未覆盖整体。
- 分部计算正确，但合并运算与目标不一致。
- 在没有自然拆分时强行分块。
- 复制参考中的标签、句式或展示安排。
- 让 codegen 扫描 references，或将其加入构建资源。

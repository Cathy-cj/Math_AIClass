---
referenceOnly: true
sentinel: REFERENCE_ONLY_DO_NOT_COPY
archetype: pattern-cycle
---
# 反模式

- 仅凭短序列猜周期，未验证后续转移。
- 混淆从零编号与从一编号。
- 忽略余数为零对应周期末位的情形。
- 复制 sample 的状态数、标签或措辞。
- 运行时或 codegen 读取 references。

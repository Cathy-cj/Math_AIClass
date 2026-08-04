# Schema policy

- 所有可持久化 JSON 都必须有整数 `schemaVersion`。
- 当前版本为 `1`；生成器只接受明确支持的版本。
- 新字段保持可选时不升 schema；字段改名、语义改变或删除时升 schema。
- 迁移必须创建新文件或可审查 diff，不得静默覆盖唯一输入。
- `course.lock.json` 记录生成器和 schema 版本，旧 Release 不依赖当前 schema 才能运行。

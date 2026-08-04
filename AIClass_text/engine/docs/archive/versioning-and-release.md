# 版本与发布

> **暂缓**：当前制作主路径不含 Tag / GitHub Release（见 [`docs/production`](../../../docs/production/README.md)）。本文档保留，需要发版时再按此执行。

## 引擎

- `engine.version.json` 是当前引擎版本和能力清单。
- `engine-vX.Y.Z` tag 必须与文件版本完全一致。
- 破坏现有课程契约时升 major；增加兼容能力升 minor；修复升 patch。
- 旧 tag 不移动、不删除；GitHub Release 保留 GitHub 自动生成的完整仓库源码。

### 引擎 tag 示例

```text
engine-v1.0.0
engine-v1.1.0
engine-v1.1.1
engine-v2.0.0
```

发布新引擎：

```bash
git switch main
git pull
git switch -c engine/figure-actions
```

修改 `src/`、测试和文档，并将 `engine.version.json` 升级，例如：

```json
{
  "version": "1.1.0"
}
```

合并回 `main` 后：

```bash
git switch main
git pull
git tag -a engine-v1.1.0 -m "Release engine 1.1.0"
git push origin engine-v1.1.0
```

`.github/workflows/release-engine.yml` 会验证 tag 与 `engine.version.json` 一致，并创建 Engine Release。

## 课程

- 课程固定在 `courses/<course-id>/`，不使用永久课程分支。
- `course.json.engine.range` 声明兼容范围，`requiredCapabilities` 声明实际能力。
- 发布 tag：`course-<course-id>-vX.Y.Z`。
- CI 按 tag 对应提交生成 ZIP；ZIP 内锁定 `engineVersion`、输入/输出 SHA-256 和完整源码快照。

### 课程 tag 示例

```text
course-volume-review-v1.0.0
course-volume-review-v1.0.1
course-geometry-summer-v2.0.0
```

课程 tag 的解析规则：

```text
course-<course-id>-v<course-version>
```

因此：

```text
course-volume-review-v1.0.0
       └ course-id: volume-review
                         └ version: 1.0.0
```

打 tag 前必须确认：

1. tag 位于已经合并到 `main` 的提交；
2. `courses/<course-id>/course.json` 已存在；
3. tag 版本与 `course.json.version` 相同；
4. 课程使用的 Figure、assets、extensions 已提交；
5. 本地校验、生成、浏览器验收已完成。

发布命令：

```bash
git switch main
git pull
git tag -a course-volume-review-v1.0.0 -m "Release volume-review 1.0.0"
git push origin course-volume-review-v1.0.0
```

不要使用：

```bash
git tag -f ...
git push --force ...
```

已经发布的 tag 和 Release 都应视为不可变快照。

## 新课程选择引擎版本

新课程默认从当前稳定引擎开始：

```json
{
  "engine": {
    "range": "^1.1.0",
    "requiredCapabilities": [
      "file-runtime",
      "latex",
      "figure-state"
    ]
  }
}
```

- `range`：课程允许使用的引擎版本范围。
- `requiredCapabilities`：课程实际依赖的引擎能力。
- 不要只因为引擎发布了新版本就批量修改全部旧课程。

当前实现尚未自动执行 `engine.range` 的 semver 判断，正式发布前必须人工确认；该门禁需要在框架修复阶段补齐。

## 新课程需要修改引擎时

例如新课程需要一个通用 Figure action：

1. 在 `engine/<feature>` 临时分支修改 `src/`。
2. 用合成 fixture 和目标课程同时测试。
3. 提升 `engine.version.json`，例如 `1.0.0 → 1.1.0`。
4. 合并 `main` 并发布 `engine-v1.1.0`。
5. 新课程的 `course.json.engine.range` 改为 `^1.1.0`。
6. 再合并课程分支并发布课程 tag。

不要先在课程中直接复制一份已经确定通用的引擎组件，再长期维护两套实现。

## 旧课程如何保持不变

旧课程有两层保障：

1. Git tag 指向当时的完整仓库提交；
2. Course Release ZIP 内含当时的 `src/`、课程源、Plan 快照、vendor 和 lock。

恢复旧课程时，优先下载对应 Course Release ZIP，不要用当前 `main/src/` 覆盖旧包。

当前 `course.lock.json` 的 Git commit 字段仍是 `null` 占位，正式用于客户交付前必须实现真实 commit SHA。

## 课程扩展晋升

1. 新组件先放 `courses/<id>/lesson/extensions/`。
2. 第二个课程需要时，先验证 API、样式和销毁行为。
3. 提升到 `src/components`、`src/widgets` 或 `src/figures`。
4. 更新 `engine-manifest.js`、`engine.version.json` 能力和测试。
5. 发布新 engine tag；旧课程不自动修改其引擎范围。

## 恢复

本地已有 Release ZIP 时：

```bash
npm run course:restore -- course-id@1.0.0
```

从 GitHub 恢复时先下载对应 Release ZIP 到 `artifacts/`。不要用当前 `main` 的引擎替换 ZIP 内的 `src/`。

恢复后应先验证：

```bash
cd restored/course-id-1.0.0
npm test
```

当前 `course:restore` 只负责解压，尚未自动重算 `course.lock.json.outputs`；正式恢复流程应补充 lock 校验命令。

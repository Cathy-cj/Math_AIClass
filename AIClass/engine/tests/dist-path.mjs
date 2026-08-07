// dist 产物路径解析：dist/<grade>/<courseId>/。
// grade 取自 course.json —— 优先 courses/<courseId>/（正式课），回退扫描 tests/fixtures/*/（测试课，
// run-tests 的 runPipeline 结束后会清掉 courses 下的 fixture 副本，fixture 源仍在 tests/fixtures/）。
// 均不存在时返回 null，调用方按需跳过。
import fs from 'node:fs'
import path from 'node:path'

function gradeFromFixture(root, courseId) {
  const fixturesDir = path.join(root, 'tests', 'fixtures')
  if (!fs.existsSync(fixturesDir)) return null
  for (const entry of fs.readdirSync(fixturesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(fixturesDir, entry.name, 'course.json')
    if (!fs.existsSync(file)) continue
    const config = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (config.courseId === courseId && config.grade != null) return config.grade
  }
  return null
}

export function distDir(root, courseId) {
  const courseFile = path.join(root, '..', 'courses', courseId, 'course.json')
  const grade = fs.existsSync(courseFile)
    ? JSON.parse(fs.readFileSync(courseFile, 'utf8')).grade
    : gradeFromFixture(root, courseId)
  if (grade == null) return null
  return path.join(root, '..', '..', 'dist', String(grade), courseId)
}

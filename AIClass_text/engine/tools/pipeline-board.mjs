/**
 * Refresh courses/<id>/pipeline.md from pipeline.json + disk scan.
 *
 * Usage (from engine/):
 *   node tools/pipeline-board.mjs <courseId>
 *   node tools/pipeline-board.mjs <courseId> --sync
 *   node tools/pipeline-board.mjs <courseId> --complete-preview <problemId>
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const engineRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const repoRoot = path.dirname(engineRoot)
const coursesRoot = path.join(repoRoot, 'courses')

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function loadWorkspace() {
  const local = path.join(engineRoot, 'workspace.local.json')
  const example = path.join(engineRoot, 'workspace.example.json')
  const file = fs.existsSync(local) ? local : example
  return fs.existsSync(file) ? readJson(file) : { authoringRoots: {} }
}

function resolveAuthoringRoot(course) {
  const roots = loadWorkspace().authoringRoots || {}
  const key = course.authoring?.rootKey
  if (key && roots[key]) return path.resolve(engineRoot, roots[key])
  if (roots.mathSyllabus) return path.resolve(engineRoot, roots.mathSyllabus)
  return path.join(repoRoot, 'math_syllabus')
}

function emptyGates() {
  return { outlineOk: false, planOk: false }
}

function ensurePipeline(courseDir, courseId, course) {
  const file = path.join(courseDir, 'pipeline.json')
  let pipeline
  if (fs.existsSync(file)) {
    pipeline = readJson(file)
  } else {
    pipeline = {
      $schema: '../engine/schemas/pipeline.schema.json',
      schemaVersion: 1,
      courseId,
      activeProblemId: null,
      problems: []
    }
  }
  pipeline.courseId = courseId
  if (!Array.isArray(pipeline.problems)) pipeline.problems = []

  const byId = new Map(pipeline.problems.map((p) => [p.problemId, p]))
  const scheduled = course.authoring?.problems || []
  for (const item of scheduled) {
    const id = item.problemId
    if (!byId.has(id)) {
      const row = {
        problemId: id,
        previewOk: false,
        gates: emptyGates()
      }
      pipeline.problems.push(row)
      byId.set(id, row)
    } else if (byId.get(id).previewOk === undefined) {
      byId.get(id).previewOk = false
    }
  }
  return { pipeline, file }
}

function lessonDir(authoringRoot, problemId) {
  return path.join(authoringRoot, 'lesson', problemId)
}

function readOutline(authoringRoot, problemId) {
  const file = path.join(lessonDir(authoringRoot, problemId), 'outline.json')
  if (!fs.existsSync(file)) return null
  try {
    return readJson(file)
  } catch {
    return null
  }
}

function inferGates(row, disk) {
  const gates = { ...emptyGates(), ...(row.gates || {}) }
  if (disk.hasOutline && disk.outline?.outlineStatus === 'approved') {
    gates.outlineOk = true
  }

  if (disk.hasPlan && gates.outlineOk) {
    gates.planOk = true
  }

  return gates
}

function scanProblem(authoringRoot, courseDir, course, row) {
  const id = row.problemId
  const dir = lessonDir(authoringRoot, id)
  const outline = readOutline(authoringRoot, id)
  const hasOutline = Boolean(outline)
  const hasPlan = fs.existsSync(path.join(dir, 'plan.json'))
  const scheduled = (course.authoring?.problems || []).some((p) => p.problemId === id)
  const generatedDir = path.join(courseDir, '.generated', 'lesson', 'modules')
  let generated = false
  if (fs.existsSync(generatedDir)) {
    generated = fs.readdirSync(generatedDir).some((name) => name.includes(id))
  }

  const previewOk = row.previewOk === true
  const gates = inferGates(row, { hasOutline, hasPlan, outline })

  const outlineCol = !hasOutline ? '缺' : gates.outlineOk ? 'OK' : 'draft'
  const planCol = !hasPlan ? '缺' : gates.planOk ? 'OK' : 'draft'
  const scheduledCol = scheduled ? 'yes' : 'no'
  const generatedCol = generated ? 'yes' : 'no'
  const previewCol = previewOk ? 'yes' : 'no'

  let next = '预览 / export'
  if (!hasOutline) next = 'lesson-outline → 出大纲'
  else if (!hasPlan) next = 'fill-lesson-plan → 填讲法'
  else if (!scheduled) next = '编入 course.json.authoring.problems'
  else if (!generated) next = 'engine: lesson:generate'
  else if (!previewOk) next = 'engine: course:preview → --complete-preview'
  else next = '预览 / export'

  return {
    problemId: id,
    outlineCol,
    planCol,
    scheduledCol,
    generatedCol,
    previewCol,
    next,
    previewOk,
    gates,
    moduleType: outline?.moduleType,
    afterPlanId: outline?.lessonContext?.afterPlanId
  }
}

function courseStatus(rows) {
  if (!rows.length) return '空板（尚无题目）'
  if (rows.every((r) => r.previewOk && r.planCol === 'OK')) return '可预览'
  if (rows.some((r) => r.outlineCol !== '缺')) return '进行中'
  return '未开始'
}

function selectActiveProblem(pipeline, rows, course, authoringRoot) {
  const previewById = new Map(rows.map((r) => [r.problemId, r.previewOk]))
  const scheduled = course.authoring?.problems || []
  const ordered = [...scheduled].sort((a, b) => (a.order || 0) - (b.order || 0))

  for (const item of ordered) {
    const id = item.problemId
    const row = rows.find((r) => r.problemId === id)
    if (!row) continue

    if (row.moduleType === 'practice' && row.afterPlanId) {
      if (!previewById.get(row.afterPlanId)) continue
    }

    if (!row.previewOk) return id
  }

  if (pipeline.activeProblemId && rows.some((r) => r.problemId === pipeline.activeProblemId)) {
    return pipeline.activeProblemId
  }
  return rows[0]?.problemId ?? null
}

function renderMarkdown(courseId, pipeline, rows) {
  const active = pipeline.activeProblemId || (rows[0] && rows[0].problemId) || '—'
  const lines = [
    `# 制作看板 — ${courseId}`,
    '',
    `课状态：**${courseStatus(rows)}** · 当前题：\`${active}\``,
    '',
    '| problemId | 大纲 | 讲法 | 已编排 | 已生成 | 预览 | 下一步 |',
    '|-----------|------|------|--------|--------|------|--------|'
  ]
  for (const r of rows) {
    lines.push(
      `| ${r.problemId} | ${r.outlineCol} | ${r.planCol} | ${r.scheduledCol} | ${r.generatedCol} | ${r.previewCol} | ${r.next} |`
    )
  }
  if (!rows.length) {
    lines.push('| — | — | — | — | — | — | 在 course.json 添加 problems 后 `--sync` |')
  }
  lines.push(
    '',
    '## 怎么用',
    '',
    '- 对话说 **「看板」**（course-pipeline Skill）刷新本表',
    '- 预览验收：`npm run pipeline:board -- ' + courseId + ' --complete-preview <problemId>`',
    '- 刷新脚本：`cd engine && npm run pipeline:board -- ' + courseId + '`',
    '- 流程说明：[docs/production](../../docs/production/README.md)',
    ''
  )
  return lines.join('\n')
}

function printTable(courseId, rows) {
  console.log(`\n制作看板 — ${courseId}\n`)
  console.log(
    ['problemId', '大纲', '讲法', '编排', '生成', '预览', '下一步']
      .map((h) => h.padEnd(12))
      .join('')
  )
  for (const r of rows) {
    console.log(
      [
        r.problemId,
        r.outlineCol,
        r.planCol,
        r.scheduledCol,
        r.generatedCol,
        r.previewCol,
        r.next
      ]
        .map((c, i) => String(c).padEnd(i === 0 || i === 6 ? 28 : 8))
        .join('')
    )
  }
  console.log('')
}

function applyGate(pipeline, problemId, gateName) {
  const allowed = new Set(['outlineOk', 'planOk'])
  if (!allowed.has(gateName)) throw new Error(`Unknown gate: ${gateName}`)
  const row = pipeline.problems.find((p) => p.problemId === problemId)
  if (!row) throw new Error(`problemId not in pipeline: ${problemId}`)
  row.gates = { ...emptyGates(), ...(row.gates || {}) }
  row.gates[gateName] = true
  pipeline.activeProblemId = problemId
}

function completePreview(pipeline, problemId) {
  const row = pipeline.problems.find((p) => p.problemId === problemId)
  if (!row) throw new Error(`problemId not in pipeline: ${problemId}`)
  row.previewOk = true
}

function persistInferredGates(pipeline, rows) {
  for (const r of rows) {
    const row = pipeline.problems.find((p) => p.problemId === r.problemId)
    if (!row) continue
    row.gates = r.gates
    row.previewOk = r.previewOk
  }
}

function main() {
  const args = process.argv.slice(2)
  const courseId = args.find((a) => !a.startsWith('--'))
  if (!courseId) {
    console.error(
      'Usage: node tools/pipeline-board.mjs <courseId> [--sync] [--gate <problemId> outlineOk|planOk] [--complete-preview <problemId>]'
    )
    process.exit(1)
  }

  const courseDir = path.join(coursesRoot, courseId)
  const courseFile = path.join(courseDir, 'course.json')
  if (!fs.existsSync(courseFile)) {
    console.error(`Course not found: ${courseFile}`)
    process.exit(1)
  }
  const course = readJson(courseFile)
  const { pipeline, file } = ensurePipeline(courseDir, courseId, course)

  const sync = args.includes('--sync')
  const gateIdx = args.indexOf('--gate')
  const previewIdx = args.indexOf('--complete-preview')

  if (gateIdx >= 0) {
    const problemId = args[gateIdx + 1]
    const gateName = args[gateIdx + 2]
    applyGate(pipeline, problemId, gateName)
  }

  if (previewIdx >= 0) {
    const problemId = args[previewIdx + 1]
    if (!problemId) throw new Error('--complete-preview requires problemId')
    completePreview(pipeline, problemId)
  }

  const authoringRoot = resolveAuthoringRoot(course)
  let rows = pipeline.problems.map((row) => scanProblem(authoringRoot, courseDir, course, row))
  persistInferredGates(pipeline, rows)

  const activeId = selectActiveProblem(pipeline, rows, course, authoringRoot)
  if (activeId) pipeline.activeProblemId = activeId

  if (sync || gateIdx >= 0 || previewIdx >= 0 || !fs.existsSync(file)) {
    writeJson(file, pipeline)
  } else {
    writeJson(file, pipeline)
  }

  rows = pipeline.problems.map((row) => scanProblem(authoringRoot, courseDir, course, row))
  const md = renderMarkdown(courseId, pipeline, rows)
  const mdFile = path.join(courseDir, 'pipeline.md')
  fs.writeFileSync(mdFile, md, 'utf8')
  printTable(courseId, rows)
  console.log(`Wrote ${path.relative(repoRoot, mdFile)}`)
  if (rows.length) {
    const focus = rows.find((r) => r.problemId === pipeline.activeProblemId) || rows[0]
    console.log(`推荐下一步（${focus.problemId}）：${focus.next}`)
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  main()
}

export { scanProblem, inferGates, selectActiveProblem, readOutline }

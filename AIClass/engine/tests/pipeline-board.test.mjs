import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  scanProblem,
  inferGates,
  selectActiveProblem,
  readOutline
} from '../tools/pipeline-board.mjs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function withAuthoring(problemId, files, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiclass-pipeline-'))
  const lessonDir = path.join(tmpRoot, 'lesson', problemId)
  fs.mkdirSync(lessonDir, { recursive: true })
  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(
      path.join(lessonDir, name),
      typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`,
      'utf8'
    )
  }
  try {
    fn(tmpRoot)
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
}

function baseCourse(problemIds) {
  return {
    authoring: {
      problems: problemIds.map((id, i) => ({ problemId: id, order: i + 1 }))
    },
    authoredModules: []
  }
}

function baseRow(problemId, overrides = {}) {
  return {
    problemId,
    needsFigure: true,
    previewOk: false,
    gates: { outlineOk: false, figureOk: false, planOk: false },
    ...overrides
  }
}

// 1. 有 outline 但未 approved → 填讲法前仍停在图形（有图）或填讲法（无图且 approved 后）
withAuthoring(
  'demo-a',
  {
    'outline.json': { id: 'demo-a', outlineStatus: 'draft' },
    'plan.json': { id: 'demo-a', steps: [] }
  },
  (authoringRoot) => {
    const courseDir = path.join(authoringRoot, 'course')
    fs.mkdirSync(courseDir, { recursive: true })
    const course = baseCourse(['demo-a'])

    const pendingFigure = scanProblem(
      authoringRoot,
      courseDir,
      course,
      baseRow('demo-a', { needsFigure: true, gates: { outlineOk: false, figureOk: false, planOk: false } })
    )
    assert(
      pendingFigure.next.includes('图形 OK'),
      `有图未 figureOk 应停审图：${pendingFigure.next}`
    )
    assert(!pendingFigure.gates.outlineOk, 'draft outline 不应 auto outlineOk')
  }
)

// 2. outline approved + 有图未 figureOk → 唯一停点
withAuthoring(
  'demo-b',
  {
    'outline.json': { id: 'demo-b', outlineStatus: 'approved', figureTemplate: 'geo' },
    'figure-spec.json': { status: 'draft' }
  },
  (authoringRoot) => {
    const courseDir = path.join(authoringRoot, 'course')
    fs.mkdirSync(courseDir, { recursive: true })
    const row = scanProblem(
      authoringRoot,
      courseDir,
      baseCourse(['demo-b']),
      baseRow('demo-b')
    )
    assert(row.gates.outlineOk, 'approved outline 应 auto outlineOk')
    assert(row.next.includes('图形 OK'), `应停审图：${row.next}`)
    assert(!row.gates.planOk, '未 figureOk 不应 auto planOk')
  }
)

// 3. 无图题全自动到填讲法
withAuthoring(
  'demo-c',
  {
    'outline.json': { id: 'demo-c', outlineStatus: 'approved' }
  },
  (authoringRoot) => {
    const courseDir = path.join(authoringRoot, 'course')
    fs.mkdirSync(courseDir, { recursive: true })
    const row = scanProblem(
      authoringRoot,
      courseDir,
      baseCourse(['demo-c']),
      baseRow('demo-c', { needsFigure: false })
    )
    assert(row.gates.outlineOk, '无图 approved 应 outlineOk')
    assert(row.next === 'fill-lesson-plan → 填讲法', `无图应直接填讲法：${row.next}`)
  }
)

// 4. plan 存在且 outline+figure OK → auto planOk
withAuthoring(
  'demo-d',
  {
    'outline.json': { id: 'demo-d', outlineStatus: 'approved' },
    'plan.json': { id: 'demo-d', steps: [] }
  },
  (authoringRoot) => {
    const courseDir = path.join(authoringRoot, 'course')
    fs.mkdirSync(courseDir, { recursive: true })
    const row = scanProblem(
      authoringRoot,
      courseDir,
      baseCourse(['demo-d']),
      baseRow('demo-d', { needsFigure: false })
    )
    assert(row.gates.planOk, 'plan 存在且前置 OK 应 auto planOk')
    assert(row.next.includes('lesson:generate') || row.next.includes('编入'), `planOk 后应推进：${row.next}`)
  }
)

// 5. figureOk 不被 infer
assert(
  !inferGates(baseRow('x'), {
    hasOutline: true,
    hasPlan: true,
    outline: { outlineStatus: 'approved' }
  }).figureOk,
  'figureOk 不得自动推断'
)

// 6. 例题 previewOk 后 focus 练题
withAuthoring(
  'ex-1',
  {
    'outline.json': {
      id: 'ex-1',
      moduleType: 'example',
      outlineStatus: 'approved'
    }
  },
  (authoringRoot) => {
    const practiceDir = path.join(authoringRoot, 'lesson', 'pr-1')
    fs.mkdirSync(practiceDir, { recursive: true })
    fs.writeFileSync(
      path.join(practiceDir, 'outline.json'),
      `${JSON.stringify({
        id: 'pr-1',
        moduleType: 'practice',
        outlineStatus: 'approved',
        lessonContext: { slot: 'afterExample', afterPlanId: 'ex-1' }
      }, null, 2)}\n`
    )

    const exRow = {
      problemId: 'ex-1',
      outlineCol: 'OK',
      figureCol: '—',
      planCol: 'OK',
      previewOk: true,
      moduleType: 'example',
      afterPlanId: undefined
    }
    const prRow = {
      problemId: 'pr-1',
      outlineCol: 'OK',
      figureCol: '—',
      planCol: '缺',
      previewOk: false,
      moduleType: 'practice',
      afterPlanId: 'ex-1'
    }
    const course = baseCourse(['ex-1', 'pr-1'])
    const active = selectActiveProblem(
      { activeProblemId: null, problems: [] },
      [exRow, prRow],
      course,
      authoringRoot
    )
    assert(active === 'pr-1', `例题 previewOk 后应 focus 练题，得 ${active}`)
  }
)

// 7. 例题未完成 preview 不提前切练题
withAuthoring(
  'ex-2',
  {
    'outline.json': {
      id: 'ex-2',
      moduleType: 'example',
      outlineStatus: 'approved'
    }
  },
  (authoringRoot) => {
    const practiceDir = path.join(authoringRoot, 'lesson', 'pr-2')
    fs.mkdirSync(practiceDir, { recursive: true })
    fs.writeFileSync(
      path.join(practiceDir, 'outline.json'),
      `${JSON.stringify({
        id: 'pr-2',
        moduleType: 'practice',
        outlineStatus: 'approved',
        lessonContext: { slot: 'afterExample', afterPlanId: 'ex-2' }
      }, null, 2)}\n`
    )

    const exRow = {
      problemId: 'ex-2',
      previewOk: false,
      moduleType: 'example'
    }
    const prRow = {
      problemId: 'pr-2',
      previewOk: false,
      moduleType: 'practice',
      afterPlanId: 'ex-2'
    }
    const active = selectActiveProblem(
      { activeProblemId: null, problems: [] },
      [exRow, prRow],
      baseCourse(['ex-2', 'pr-2']),
      authoringRoot
    )
    assert(active === 'ex-2', `例题未完成应仍 focus 例题，得 ${active}`)
  }
)

// 8. 已生成未 preview → 推荐 preview
withAuthoring(
  'demo-e',
  {
    'outline.json': { id: 'demo-e', outlineStatus: 'approved' },
    'plan.json': { id: 'demo-e', steps: [] }
  },
  (authoringRoot) => {
    const courseDir = path.join(authoringRoot, 'course')
    fs.mkdirSync(courseDir, { recursive: true })
    const genDir = path.join(courseDir, '.generated', 'lesson', 'modules')
    fs.mkdirSync(genDir, { recursive: true })
    fs.writeFileSync(path.join(genDir, '01-demo-e.js'), '// stub', 'utf8')

    const row = scanProblem(
      authoringRoot,
      courseDir,
      baseCourse(['demo-e']),
      baseRow('demo-e', { needsFigure: false, previewOk: false })
    )
    assert(row.next.includes('course:preview'), `已生成应推荐 preview：${row.next}`)
  }
)

assert(readOutline('/nonexistent', 'nope') === null, 'readOutline 缺文件应返回 null')

console.log('pipeline-board tests passed.')

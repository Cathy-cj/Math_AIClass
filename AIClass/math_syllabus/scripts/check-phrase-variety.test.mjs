/**
 * plan:check / outline 结构校验单元与集成测试
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import {
  checkAgentType,
  checkFigureActions,
  checkOutlineStructure
} from './check-phrase-variety.mjs'
import { makeBrokenOutline, makeLongChainOutline } from '../tests/outline-fixture.mjs'

const scriptRoot = path.dirname(fileURLToPath(import.meta.url))
const syllabusRoot = path.dirname(scriptRoot)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function withTempLesson(lessonId, files, fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiclass-lesson-'))
  const lessonDir = path.join(tmpRoot, lessonId)
  fs.mkdirSync(lessonDir, { recursive: true })
  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(
      path.join(lessonDir, name),
      `${JSON.stringify(data, null, 2)}\n`,
      'utf8'
    )
  }
  try {
    fn(lessonDir, tmpRoot)
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
}

function runPlanCheck(lessonRoot) {
  return spawnSync(process.execPath, ['scripts/check-phrase-variety.mjs'], {
    cwd: syllabusRoot,
    env: { ...process.env, MATH_SYLLABUS_LESSON_ROOT: lessonRoot },
    encoding: 'utf8'
  })
}

function testLongChainOutlinePasses() {
  withTempLesson('fixture-long-chain', { 'outline.json': makeLongChainOutline() }, (lessonDir) => {
    const label = 'lesson/fixture-long-chain/outline.json'
    const warnings = checkOutlineStructure(
      path.join(lessonDir, 'outline.json'),
      label
    )
    assert(warnings === 0, `9 环节 outline 应通过，实际 ${warnings} 条告警`)

    const run = runPlanCheck(path.dirname(lessonDir))
    assert(run.status === 0, `outline-only plan:check 应成功:\n${run.stdout}${run.stderr}`)
    assert(
      run.stdout.includes('1 outline-only'),
      `应报告 outline-only 计数:\n${run.stdout}`
    )
  })
}

function testBrokenOutlineFails() {
  withTempLesson('fixture-broken', { 'outline.json': makeBrokenOutline() }, (lessonDir) => {
    const label = 'lesson/fixture-broken/outline.json'
    const warnings = checkOutlineStructure(
      path.join(lessonDir, 'outline.json'),
      label
    )
    assert(warnings > 0, '缺 positioning 的 outline 应产生告警')

    const run = runPlanCheck(path.dirname(lessonDir))
    assert(run.status !== 0, '缺结构的 outline-only 应失败 plan:check')
  })
}

function testFigureActionsOnStateChange() {
  const plan = {
    id: 'fig-test',
    steps: [
      { id: 's01', figure: { state: 'default' } },
      { id: 's02', figure: { state: 'highlight', note: '高亮' } }
    ]
  }
  const warnings = checkFigureActions(plan, 'lesson/fig-test/plan.json')
  assert(warnings === 1, 'state 变化且无 actions 应告警')
}

function testFigureActionsFirstFrameExempt() {
  const plan = {
    id: 'fig-test2',
    steps: [
      { id: 's01', figure: { state: 'default', note: '初始' } }
    ]
  }
  assert(checkFigureActions(plan, 'x') === 0, '首帧无 actions 不应告警')
}

function testAgentTypeRequired() {
  const bad = {
    id: 'agent-test',
    steps: [{ id: 's01', agent: { description: '讲' } }]
  }
  assert(checkAgentType(bad, 'x') === 1, '缺 agent.type 应告警')

  const good = {
    id: 'agent-test2',
    steps: [{ id: 's01', agent: { type: 'explain', description: '讲' } }]
  }
  assert(checkAgentType(good, 'x') === 0, '合法 agent.type 应通过')
}

function main() {
  testLongChainOutlinePasses()
  testBrokenOutlineFails()
  testFigureActionsOnStateChange()
  testFigureActionsFirstFrameExempt()
  testAgentTypeRequired()
  console.log('check-phrase-variety tests passed.')
}

main()

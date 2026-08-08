import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import Ajv2020 from 'ajv/dist/2020.js'
import AdmZip from 'adm-zip'
import { courseIdFromInput, validSlug } from './course-id-from-md.mjs'
import { distRoot, outputLessonDir, outputCourseDir, findOutputCourseDir, platformRoot } from '../../../shared/output-paths.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const repoRoot = path.dirname(root)
const generatedName = '.generated'
const referenceSentinels = [
  'AICLASS_REFERENCE_ONLY',
  'REFERENCE_ONLY_DO_NOT_COPY',
  '"referenceOnly": true'
]

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, value, 'utf8')
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
}

function copyDirectory(source, target, options = {}) {
  if (!fs.existsSync(source)) return
  fs.mkdirSync(target, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if ((options.exclude || []).includes(entry.name)) continue
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)
    if (entry.isDirectory()) copyDirectory(from, to, options)
    else copyFile(from, to)
  }
}

function removeDirectory(target) {
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}

/** Windows often locks dist/<courseId> while debug iframe is open; overwrite in place. */
function publishExportDirectory(temp, finalDir) {
  fs.mkdirSync(path.dirname(finalDir), { recursive: true })
  try {
    removeDirectory(finalDir)
    fs.renameSync(temp, finalDir)
    return
  } catch (err) {
    const code = err && err.code
    if (code !== 'EBUSY' && code !== 'EPERM' && code !== 'ENOTEMPTY') throw err
  }
  fs.mkdirSync(finalDir, { recursive: true })
  for (const entry of fs.readdirSync(finalDir)) {
    if (fs.existsSync(path.join(temp, entry))) continue
    try {
      fs.rmSync(path.join(finalDir, entry), { recursive: true, force: true, maxRetries: 2, retryDelay: 100 })
    } catch (_) {
      // A browser may still hold an old asset; keep it rather than failing the export.
    }
  }
  copyDirectory(temp, finalDir)
  try {
    removeDirectory(temp)
  } catch (_) {
    // temp cleanup is best-effort when the locked browser still holds handles
  }
  console.warn(
    `dist/${path.basename(finalDir)} was locked; exported by in-place overwrite. ` +
    'Reload the debug iframe (hard refresh) to pick up changes.'
  )
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function collectHashes(base, relative = '') {
  const result = {}
  const current = path.join(base, relative)
  if (!fs.existsSync(current)) return result
  for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = path.posix.join(relative.split(path.sep).join('/'), entry.name)
    if (entry.isDirectory()) Object.assign(result, collectHashes(base, rel))
    else result[rel] = sha256File(path.join(base, rel))
  }
  return result
}

function assertInside(base, target, label) {
  const rel = path.relative(path.resolve(base), path.resolve(target))
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`${label} escapes its allowed directory: ${target}`)
  }
}

function courseDirectory(courseId) {
  if (!validSlug(courseId)) {
    throw new Error('courseId must be a 2-48 character lowercase ASCII slug.')
  }
  const dir = findOutputCourseDir(courseId)
  if (!dir) throw new Error(`Course not found: ${courseId}`)
  return dir
}

function loadCourse(courseId) {
  const dir = courseDirectory(courseId)
  const file = path.join(dir, 'course.json')
  if (!fs.existsSync(file)) throw new Error(`Course not found: ${courseId}`)
  return { dir, file, config: readJson(file) }
}

function loadWorkspace() {
  const local = path.join(root, 'workspace.local.json')
  return fs.existsSync(local) ? readJson(local) : { authoringRoots: {} }
}

function createAjv() {
  return new Ajv2020({ allErrors: true, strict: false })
}

function validateAgainstSchema(data, schemaFile, label) {
  const ajv = createAjv()
  const validate = ajv.compile(readJson(schemaFile))
  if (!validate(data)) {
    const details = validate.errors.map((item) => `${item.instancePath || '/'} ${item.message}`).join('\n')
    throw new Error(`${label} is invalid:\n${details}`)
  }
}

function checkUnique(items, key, label) {
  const seen = new Map()
  for (const item of items) {
    const value = item[key]
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`)
    seen.set(value, true)
  }
}

function checkCourse(course) {
  validateAgainstSchema(
    course.config,
    path.join(root, 'schemas', 'course.schema.json'),
    `_output_/${course.config.grade}/${course.config.courseId}/course.json`
  )
  if (course.config.courseId !== path.basename(course.dir)) {
    throw new Error('courseId must match its directory name.')
  }

  const engine = readJson(path.join(root, 'engine.version.json'))
  const required = course.config.engine.requiredCapabilities || []
  const missing = required.filter((item) => !engine.capabilities.includes(item))
  if (missing.length) throw new Error(`Missing engine capabilities: ${missing.join(', ')}`)

  const problems = (course.config.authoring && course.config.authoring.problems) || []
  checkUnique(problems, 'problemId', 'problemId')
  checkUnique(problems, 'actionPrefix', 'actionPrefix')
  checkUnique(problems, 'order', 'problem order')

  if (course.config.actionCatalogPath) {
    const catalogFile = path.resolve(course.dir, course.config.actionCatalogPath)
    assertInside(course.dir, catalogFile, 'actionCatalogPath')
    if (!fs.existsSync(catalogFile)) {
      throw new Error(`Action catalog not found: ${course.config.actionCatalogPath}`)
    }
    const catalog = readJson(catalogFile)
    if (!Array.isArray(catalog)) throw new Error('actionCatalogPath must point to a JSON array')
    checkUnique(catalog, 'name', 'authored action')
  }

  if (!problems.length && !(course.config.authoredModules || []).length) {
    throw new Error('Course must declare authoring.problems or authoredModules.')
  }

  for (const file of [...(course.config.authoredModules || []), ...(course.config.extensions || [])]) {
    if (path.isAbsolute(file)) throw new Error(`Absolute paths are forbidden: ${file}`)
    const resolved = path.resolve(course.dir, file)
    assertInside(course.dir, resolved, 'Course file')
    if (!fs.existsSync(resolved)) throw new Error(`Course file does not exist: ${file}`)
  }
  return { engine, problems }
}

function resolvePlan(course, problem) {
  if (problem.planPath) {
    const local = path.resolve(course.dir, problem.planPath)
    assertInside(course.dir, local, 'planPath')
    return local
  }
  if (course.config.authoring.rootKey !== 'output') {
    throw new Error('course.json authoring.rootKey must be "output".')
  }
  return path.join(outputLessonDir(course.config.grade, course.config.courseId, problem.problemId), 'plan.json')
}

function normalizePlan(raw) {
  return {
    ...raw,
    schemaVersion: raw.schemaVersion || 1,
    steps: raw.steps || [],
    quickQA: raw.quickQA || []
  }
}

const SCREEN_LATEX_CMD = /\\(?:frac|dfrac|sqrt|times|div|pm|cdot|pi)\b/
const SCREEN_UNICODE_MATH = /[²³×÷½⅓¼⅔¾]/

function screenTextNeedsLatex(text) {
  const s = String(text || '')
  if (!s) return false
  if (SCREEN_LATEX_CMD.test(s)) return true
  if (SCREEN_UNICODE_MATH.test(s)) return true
  return false
}

function assertScreenLatexDelimiters(text, label) {
  if (!screenTextNeedsLatex(text)) return
  if (!/\$[^$]+\$/.test(String(text))) {
    throw new Error(`${label} must wrap math in $...$`)
  }
}

function validateQuickQALatex(quickQA, planId) {
  for (const item of quickQA || []) {
    assertScreenLatexDelimiters(item.question, `quickQA question (${planId}/${item.id})`)
    assertScreenLatexDelimiters(item.answer, `quickQA answer (${planId}/${item.id})`)
  }
}

function isStemEquationBlock(block) {
  return /\bcalc-eq(?:--stem|-index)?\b/.test(String(block?.class || ''))
}

function validateStemEquationBlocks(plan) {
  for (const step of plan.steps || []) {
    for (const block of step.push || []) {
      if (block.region === 'top' && isStemEquationBlock(block) && block.type !== 'latex') {
        throw new Error(
          `Stem equation must use type "latex" (calc-eq): ${plan.id}/${step.id}`
        )
      }
      if (block.type === 'latex' && block.region === 'top' && isStemEquationBlock(block)) {
        if (!block.tex && !block.value) {
          throw new Error(`Stem latex block requires tex: ${plan.id}/${step.id}`)
        }
      }
    }
  }
}

function validatePlanSemantics(plan) {
  // 本仓唯一模板：top-split 计算讲法（要点→详解→答案，对齐 module_template）
  if (plan.layout !== 'top-split') {
    throw new Error(`Only top-split layout is supported: ${plan.id}`)
  }
  if (plan.figureTemplate != null) {
    throw new Error(`figureTemplate is not supported in text courses: ${plan.id}`)
  }
  if (plan.steps.some((step) => step.figure != null)) {
    throw new Error(`step.figure is not supported in text courses: ${plan.id}`)
  }
  // guidanceChain/group/审题环节属旧 text-only 模板（纯文字仓），本仓禁用
  if (plan.guidanceChain != null || plan.guidanceLayout != null ||
      plan.steps.some((step) => step.group != null || step.guidanceSub != null)) {
    throw new Error(`guidanceChain/group is legacy text-only template, forbidden in top-split: ${plan.id}`)
  }
  const stepIds = new Set(plan.steps.map((step) => step.id))

  if (plan.moduleType !== 'knowledge') {
    if (plan.problemBrief || plan.steps.some((step) => step.problemBrief)) {
      throw new Error(
        `plan 不上屏 problemBrief，请删除 plan/step.problemBrief: ${plan.id}`
      )
    }
  }

  const relationText = [
    plan.stem,
    plan.analysis,
    ...(plan.solution || [])
  ].filter(Boolean).join(' ')
  if (plan.lessonContext && plan.lessonContext.archetype === 'directFormula' &&
      /面积相等|等面积|等高|逆用|反求|上下底之和/.test(relationText)) {
    throw new Error(`Relation/inverse problem cannot use directFormula: ${plan.id}`)
  }

  const quickQA = plan.quickQA || []
  if (plan.moduleType === 'example') {
    if (quickQA.length < 3 || quickQA.length > 5) {
      throw new Error(`Example quickQA must contain 3–5 items: ${plan.id}`)
    }
    if (plan.quickQALayout !== 'above-body') {
      throw new Error(`Example quickQA must use quickQALayout="above-body": ${plan.id}`)
    }
  } else if (quickQA.length) {
    throw new Error(`Only example plans may define quickQA: ${plan.id}`)
  }
  for (const item of quickQA) {
    if (!String(item.id || '').trim() || !String(item.question || '').trim() ||
        !String(item.answer || '').trim()) {
      throw new Error(`quickQA items require id, question, and answer: ${plan.id}`)
    }
    if (/你觉得|说说|谈谈|你的思路|怎么做|如何做|有什么方法/.test(item.question)) {
      throw new Error(`quickQA must use a concrete question with one answer: ${plan.id}/${item.id}`)
    }
    if (item.fillBlank && !item.question.includes('＿＿')) {
      throw new Error(`fillBlank quickQA must contain ＿＿: ${plan.id}/${item.id}`)
    }
  }
  validateQuickQALatex(quickQA, plan.id)
  validateStemEquationBlocks(plan)

  for (const step of plan.steps) {
    const agentType = step.agent?.type
    if (!agentType || !['explain', 'ask'].includes(agentType)) {
      throw new Error(`agent.type must be explain or ask: ${plan.id}/${step.id}`)
    }
    for (const block of step.push || []) {
      if (block.card === 'readStem') {
        throw new Error(`readStem cards are forbidden; use section 已知/求: ${plan.id}/${step.id}`)
      }
      if (block.type === 'choice') {
        const options = block.options || []
        const values = options.map((option) => {
          return typeof option === 'object' ? option.value : option
        })
        const answers = Array.isArray(block.answer) ? block.answer : [block.answer]
        if (!options.length || answers.some((answer) => !values.includes(answer))) {
          throw new Error(`Choice answer is not present in options: ${plan.id}/${step.id}`)
        }
      }
      if (block.attachStepId && !stepIds.has(block.attachStepId)) {
        throw new Error(`Unknown attachStepId "${block.attachStepId}" in ${plan.id}/${step.id}`)
      }
      for (const field of ['src', 'url', 'image', 'video']) {
        if (typeof block[field] === 'string' && /^(?:https?:|file:|[A-Za-z]:[\\/]|\/)/i.test(block[field])) {
          throw new Error(`External or absolute block path is forbidden: ${block[field]}`)
        }
      }
    }
  }
}

function safeJsonForScript(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function generatedPush(push, planId) {
  return (push || []).map((block) => ({
    ...block,
    ...(block.attachStepId
      ? { attachStepId: `${planId}_${block.attachStepId}` }
      : {})
  }))
}

function remapRetainPush(retainPush, planId) {
  if (retainPush == null) return retainPush
  const list = Array.isArray(retainPush) ? retainPush : [retainPush]
  return list.map((id) => {
    const value = String(id)
    if (value.startsWith(`${planId}_`)) return value
    return `${planId}_${value}`
  })
}

function generatedStepOptions(step, planId) {
  const options = { scroll: {} }
  for (const key of ['scroll', 'stemClass']) {
    if (step[key] != null) options[key] = step[key]
  }
  if (step.retainPush != null) options.retainPush = remapRetainPush(step.retainPush, planId)
  return options
}

function courseLabel(moduleType) {
  const prefixes = {
    knowledge: '知识点',
    example: '例',
    practice: '练',
    homework: '作业'
  }
  return prefixes[moduleType] || '例'
}

const DEFAULT_TOP_SPLIT_LAYOUT = {
  edgePad: 28,
  gap: 24,
  splitLeftWidth: '58%',
  splitMinHeight: 420
}

function generatedModule(plan, problem) {
  const moduleId = `mod_${plan.id.replace(/-/g, '_')}`
  const containerId = `c_${plan.id.replace(/-/g, '_')}`
  const steps = plan.steps
  const start = steps[0]
  const sideEffects = steps.slice(1).map((step) => {
    const item = {
      id: `${plan.id}_${step.id}`,
      action: step.action,
      kind: plan.moduleType || 'example',
      containerIdx: 0,
      description: (step.agent && step.agent.description) || step.description || '',
      ...generatedStepOptions(step, plan.id)
    }
    if (step.push && step.push.length) item.push = generatedPush(step.push, plan.id)
    return item
  })
  if (plan.moduleType === 'practice') {
    sideEffects.unshift({
      id: `${plan.id}_photo_answer`,
      action: `${problem.actionPrefix}_作答_拍照`,
      kind: 'practice',
      containerIdx: 0,
      anchorStepId: `${plan.id}_${start.id}`,
      photoAnswer: true,
      description: '显示拍照作答区域'
    })
  }
  const quickQA = (plan.quickQA || []).map((item, index) => {
    const suffix = index ? String(index + 1) : ''
    return {
      ...item,
      openAction: item.openAction || `${problem.actionPrefix}_快问快答_打开`,
      questionAction: item.questionAction || `${problem.actionPrefix}_快问快答${suffix}_显示问题`,
      answerAction: item.answerAction || `${problem.actionPrefix}_快问快答${suffix}_显示答案`
    }
  })
  const module = {
    id: moduleId,
    title: plan.title,
    sideEffects,
    quickQA,
    containers: [
      {
        id: containerId,
        label: courseLabel(plan.moduleType || 'example'),
        head: courseLabel(plan.moduleType || 'example'),
        difficulty: plan.difficulty || 1,
        difficultyMax: plan.difficultyMax || 8,
        layout: 'top-split',
        ...(plan.quickQALayout ? { quickQALayout: plan.quickQALayout } : {}),
        guidanceLayout: 'stacked',
        layoutParams: { ...DEFAULT_TOP_SPLIT_LAYOUT, ...(plan.layoutParams || {}) },
        ...(plan.style ? { style: plan.style } : {}),
        textAccumulate: true,
        steps: [
          {
            id: `${plan.id}_${start.id}`,
            kind: plan.moduleType || 'example',
            action: start.action,
            description: (start.agent && start.agent.description) || start.description || '',
            ...generatedStepOptions(start, plan.id),
            ...(start.push && start.push.length ? { push: generatedPush(start.push, plan.id) } : {})
          }
        ]
      }
    ]
  }
  return {
    module,
    source: `// @generated from standard plan ${plan.id}; do not edit.\n;(function () {\n  window.__lessonRegisterModule(${safeJsonForScript(module)})\n})()\n`
  }
}

function actionCatalog(plan, module) {
  const entries = plan.steps.map((step) => ({
    name: step.action,
    params: [],
    description: (step.agent && step.agent.description) || step.description || ''
  }))
  for (const effect of module.sideEffects || []) {
    if (effect.photoAnswer && !entries.some((item) => item.name === effect.action)) {
      const startIndex = entries.findIndex((item) => item.name === plan.steps[0].action)
      entries.splice(startIndex + 1, 0, {
        name: effect.action,
        params: [],
        description: effect.description || '显示拍照作答区域'
      })
    }
  }
  for (const qa of module.quickQA || []) {
    for (const [name, description] of [
      [qa.openAction, '打开快问快答'],
      [qa.questionAction, qa.question],
      [qa.answerAction, qa.answer]
    ]) {
      if (!entries.some((item) => item.name === name)) entries.push({ name, params: [], description })
    }
  }
  return entries
}

function loadAuthoredCatalog(course) {
  const rel = course.config.actionCatalogPath
  if (!rel) return []
  const file = path.resolve(course.dir, rel)
  assertInside(course.dir, file, 'actionCatalogPath')
  return readJson(file)
}

function mergeCatalogs(primary, secondary) {
  const merged = [...primary]
  const seen = new Set(primary.map((item) => item.name))
  for (const item of secondary) {
    if (seen.has(item.name)) throw new Error(`Duplicate action in catalog: ${item.name}`)
    seen.add(item.name)
    merged.push(item)
  }
  return merged
}

function buildLessonMeta(course) {
  const base = {
    id: course.config.courseId,
    title: course.config.title,
    defaults: {
      layoutParams: {
        edgePad: 32,
        textMaxWidth: 'none',
        gap: 28,
        splitLeftWidth: '58%',
        splitMinHeight: 420
      },
      style: { bodySize: 28, lineHeight: 1.58 }
    },
    theme: course.config.theme || {}
  }
  const extra = course.config.lessonMeta || {}
  return {
    ...base,
    ...extra,
    defaults: { ...base.defaults, ...(extra.defaults || {}) },
    theme: { ...base.theme, ...(extra.theme || {}) }
  }
}

function relativeToRepo(file) {
  const relative = path.relative(platformRoot, file)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Debug editing only supports plans inside the monorepo: ${file}`)
  }
  return relative.split(path.sep).join('/')
}

function buildDebugEditMap(course, snapshots) {
  const courseId = course.config.courseId
  const grade = course.config.grade
  const base = `_output_/${grade}/${courseId}/.generated`
  const dist = `dist/${grade}/${courseId}/course/runtime`
  const actions = []
  for (const snapshot of Object.values(snapshots)) {
    for (const step of snapshot.plan.steps) {
      actions.push({
        action: step.action,
        stepId: step.id,
        planFile: relativeToRepo(snapshot.planFile),
        portablePlan: `content/${snapshot.plan.id}/plan.json`,
        portableOutput: `content/${snapshot.plan.id}/output.json`,
        generatedModule: `${base}/lesson/modules/${snapshot.moduleFile}`,
        distModule: `${dist}/lesson/modules/${snapshot.moduleFile}`,
        portableModule: `runtime/lesson/modules/${snapshot.moduleFile}`,
        editable: true
      })
    }
  }
  return {
    version: 1,
    courseId,
    grade,
    generatedCatalog: `${base}/action-catalog.json`,
    distCatalog: `${dist}/action-catalog.json`,
    distIndex: `dist/${grade}/${courseId}/index.html`,
    actions
  }
}

function buildProblemOutput(snapshot, catalog) {
  return {
    schemaVersion: 1,
    problemId: snapshot.plan.id,
    title: snapshot.plan.title,
    sourceOfTruth: 'plan.json',
    modulePath: `runtime/lesson/modules/${snapshot.moduleFile}`,
    steps: snapshot.plan.steps.map((step) => ({
      stepId: step.id,
      action: step.action,
      description: (step.agent && step.agent.description) || step.description || ''
    })),
    catalog: catalog.filter((item) => snapshot.plan.steps.some((step) => step.action === item.name))
  }
}

function embedDebugEditMap(shellFile, editMap) {
  let shell = fs.readFileSync(shellFile, 'utf8')
  shell = shell.replace(
    /var editMap = window\.AICLASS_DEBUG_EDIT_MAP \|\| null/,
    `var editMap = ${safeJsonForScript(editMap)}`
  )
  writeText(shellFile, shell)
}

function ensureCourseDebugShell(courseDir, course, editMap) {
  const courseId = course.config.courseId
  const grade = course.config.grade
  const source = path.join(root, 'templates', 'lesson-runtime', 'debug', 'parent-shell')
  const target = path.join(courseDir, 'debug')
  copyDirectory(source, target)

  const shellJs = path.join(target, 'parent-shell.js')
  const iframeSrc = `../../../../dist/${grade}/${courseId}/index.html`
  let shell = fs.readFileSync(shellJs, 'utf8')
  shell = shell.replace(
    /var iframeSrc = params\.get\('src'\) \|\| '[^']*'/,
    `var iframeSrc = params.get('src') || '${iframeSrc}'`
  )
  writeText(shellJs, shell)
  writeJson(path.join(target, 'edit-map.json'), editMap)
  embedDebugEditMap(shellJs, editMap)
  writeText(
    path.join(target, 'README.md'),
    `# ${courseId} 调试页\n\n` +
      `该页由 \`lesson:generate\` 自动同步，动作列表通过 \`help\` 动态读取。\n\n` +
      `在 Chrome 或 Edge 中打开 [index.html](./index.html)，点击“连接课程文件夹”。选择平台根目录会同步写回 plan.json；选择发布课件根目录（含 course.json 的 dist/${grade}/${courseId}）则只修改该课件包。保存后刷新 iframe 即生效。\n\n` +
      `首次使用前先运行 \`cd engine && npm run course:export -- ${courseId}\`。\n`
  )
}

function generateCourse(courseId) {
  const course = loadCourse(courseId)
  const { problems } = checkCourse(course)
  const generated = path.join(course.dir, generatedName)
  removeDirectory(generated)
  const moduleDir = path.join(generated, 'lesson', 'modules')
  let catalog = []
  const modules = []
  const snapshots = {}

  for (const problem of [...problems].sort((a, b) => a.order - b.order)) {
    const planFile = resolvePlan(course, problem)
    if (!fs.existsSync(planFile)) throw new Error(`Plan not found: ${planFile}`)
    const plan = normalizePlan(readJson(planFile))
    validateAgainstSchema(
      plan,
      path.join(root, 'schemas', 'standard-plan.schema.json'),
      `plan ${problem.problemId}`
    )
    if (plan.id !== problem.problemId) {
      throw new Error(`Plan id ${plan.id} does not match problemId ${problem.problemId}`)
    }
    checkUnique(plan.steps, 'id', `${plan.id} step id`)
    checkUnique(plan.steps, 'action', `${plan.id} action`)
    validatePlanSemantics(plan)
    const output = generatedModule(plan, problem)
    const moduleName = `${String(problem.order).padStart(2, '0')}-${plan.id}.js`
    writeText(path.join(moduleDir, moduleName), output.source)
    modules.push(`lesson/modules/${moduleName}`)
    catalog.push(...actionCatalog(plan, output.module))
    snapshots[plan.id] = { planFile, plan, module: output.module, moduleFile: moduleName }
  }

  catalog = mergeCatalogs(catalog, loadAuthoredCatalog(course))
  if (!catalog.length) throw new Error('Course action catalog is empty.')
  checkUnique(catalog, 'name', 'course action')
  for (const snapshot of Object.values(snapshots)) {
    writeJson(path.join(path.dirname(snapshot.planFile), 'output.json'), buildProblemOutput(snapshot, catalog))
  }
  writeJson(path.join(generated, 'action-catalog.json'), catalog)
  writeJson(path.join(generated, 'debug-tree.json'), {
    courseId,
    modules: Object.values(snapshots).length
      ? Object.values(snapshots).map(({ plan, module }) => ({
          moduleId: module.id,
          title: plan.title,
          actions: plan.steps.map((step) => step.action)
        }))
      : (course.config.authoredModules || []).map((modulePath) => ({
          moduleId: path.basename(modulePath, '.js'),
          title: path.basename(modulePath),
          actions: catalog
            .map((item) => item.name)
            .filter((name) => name.startsWith(path.basename(modulePath, '.js').replace(/^\d+-/, '')))
        }))
  })
  writeText(
    path.join(generated, 'lesson', 'manifest.js'),
    `// @generated; do not edit.\nwindow.LESSON_MANIFEST = ${safeJsonForScript({
      scripts: course.config.extensions || [],
      modules: [...(course.config.authoredModules || []), ...modules]
    })}\n`
  )
  writeText(
    path.join(generated, 'lesson', 'course.meta.js'),
    `// @generated; do not edit.\nwindow.LESSON_META = ${safeJsonForScript(buildLessonMeta(course))}\n`
  )
  const editMap = buildDebugEditMap(course, snapshots)
  ensureCourseDebugShell(course.dir, course, editMap)
  return { course, generated, snapshots, catalog, editMap }
}

function copyCourseSourceFiles(course, target) {
  const lessonSource = path.join(course.dir, 'lesson')
  copyDirectory(lessonSource, path.join(target, 'lesson'), { exclude: [generatedName] })
  const assetsSource = path.join(course.dir, 'assets')
  copyDirectory(assetsSource, path.join(target, 'assets'))
}

function renderIndex(course, catalog, assetPrefix = '') {
  const template = fs.readFileSync(
    path.join(root, 'templates', 'lesson-runtime', 'index.template.html'),
    'utf8'
  )
  const baseRuntime = loadWorkspace().runtime || {
    katexBase: 'vendor/katex/'
  }
  const runtime = Object.fromEntries(
    Object.entries(baseRuntime).map(([key, value]) => [key, typeof value === 'string' ? assetPrefix + value : value])
  )
  return template
    .replaceAll('__COURSE_TITLE__', escapeHtml(course.config.title))
    .replace('__ACTION_CATALOG_JSON__', safeJsonForScript(catalog))
    .replace('__RUNTIME_CONFIG_JSON__', safeJsonForScript(runtime))
    .replaceAll('href="src/', `href="${assetPrefix}src/`)
    .replaceAll('href="lesson/', `href="${assetPrefix}lesson/`)
    .replace("srcRoot: 'src', lessonRoot: 'lesson'", `srcRoot: '${assetPrefix}src', lessonRoot: '${assetPrefix}lesson'`)
    .replaceAll('src="src/', `src="${assetPrefix}src/`)
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function gitCommit() {
  return null
}

function exportCourse(courseId, options = {}) {
  const result = generateCourse(courseId)
  const { course, generated, snapshots, catalog, editMap } = result
  const grade = course.config.grade
  const temp = path.join(distRoot, `.tmp-${courseId}`)
  const finalDir = path.join(distRoot, String(grade), courseId)
  const packageDir = path.join(temp, 'course')
  removeDirectory(temp)
  fs.mkdirSync(temp, { recursive: true })

  copyDirectory(path.join(root, 'src'), path.join(packageDir, 'runtime', 'src'))
  copyDirectory(path.join(root, 'vendor'), path.join(packageDir, 'runtime', 'vendor'))
  // 共享核心装配：从 ../shared 合并 engine/src 与 engine/vendor（共享文件不在本仓库，编译时注入）
  const sharedEngine = path.join(repoRoot, '..', 'shared', 'engine')
  if (fs.existsSync(path.join(sharedEngine, 'src'))) {
    copyDirectory(path.join(sharedEngine, 'src'), path.join(packageDir, 'runtime', 'src'))
  }
  if (fs.existsSync(path.join(sharedEngine, 'vendor'))) {
    copyDirectory(path.join(sharedEngine, 'vendor'), path.join(packageDir, 'runtime', 'vendor'))
  }
  copyDirectory(
    path.join(root, 'templates', 'lesson-runtime', 'lesson'),
    path.join(packageDir, 'runtime', 'lesson')
  )
  copyDirectory(
    path.join(root, 'templates', 'lesson-runtime', 'debug'),
    path.join(temp, 'debug')
  )
  writeJson(path.join(temp, 'debug', 'edit-map.json'), editMap)
  embedDebugEditMap(path.join(temp, 'debug', 'parent-shell', 'parent-shell.js'), editMap)
  copyCourseSourceFiles(course, path.join(packageDir, 'runtime'))
  copyDirectory(path.join(generated, 'lesson'), path.join(packageDir, 'runtime', 'lesson'))
  const customStyle = path.join(course.dir, 'lesson', 'styles', 'lesson.css')
  if (fs.existsSync(customStyle)) {
    copyFile(customStyle, path.join(packageDir, 'runtime', 'lesson', 'styles', 'lesson.css'))
  } else {
    copyFile(
      path.join(root, 'templates', 'course', 'lesson', 'styles', 'lesson.css'),
      path.join(packageDir, 'runtime', 'lesson', 'styles', 'lesson.css')
    )
  }

  writeText(path.join(temp, 'index.html'), renderIndex(course, catalog, 'course/runtime/'))
  writeJson(path.join(packageDir, 'runtime', 'action-catalog.json'), catalog)
  writeJson(path.join(temp, 'debug', 'catalog-tree.json'), readJson(path.join(generated, 'debug-tree.json')))
  writeJson(path.join(packageDir, 'course.json'), course.config)
  writeJson(path.join(packageDir, 'engine.version.json'), readJson(path.join(root, 'engine.version.json')))

  writeText(
    path.join(packageDir, 'README.md'),
    '# 可编辑课件包\n\n' +
    '- 仅编辑 `content/<题目>/plan.json`；同目录 `output.json` 是自动生成索引。\n' +
    '- `runtime/` 是运行产物，请勿直接修改。\n'
  )

  const inputHashes = { 'course/course.json': sha256File(course.file) }
  for (const [problemId, snapshot] of Object.entries(snapshots)) {
    const targetDir = path.join(packageDir, 'content', problemId)
    const target = path.join(targetDir, 'plan.json')
    writeJson(target, snapshot.plan)
    const output = buildProblemOutput(snapshot, catalog)
    writeJson(path.join(targetDir, 'output.json'), output)
    inputHashes[`plan:${problemId}`] = sha256File(target)
  }

  writeText(
    path.join(packageDir, 'scripts', 'smoke-test.mjs'),
    `import fs from 'node:fs'\n` +
    `for (const file of ['course.json','engine.version.json','runtime/lesson/manifest.js']) {\n` +
    `  if (!fs.existsSync(new URL('../' + file, import.meta.url))) throw new Error('Missing ' + file)\n` +
    `}\nconsole.log('Course package smoke test passed.')\n`
  )

  const outputHashes = collectHashes(temp)
  writeJson(path.join(packageDir, 'course.lock.json'), {
    schemaVersion: 1,
    courseId,
    courseVersion: course.config.version,
    engineVersion: readJson(path.join(root, 'engine.version.json')).version,
    engineCommit: gitCommit(),
    courseCommit: gitCommit(),
    inputs: inputHashes,
    outputs: outputHashes,
    toolVersions: { schema: '1', generator: '1' }
  })

  const exportedTextFiles = Object.keys(collectHashes(temp)).filter((rel) => /\.(?:js|json|html|css|md)$/.test(rel))
  for (const rel of exportedTextFiles) {
    const text = fs.readFileSync(path.join(temp, rel), 'utf8')
    const isLeakageGateSource = rel === 'framework-source/tools/aiclass.mjs'
    if ((!isLeakageGateSource && referenceSentinels.some((sentinel) => text.includes(sentinel))) ||
        /(?:^|[\\/])references[\\/]/m.test(text)) {
      throw new Error(`Reference content leaked into export: ${rel}`)
    }
  }

  if (options.checkOnly) {
    removeDirectory(temp)
    return { ...result, finalDir }
  }

  publishExportDirectory(temp, finalDir)
  if (options.zip) {
    const artifact = path.join(root, 'artifacts', `${courseId}-${course.config.version}-source.zip`)
    fs.mkdirSync(path.dirname(artifact), { recursive: true })
    const zip = new AdmZip()
    zip.addLocalFolder(finalDir)
    const stableTime = new Date('2000-01-01T00:00:00.000Z')
    for (const entry of zip.getEntries()) entry.header.time = stableTime
    zip.writeZip(artifact)
  }
  return { ...result, finalDir }
}

function newCourse(courseId, title, grade) {
  const target = outputCourseDir(grade, courseId)
  if (fs.existsSync(target)) throw new Error(`Course already exists: ${courseId}`)
  copyDirectory(path.join(root, 'templates', 'course'), target)
  const source = path.join(target, 'course.template.json')
  const config = fs.readFileSync(source, 'utf8')
    .replaceAll('__COURSE_ID__', courseId)
    .replaceAll('__COURSE_GRADE__', String(grade))
    .replaceAll('__COURSE_TITLE__', title || courseId)
  writeText(path.join(target, 'course.json'), config)
  fs.unlinkSync(source)
  ensureCourseDebugShell(target, { config: { courseId, grade } }, {
    version: 1,
    courseId,
    grade,
    generatedCatalog: `_output_/${grade}/${courseId}/.generated/action-catalog.json`,
    distCatalog: `dist/${grade}/${courseId}/course/runtime/action-catalog.json`,
    distIndex: `dist/${grade}/${courseId}/index.html`,
    actions: []
  })
  console.log(`Created _output_/${grade}/${courseId}`)
}

function restoreCourse(spec) {
  const match = /^([a-z][a-z0-9-]*)@(.+)$/.exec(spec || '')
  if (!match) throw new Error('Use course:restore <course-id>@<version>')
  const [_, courseId, version] = match
  const artifact = path.join(root, 'artifacts', `${courseId}-${version}-source.zip`)
  if (!fs.existsSync(artifact)) throw new Error(`Local artifact not found: ${artifact}`)
  const target = path.join(root, 'restored', `${courseId}-${version}`)
  removeDirectory(target)
  fs.mkdirSync(target, { recursive: true })
  new AdmZip(artifact).extractAllTo(target, true)
  console.log(`Restored to ${target}`)
}

function previewCourse(courseId) {
  const { finalDir } = exportCourse(courseId)
  const port = 3456
  console.log(`Preview: http://127.0.0.1:${port}/`)
  const child = spawn('python', ['-m', 'http.server', String(port)], {
    cwd: finalDir,
    stdio: 'inherit'
  })
  child.on('exit', (code) => process.exit(code || 0))
}

function parseCourseNewArgs(args) {
  const rest = args.filter((arg) => arg !== '--')
  const gradeIndex = rest.indexOf('--grade')
  const grade = gradeIndex >= 0 ? rest[gradeIndex + 1] : undefined
  if (gradeIndex >= 0) rest.splice(gradeIndex, 2)
  let idOrPath
  if (rest[0] === '--from-md') {
    rest.shift()
    idOrPath = rest.shift()
    if (!idOrPath) throw new Error('course:new --from-md requires a .md path')
  } else {
    idOrPath = rest.shift()
  }
  const title = rest.join(' ').trim() || undefined
  if (!idOrPath || !/^[1-9]\d*$/.test(String(grade))) {
    throw new Error(
      'Usage: course:new <courseId|path.md> --grade <n> ["title"] | course:new --from-md <path.md> --grade <n> ["title"]'
    )
  }
  return { courseId: courseIdFromInput(idOrPath), title, grade: Number(grade) }
}

function parseOptions(args) {
  return {
    checkOnly: args.includes('--check'),
    zip: args.includes('--zip')
  }
}

async function main() {
  const [command, first, second, ...rest] = process.argv.slice(2)
  switch (command) {
    case 'course:new': {
      const { courseId, title, grade } = parseCourseNewArgs([first, second, ...rest].filter(Boolean))
      newCourse(courseId, title, grade)
      break
    }
    case 'course:check': {
      const course = loadCourse(first)
      checkCourse(course)
      if ((course.config.authoring && course.config.authoring.problems || []).length) generateCourse(first)
      console.log(`Course ${first} is valid.`)
      break
    }
    case 'lesson:generate':
      generateCourse(first)
      console.log(`Generated course ${first}.`)
      break
    case 'course:export': {
      const result = exportCourse(first, parseOptions([second, ...rest].filter(Boolean)))
      console.log(`Exported course ${first} to ${result.finalDir}`)
      break
    }
    case 'course:preview':
      previewCourse(first)
      break
    case 'course:restore':
      restoreCourse(first)
      break
    default:
      throw new Error(`Unknown command: ${command || '(missing)'}`)
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})

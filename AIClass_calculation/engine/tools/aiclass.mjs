import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import Ajv2020 from 'ajv/dist/2020.js'
import AdmZip from 'adm-zip'
import { courseIdFromInput, validSlug } from './course-id-from-md.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const repoRoot = path.dirname(root)
const coursesRoot = path.join(repoRoot, 'courses')
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
  try {
    removeDirectory(finalDir)
    fs.renameSync(temp, finalDir)
    return
  } catch (err) {
    const code = err && err.code
    if (code !== 'EBUSY' && code !== 'EPERM' && code !== 'ENOTEMPTY') throw err
  }
  fs.mkdirSync(finalDir, { recursive: true })
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
  return path.join(coursesRoot, courseId)
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
    `courses/${course.config.courseId}/course.json`
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
  const workspace = loadWorkspace()
  const rootKey = course.config.authoring.rootKey
  const configured = workspace.authoringRoots && workspace.authoringRoots[rootKey]
  if (!configured) {
    throw new Error(`workspace.local.json does not map authoring root "${rootKey}"`)
  }
  const authoringRoot = path.resolve(root, configured)
  return path.join(authoringRoot, 'lesson', problem.problemId, 'plan.json')
}

function normalizePlan(raw) {
  return {
    ...raw,
    schemaVersion: raw.schemaVersion || 1,
    steps: raw.steps || [],
    quickQA: raw.quickQA || []
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

function ensureCourseDebugShell(courseDir, courseId) {
  const source = path.join(root, 'templates', 'lesson-runtime', 'debug', 'parent-shell')
  const target = path.join(courseDir, 'debug')
  copyDirectory(source, target)

  const shellJs = path.join(target, 'parent-shell.js')
  const iframeSrc = `../../../engine/dist/${courseId}/index.html`
  let shell = fs.readFileSync(shellJs, 'utf8')
  shell = shell.replace(
    /var iframeSrc = params\.get\('src'\) \|\| '[^']*'/,
    `var iframeSrc = params.get('src') || '${iframeSrc}'`
  )
  writeText(shellJs, shell)
  writeText(
    path.join(target, 'README.md'),
    `# ${courseId} 调试页\n\n` +
      `该页由 \`lesson:generate\` 自动同步，动作列表通过 \`help\` 动态读取。\n\n` +
      `先运行 \`cd engine && npm run course:export -- ${courseId}\`，再打开 [index.html](./index.html)。\n`
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
    snapshots[plan.id] = { planFile, plan, module: output.module }
  }

  catalog = mergeCatalogs(catalog, loadAuthoredCatalog(course))
  if (!catalog.length) throw new Error('Course action catalog is empty.')
  checkUnique(catalog, 'name', 'course action')
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
  ensureCourseDebugShell(course.dir, courseId)
  return { course, generated, snapshots, catalog }
}

function copyCourseSourceFiles(course, target) {
  const lessonSource = path.join(course.dir, 'lesson')
  copyDirectory(lessonSource, path.join(target, 'lesson'), { exclude: [generatedName] })
  const assetsSource = path.join(course.dir, 'assets')
  copyDirectory(assetsSource, path.join(target, 'assets'))
}

function renderIndex(course, catalog) {
  const template = fs.readFileSync(
    path.join(root, 'templates', 'lesson-runtime', 'index.template.html'),
    'utf8'
  )
  const runtime = loadWorkspace().runtime || {
    katexBase: 'vendor/katex/'
  }
  return template
    .replaceAll('__COURSE_TITLE__', escapeHtml(course.config.title))
    .replace('__ACTION_CATALOG_JSON__', safeJsonForScript(catalog))
    .replace('__RUNTIME_CONFIG_JSON__', safeJsonForScript(runtime))
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
  const { course, generated, snapshots, catalog } = result
  const temp = path.join(root, 'dist', `.tmp-${courseId}`)
  const finalDir = path.join(root, 'dist', courseId)
  removeDirectory(temp)
  fs.mkdirSync(temp, { recursive: true })

  copyDirectory(path.join(root, 'src'), path.join(temp, 'src'))
  copyDirectory(path.join(root, 'vendor'), path.join(temp, 'vendor'))
  copyDirectory(
    path.join(root, 'templates', 'lesson-runtime', 'lesson'),
    path.join(temp, 'lesson')
  )
  copyDirectory(
    path.join(root, 'templates', 'lesson-runtime', 'debug'),
    path.join(temp, 'debug')
  )
  copyCourseSourceFiles(course, temp)
  copyDirectory(path.join(generated, 'lesson'), path.join(temp, 'lesson'))
  const customStyle = path.join(course.dir, 'lesson', 'styles', 'lesson.css')
  if (fs.existsSync(customStyle)) {
    copyFile(customStyle, path.join(temp, 'lesson', 'styles', 'lesson.css'))
  } else {
    copyFile(
      path.join(root, 'templates', 'course', 'lesson', 'styles', 'lesson.css'),
      path.join(temp, 'lesson', 'styles', 'lesson.css')
    )
  }

  writeText(path.join(temp, 'index.html'), renderIndex(course, catalog))
  writeJson(path.join(temp, 'action-catalog.json'), catalog)
  writeJson(path.join(temp, 'debug', 'catalog-tree.json'), readJson(path.join(generated, 'debug-tree.json')))
  writeJson(path.join(temp, 'reports', 'action-catalog.json'), catalog)
  writeJson(path.join(temp, 'reports', 'catalog-tree.json'), readJson(path.join(generated, 'debug-tree.json')))
  writeJson(path.join(temp, 'course.json'), course.config)
  writeJson(path.join(temp, 'engine.version.json'), readJson(path.join(root, 'engine.version.json')))
  writeJson(path.join(temp, 'package.json'), {
    name: `aiclass-course-${courseId}`,
    private: true,
    scripts: { dev: 'python -m http.server 3456', test: 'node scripts/smoke-test.mjs' }
  })

  copyDirectory(path.join(root, 'tools'), path.join(temp, 'framework-source', 'tools'))
  copyDirectory(path.join(root, 'schemas'), path.join(temp, 'framework-source', 'schemas'))
  copyDirectory(path.join(root, 'templates'), path.join(temp, 'framework-source', 'templates'))
  copyFile(path.join(root, 'package.json'), path.join(temp, 'framework-source', 'package.json'))
  copyFile(path.join(root, 'package-lock.json'), path.join(temp, 'framework-source', 'package-lock.json'))
  copyFile(path.join(root, 'engine.version.json'), path.join(temp, 'framework-source', 'engine.version.json'))
  copyDirectory(course.dir, path.join(temp, 'course-source', courseId), { exclude: [generatedName] })
  writeText(
    path.join(temp, 'README-SOURCE.md'),
    '# Complete source snapshot\n\n' +
    '- `src/`, `lesson/`, `vendor/` and `index.html` are the directly runnable package.\n' +
    '- `course-source/` is the exact course source used for this release.\n' +
    '- `authoring-snapshot/` preserves normalized Plan inputs.\n' +
    '- `framework-source/` preserves generator, schemas, templates and lockfile.\n' +
    '- `reports/` and `course.lock.json` record generated outputs and hashes.\n'
  )

  const inputHashes = { 'course.json': sha256File(course.file) }
  for (const [problemId, snapshot] of Object.entries(snapshots)) {
    const target = path.join(temp, 'authoring-snapshot', problemId, 'plan.json')
    writeJson(target, snapshot.plan)
    inputHashes[`plan:${problemId}`] = sha256File(target)
  }

  writeText(
    path.join(temp, 'scripts', 'smoke-test.mjs'),
    `import fs from 'node:fs'\n` +
    `for (const file of ['index.html','course.json','engine.version.json','lesson/manifest.js']) {\n` +
    `  if (!fs.existsSync(new URL('../' + file, import.meta.url))) throw new Error('Missing ' + file)\n` +
    `}\nconsole.log('Course package smoke test passed.')\n`
  )

  const outputHashes = collectHashes(temp)
  writeJson(path.join(temp, 'course.lock.json'), {
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

function newCourse(courseId, title) {
  const target = courseDirectory(courseId)
  if (fs.existsSync(target)) throw new Error(`Course already exists: ${courseId}`)
  copyDirectory(path.join(root, 'templates', 'course'), target)
  const source = path.join(target, 'course.template.json')
  const config = fs.readFileSync(source, 'utf8')
    .replaceAll('__COURSE_ID__', courseId)
    .replaceAll('__COURSE_TITLE__', title || courseId)
  writeText(path.join(target, 'course.json'), config)
  fs.unlinkSync(source)
  const pipeTplName = 'pipeline.template.json'
  const pipeCopied = path.join(target, pipeTplName)
  const pipeTpl = path.join(root, 'templates', 'course', pipeTplName)
  if (fs.existsSync(pipeTpl)) {
    const pipe = JSON.parse(
      fs.readFileSync(pipeTpl, 'utf8').replaceAll('__COURSE_ID__', courseId)
    )
    writeJson(path.join(target, 'pipeline.json'), pipe)
  }
  if (fs.existsSync(pipeCopied)) fs.unlinkSync(pipeCopied)
  for (const dir of ['lesson/modules', 'lesson/extensions', 'assets', 'authoring']) {
    fs.mkdirSync(path.join(target, dir), { recursive: true })
  }
  ensureCourseDebugShell(target, courseId)
  console.log(`Created courses/${courseId}`)
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
  let idOrPath
  if (rest[0] === '--from-md') {
    rest.shift()
    idOrPath = rest.shift()
    if (!idOrPath) throw new Error('course:new --from-md requires a .md path')
  } else {
    idOrPath = rest.shift()
  }
  const title = rest.join(' ').trim() || undefined
  if (!idOrPath) {
    throw new Error(
      'Usage: course:new <courseId|path.md> ["title"] | course:new --from-md <path.md> ["title"]'
    )
  }
  return { courseId: courseIdFromInput(idOrPath), title }
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
      const { courseId, title } = parseCourseNewArgs([first, second, ...rest].filter(Boolean))
      newCourse(courseId, title)
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

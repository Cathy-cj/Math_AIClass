// 三模板共享的引擎测试基座：双根解析 helpers + 公共静态检查 + e2e 流水线骨架。
// 每个模板的 tests/run-tests.mjs 导入本模块，注入产品专属钩子。
// 公共断言只收录三包引擎都满足的不变量；产品差异（图形/文字/计算样式、生成模块形状）留在各包薄壳。
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

export function assert(condition, message) {
  if (!condition) throw new Error(message)
}

export function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '.generated') continue
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)
    if (entry.isDirectory()) copyDirectory(from, to)
    else fs.copyFileSync(from, to)
  }
}

export function walk(base, filter = () => true, relative = '') {
  const result = []
  const current = path.join(base, relative)
  if (!fs.existsSync(current)) return result
  for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = path.join(relative, entry.name)
    if (entry.isDirectory()) result.push(...walk(base, filter, rel))
    else if (filter(rel)) result.push(rel)
  }
  return result
}

export function hashTree(base) {
  const hash = crypto.createHash('sha256')
  for (const rel of walk(base)) {
    hash.update(rel.replaceAll('\\', '/'))
    hash.update(fs.readFileSync(path.join(base, rel)))
  }
  return hash.digest('hex')
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    shell: false
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  }
  return result.stdout
}

// shared 目录没有自己的 node_modules，ajv 必须从调用方引擎的依赖树解析（createRequire 基于 engineRoot）。
function createValidator(engineRoot) {
  const requireEngine = createRequire(path.join(engineRoot, 'package.json'))
  const Ajv2020 = requireEngine('ajv/dist/2020.js')
  return function validateJson(dataFile, schemaFile) {
    const ajv = new Ajv2020({ allErrors: true, strict: false })
    const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'))
    const validate = ajv.compile(schema)
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    assert(validate(data), `${path.basename(dataFile)} schema errors: ${JSON.stringify(validate.errors)}`)
  }
}

// 引擎 src 双根解析：shared 抽取后共享文件不在 repo src，导出时由 shared/engine 装配。
// 测试按「repo src 优先，缺则查 shared src」解析，镜像 course:export 的合并顺序。
export function createContext(engineRoot) {
  const root = engineRoot
  const sharedEngineRoot = path.join(root, '..', '..', 'shared', 'engine')
  const coursesRoot = path.join(path.dirname(root), 'courses')
  const fixtureCourseId = 'fixture-minimal'
  function resolveSrc(rel) {
    const local = path.join(root, 'src', rel)
    if (fs.existsSync(local)) return local
    return path.join(sharedEngineRoot, 'src', rel)
  }
  function readSrc(rel) {
    const file = resolveSrc(rel)
    assert(fs.existsSync(file), `Missing engine source (repo or shared): ${rel}`)
    return fs.readFileSync(file, 'utf8')
  }
  function resolveVendor(rel) {
    const local = path.join(root, 'vendor', rel)
    if (fs.existsSync(local)) return local
    return path.join(sharedEngineRoot, 'vendor', rel)
  }
  return {
    root,
    sharedEngineRoot,
    coursesRoot,
    fixtureCourseId,
    courseDir: path.join(coursesRoot, fixtureCourseId),
    fixture: path.join(root, 'tests', 'fixtures', 'minimal-course'),
    resolveSrc,
    readSrc,
    resolveVendor,
    validateJson: createValidator(root)
  }
}

const BOUNDARY_TOKENS = [
  '圆的经典', 'understanding-circles', '例1_', '练1_', '练2_', '体1_', '棚1_',
  'lf-pr2', 'open.bigmodel.cn', 'unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com',
  '.ex1-answer-hl', '.vol1-answer-hl', '.vol2-answer-hl', '.equal-area-answer-hl',
  'wood-roll-diagram'
]

export function checkEngineBoundary(ctx) {
  for (const rel of walk(path.join(ctx.root, 'src'), (name) => /\.(?:js|css|html)$/.test(name))) {
    const text = fs.readFileSync(path.join(ctx.root, 'src', rel), 'utf8')
    for (const token of BOUNDARY_TOKENS) {
      assert(!text.includes(token), `Engine boundary leak "${token}" in src/${rel}`)
    }
  }
}

export function checkEngineManifest(ctx) {
  const manifestFile = path.join(ctx.root, 'src', 'boot', 'engine-manifest.js')
  const source = fs.readFileSync(manifestFile, 'utf8')
  const matches = [...source.matchAll(/['"]([^'"]+\.js)['"]/g)].map((item) => item[1])
  assert(matches.length > 0, 'Engine manifest is empty.')
  for (const rel of matches) {
    if (/^https?:\/\//i.test(rel)) continue
    const file = ctx.resolveSrc(rel)
    assert(fs.existsSync(file), `Engine manifest references missing file: ${rel}`)
    run(process.execPath, ['--check', file])
  }
}

export function checkReferenceBoundary(ctx) {
  const referenceRoot = path.join(ctx.root, 'references')
  const files = walk(referenceRoot)
  assert(files.length >= 21, 'Controlled reference library is incomplete.')
  for (const rel of files) {
    const text = fs.readFileSync(path.join(referenceRoot, rel), 'utf8')
    assert(text.includes('REFERENCE_ONLY_DO_NOT_COPY'), `Reference sentinel missing: ${rel}`)
    assert(text.includes('referenceOnly'), `referenceOnly metadata missing: ${rel}`)
    if (rel.endsWith('.json')) JSON.parse(text)
  }
}

// 共享主题不变量：三包 course-presentation/widgets 均以相同契约承载 guide 轨道与作答高亮。
export function checkThemeCommon(ctx) {
  const engineCss = fs.readFileSync(path.join(ctx.root, 'src', 'styles', 'engine.css'), 'utf8')
  assert(engineCss.includes('course-presentation.css'), 'engine.css must import course-presentation.css')
  const widgetsCss = fs.readFileSync(path.join(ctx.root, 'src', 'styles', 'widgets.css'), 'utf8')
  assert(widgetsCss.includes('.lf-solve-answer-highlight'), 'Shared theme missing answer highlight styles.')
  const container = ctx.readSrc('core/shell/course-container.js')
  assert(
    container.includes('idx + \'. \' + (item.title || \'\')'),
    'Shared runtime must render numbered first-level guide titles.'
  )
}

// 右栏 replaceKey 就地改写契约：只保留三包一致的 course-container 不变量，host 差异留在各包。
export function checkReplaceKeyCommon(ctx) {
  const src = ctx.readSrc('core/shell/course-container.js')
  assert(src.includes('function findReplaceKeyBlock'), 'findReplaceKeyBlock missing')
  const appendStart = src.indexOf('CourseContainer.prototype.appendBlocks')
  const appendEnd = src.indexOf('CourseContainer.prototype.setFigureState')
  assert(appendStart >= 0 && appendEnd > appendStart, 'appendBlocks section missing')
  const appendSection = src.slice(appendStart, appendEnd)
  assert(
    appendSection.includes('findReplaceKeyBlock(self, replaceKey, target)'),
    'appendBlocks must resolve replaceKey blocks in-place'
  )
  assert(
    !appendSection.includes('removeReplaceKeyBlocks(self, block.replaceKey)'),
    'appendBlocks must not remove+reappend replaceKey blocks'
  )
}

// MathLive 悬浮键盘契约：组件在 shared，接线（manifest/engine.css/container/host/fill）三包一致。
export function checkMathLiveKeyboard(ctx) {
  for (const gone of [
    path.join(ctx.root, 'src', 'components', 'fill-keyboard.js'),
    path.join(ctx.root, 'src', 'components', 'math-keyboard.js'),
    path.join(ctx.root, 'src', 'styles', 'math-keyboard.css')
  ]) {
    assert(!fs.existsSync(gone), `Legacy keyboard must be removed: ${path.basename(gone)}`)
  }
  const engineCss = fs.readFileSync(path.join(ctx.root, 'src', 'styles', 'engine.css'), 'utf8')
  assert(engineCss.includes('mathlive-keyboard.css'), 'engine.css must import mathlive-keyboard.css')
  assert(!engineCss.includes('math-keyboard.css'), 'engine.css must not import legacy math-keyboard.css')
  const manifest = fs.readFileSync(path.join(ctx.root, 'src', 'boot', 'engine-manifest.js'), 'utf8')
  assert(manifest.includes('components/mathlive.js'), 'engine manifest must load components/mathlive.js')
  assert(
    !manifest.includes('fill-keyboard.js') && !manifest.includes('math-keyboard.js'),
    'engine manifest must not load legacy keyboards'
  )
  const mathlive = ctx.readSrc('components/mathlive.js')
  assert(mathlive.includes("'\\\\sqrt{#0}'"), 'Sqrt key must insert \\sqrt{#0}')
  assert(!mathlive.includes('\\sqrt[#?]{#0}'), 'Sqrt key must not insert \\sqrt[#?]{#0}')
  assert(
    mathlive.includes('ns.syncMathKeyboard') && mathlive.includes('ns.resetMathKeyboard'),
    'MathLive keyboard must expose syncMathKeyboard/resetMathKeyboard'
  )
  const container = ctx.readSrc('core/shell/course-container.js')
  assert(container.includes('syncMathKeyboard'), 'Container must sync the MathLive keyboard')
  assert(!container.includes('syncFillKeyboardVisibility'), 'Container must not call the legacy fill keyboard')
  const host = ctx.readSrc('core/shell/container-host.js')
  assert(host.includes('resetMathKeyboard'), 'Host reset must reset the MathLive keyboard')
  assert(!host.includes('hideFloatingMathKeyboard'), 'Host must not call the legacy floating keyboard')
  const fillWidget = ctx.readSrc('widgets/fill.js')
  assert(fillWidget.includes('createLatexMathfield'), 'Fill widget must use the MathLive mathfield')
}

// 严格提交协议：kind 归一化 + 无 status/action 附加 + 不附 source + photo 路由，全部在 shared/包内共同件上。
export function checkSubmitProtocol(ctx) {
  const submitText = ctx.readSrc('core/session/submit-text.js')
  assert(submitText.includes('function protocolKind'), 'submit-text must normalize kinds via protocolKind')
  assert(
    submitText.includes('kind: protocolKind(kind)'),
    'submit-text fallback report must post the normalized protocol kind'
  )
  assert(
    !submitText.includes("status: 'ok'"),
    'submit-text fallback report must not add status/action fields'
  )
  const bridge = ctx.readSrc('bridge/courseware-submit.js')
  assert(bridge.includes('function protocolKind'), 'courseware-submit must normalize kinds via protocolKind')
  assert(
    bridge.includes("body.kind !== 'course_photo' && body.value == null"),
    'Non-photo submissions without value must not be posted'
  )
  assert(!bridge.includes("status: 'ok'"), 'courseware-submit must not attach status')
  const executionLog = ctx.readSrc('core/session/execution-log.js')
  assert(
    executionLog.includes('window.parent.postMessage') &&
      !executionLog.includes('source:'),
    'Execution log must not attach source to messages.'
  )
  const scheduler = ctx.readSrc('core/session/course-scheduler.js')
  assert(
    !scheduler.includes('showRecognitionResult'),
    'Legacy 作答结果 action handlers must be removed from the scheduler'
  )
  assert(
    scheduler.includes('showPhotoAnswer') && scheduler.includes('showPhotoResult'),
    'Scheduler must route photoAnswer actions and photo_result echo'
  )
}

export function runStaticChecks(ctx) {
  checkEngineBoundary(ctx)
  checkEngineManifest(ctx)
  checkReferenceBoundary(ctx)
  checkThemeCommon(ctx)
  checkReplaceKeyCommon(ctx)
  checkMathLiveKeyboard(ctx)
  checkSubmitProtocol(ctx)
}

// e2e 流水线骨架：fixture → 生成 → 导出 → 泄漏/产物校验。产品差异经 hooks 注入：
//   onExampleModule(module) — 例 模块的产品断言
//   extraVendor(rel[])      — 需 resolveVendor 的额外 vendor（如 AIClass 的 jsxgraph）
//   extraSubTests(rel[])    — 额外子测试入口（如 calc 的 calc-tex-split.test.mjs）
export function runPipeline(ctx, hooks = {}) {
  const onExampleModule = hooks.onExampleModule || function () {}
  const extraVendor = hooks.extraVendor || []
  const extraSubTests = hooks.extraSubTests || []
  fs.rmSync(ctx.courseDir, { recursive: true, force: true })
  copyDirectory(ctx.fixture, ctx.courseDir)
  try {
    assert(fs.existsSync(ctx.resolveVendor('katex/katex.min.js')), 'KaTeX vendor missing.')
    for (const rel of extraVendor) {
      assert(fs.existsSync(ctx.resolveVendor(rel)), `Vendor missing: ${rel}`)
    }

    run(process.execPath, ['tools/aiclass.mjs', 'course:check', ctx.fixtureCourseId], { cwd: ctx.root })
    assert(
      fs.existsSync(path.join(ctx.courseDir, 'debug', 'index.html')),
      'Every course must contain its own debug/index.html.'
    )
    const generated = path.join(ctx.courseDir, '.generated')
    const exampleModule = fs.readFileSync(
      path.join(generated, 'lesson', 'modules', '01-problem-a.js'),
      'utf8'
    )
    assert(exampleModule.includes('"label": "例"'), 'Generated example label is not normalized.')
    assert(
      !/"source"\s*:/.test(exampleModule),
      'Generated module must not carry course source.'
    )
    assert(
      exampleModule.includes('"quickQALayout": "above-body"') &&
        exampleModule.includes('"id": "qa-a"') &&
        exampleModule.includes('"id": "qa-c"'),
      'Generated example must keep its 3–5 top quickQA items.'
    )
    onExampleModule(exampleModule)
    const practiceModule = fs.readFileSync(
      path.join(generated, 'lesson', 'modules', '02-problem-b.js'),
      'utf8'
    )
    const homeworkModule = fs.readFileSync(
      path.join(generated, 'lesson', 'modules', '03-problem-c.js'),
      'utf8'
    )
    assert(practiceModule.includes('"label": "练"'), 'Generated practice label is not 练.')
    assert(
      practiceModule.includes('"action": "测试练_作答_拍照"') &&
        practiceModule.includes('"photoAnswer": true'),
      'Generated practice module misses photo answer action.'
    )
    assert(homeworkModule.includes('"label": "作业"'), 'Generated homework label is not 作业.')
    const firstHash = hashTree(generated)
    run(process.execPath, ['tools/aiclass.mjs', 'lesson:generate', ctx.fixtureCourseId], { cwd: ctx.root })
    assert(hashTree(generated) === firstHash, 'Generator output is not deterministic.')

    run(process.execPath, ['tools/aiclass.mjs', 'course:export', ctx.fixtureCourseId, '--zip'], { cwd: ctx.root })
    const fixtureConfig = JSON.parse(fs.readFileSync(path.join(ctx.fixture, 'course.json'), 'utf8'))
    const exported = path.join(ctx.root, '..', '..', 'dist', String(fixtureConfig.grade), ctx.fixtureCourseId)
    const catalog = JSON.parse(fs.readFileSync(path.join(exported, 'course', 'runtime', 'action-catalog.json'), 'utf8'))
    for (const name of ['测试_开始', '测试_步骤01', '测试_快问快答_打开', '测试_快问快答3_显示问题', '测试练_作答_拍照']) {
      assert(catalog.some((item) => item.name === name), `Generated catalog misses ${name}.`)
    }
    assert(
      catalog.findIndex((item) => item.name === '测试练_开始') <
        catalog.findIndex((item) => item.name === '测试练_作答_拍照') &&
      catalog.findIndex((item) => item.name === '测试练_作答_拍照') <
        catalog.findIndex((item) => item.name === '测试练_步骤01'),
      'Photo answer action must follow the practice start action.'
    )
    assert(fs.existsSync(path.join(exported, 'debug.html')), 'Debug shell debug.html missing.')
    const debugHtml = fs.readFileSync(path.join(exported, 'debug.html'), 'utf8')
    assert(
      !/(?:src|href)="[^"]*\.(?:css|js)"/.test(debugHtml),
      'Dist debug.html must be a self-contained single file.'
    )

    const index = fs.readFileSync(path.join(exported, 'index.html'), 'utf8')
    for (const placeholder of ['__COURSE_TITLE__', '__ACTION_CATALOG_JSON__', '__RUNTIME_CONFIG_JSON__', 'AICLASS_REFERENCE_ONLY', 'REFERENCE_ONLY_DO_NOT_COPY']) {
      assert(!index.includes(placeholder), `Placeholder leaked into export: ${placeholder}`)
    }
    assert(fs.existsSync(path.join(exported, 'course', 'content', 'problem-a', 'plan.json')), 'Editable plan missing.')
    const output = JSON.parse(fs.readFileSync(path.join(exported, 'course', 'content', 'problem-a', 'output.json'), 'utf8'))
    assert(output.sourceOfTruth === 'plan.json', 'Editable source marker missing.')
    assert(output.problemId === 'problem-a', 'Output problem index missing.')
    for (const gone of ['framework-source', 'course-source', 'reports']) {
      assert(!fs.existsSync(path.join(exported, gone)), `Duplicate ${gone} should not be exported.`)
    }
    assert(fs.existsSync(path.join(ctx.root, 'artifacts', `${ctx.fixtureCourseId}-0.1.0-source.zip`)), 'Source ZIP missing.')

    for (const rel of walk(exported, (name) => /\.(?:js|json|html|css|md)$/.test(name))) {
      const text = fs.readFileSync(path.join(exported, rel), 'utf8')
      assert(!text.includes('REFERENCE_ONLY_DO_NOT_COPY'), `Reference sentinel leaked into ${rel}.`)
    }

    ctx.validateJson(
      path.join(exported, 'course', 'course.lock.json'),
      path.join(ctx.root, 'schemas', 'course-lock.schema.json')
    )
    run(process.execPath, ['tests/course-id-from-md.mjs'], { cwd: ctx.root })
    run(process.execPath, ['tests/pipeline-board.test.mjs'], { cwd: ctx.root })
    for (const rel of extraSubTests) run(process.execPath, [rel], { cwd: ctx.root })
    run(process.execPath, ['scripts/smoke-test.mjs'], { cwd: path.join(exported, 'course') })
    console.log('All framework tests passed.')
  } finally {
    fs.rmSync(ctx.courseDir, { recursive: true, force: true })
  }
}

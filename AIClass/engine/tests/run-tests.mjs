import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'

const require = createRequire(import.meta.url)

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const coursesRoot = path.join(path.dirname(root), 'courses')
const fixture = path.join(root, 'tests', 'fixtures', 'minimal-course')
const fixtureCourseId = 'fixture-minimal'
const courseDir = path.join(coursesRoot, fixtureCourseId)

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '.generated') continue
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)
    if (entry.isDirectory()) copyDirectory(from, to)
    else fs.copyFileSync(from, to)
  }
}

function walk(base, filter = () => true, relative = '') {
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

function hashTree(base) {
  const hash = crypto.createHash('sha256')
  for (const rel of walk(base)) {
    hash.update(rel.replaceAll('\\', '/'))
    hash.update(fs.readFileSync(path.join(base, rel)))
  }
  return hash.digest('hex')
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    shell: false
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  }
  return result.stdout
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function validateJson(dataFile, schemaFile) {
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'))
  const validate = ajv.compile(schema)
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  assert(validate(data), `${path.basename(dataFile)} schema errors: ${JSON.stringify(validate.errors)}`)
}

function checkEngineBoundary() {
  const forbidden = [
    '圆的经典', 'understanding-circles', '例1_', '练1_', '练2_', '体1_', '棚1_',
    'lf-pr2', 'open.bigmodel.cn', 'unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com',
    '.ex1-answer-hl', '.vol1-answer-hl', '.vol2-answer-hl', '.equal-area-answer-hl',
    'wood-roll-diagram'
  ]
  for (const rel of walk(path.join(root, 'src'), (name) => /\.(?:js|css|html)$/.test(name))) {
    const text = fs.readFileSync(path.join(root, 'src', rel), 'utf8')
    for (const token of forbidden) {
      assert(!text.includes(token), `Engine boundary leak "${token}" in src/${rel}`)
    }
  }
}

function checkEngineManifest() {
  const manifestFile = path.join(root, 'src', 'boot', 'engine-manifest.js')
  const source = fs.readFileSync(manifestFile, 'utf8')
  const matches = [...source.matchAll(/['"]([^'"]+\.js)['"]/g)].map((item) => item[1])
  assert(matches.length > 0, 'Engine manifest is empty.')
  for (const rel of matches) {
    const file = path.join(root, 'src', rel)
    assert(fs.existsSync(file), `Engine manifest references missing file: ${rel}`)
    run(process.execPath, ['--check', file])
  }
}

function checkReferenceBoundary() {
  const referenceRoot = path.join(root, 'references')
  const files = walk(referenceRoot)
  assert(files.length >= 21, 'Controlled reference library is incomplete.')
  for (const rel of files) {
    const text = fs.readFileSync(path.join(referenceRoot, rel), 'utf8')
    assert(text.includes('REFERENCE_ONLY_DO_NOT_COPY'), `Reference sentinel missing: ${rel}`)
    assert(text.includes('referenceOnly'), `referenceOnly metadata missing: ${rel}`)
    if (rel.endsWith('.json')) JSON.parse(text)
  }
}

function checkSharedPresentationTheme() {
  const engineCss = fs.readFileSync(path.join(root, 'src', 'styles', 'engine.css'), 'utf8')
  assert(engineCss.includes('course-presentation.css'), 'engine.css must import course-presentation.css')
  assert(engineCss.includes('problem-brief.css'), 'engine.css must import problem-brief.css')
  const presentation = fs.readFileSync(path.join(root, 'src', 'styles', 'course-presentation.css'), 'utf8')
  assert(presentation.includes('.cc-guide-chain'), 'Shared theme missing guide chain styles.')
  assert(presentation.includes('.course-stem-head'), 'Shared theme missing stem head styles.')
  assert(presentation.includes('.lf-solve-answer-highlight'), 'Shared theme missing answer highlight styles.')
  assert(
    presentation.includes('.course-figure .jxgbox') &&
      /\[data-layout="left-right"\]\s*\.course-figure\s*\{[^}]*background:\s*#fff/s.test(presentation),
    'Figure stage must use opaque white board against paper grid.'
  )
  const problemBrief = fs.readFileSync(path.join(root, 'src', 'components', 'problem-brief.js'), 'utf8')
  assert(
    problemBrief.includes('createProblemBrief') &&
      problemBrief.includes('setProblemBriefState'),
    'Shared progressive problemBrief component is missing.'
  )
  const problemBriefCss = fs.readFileSync(path.join(root, 'src', 'styles', 'problem-brief.css'), 'utf8')
  assert(
    problemBriefCss.includes('.cc-problem-brief--embedded'),
    'problemBrief must support embedding inside the review stage.'
  )
}

function checkReplaceKeyInPlace() {
  const src = fs.readFileSync(path.join(root, 'src', 'core', 'shell', 'course-container.js'), 'utf8')
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
  const host = fs.readFileSync(path.join(root, 'src', 'core', 'shell', 'container-host.js'), 'utf8')
  assert(
    !host.includes('sideEffectStepIds'),
    'sideEffect must not clear all sideEffectStepIds (preserves accumulated push)'
  )
}

function checkFigureTextNormalize() {
  // package.json type:module 下 require 拿不到 module.exports，UMD 挂在 globalThis
  require(path.join(root, 'src', 'figures', 'jxg-kit-2d.js'))
  const kit = globalThis.JXGKit2D
  const n = kit && kit.normalizeFigureText
  assert(typeof n === 'function', 'JXGKit2D.normalizeFigureText missing')
  const cases = [
    ['$\\frac{1}{2}$', true, '\\frac{1}{2}'],
    ['$$a^2$$', true, 'a^2'],
    ['\\sqrt{2}', true, '\\sqrt{2}'],
    ['△ABD', false, '△ABD'],
    ['cm²', false, 'cm²'],
    ['A', false, 'A']
  ]
  for (const [input, useKatex, text] of cases) {
    const got = n(input)
    assert(
      got.useKatex === useKatex && got.text === text,
      `normalizeFigureText(${JSON.stringify(input)}) => ${JSON.stringify(got)}`
    )
  }
  assert(
    kit.texFractionToPlain('\\frac{1}{2}') === '1/2',
    'texFractionToPlain must convert \\frac{a}{b}'
  )
  assert(typeof kit.createBoardLabel === 'function', 'JXGKit2D.createBoardLabel missing')
  const loader = fs.readFileSync(path.join(root, 'src', 'figures', 'jxg-loader.js'), 'utf8')
  assert(loader.includes('useKatex = false'), 'jxg-loader must default useKatex off globally')
}

function main() {
  fs.rmSync(courseDir, { recursive: true, force: true })
  copyDirectory(fixture, courseDir)
  try {
    checkEngineBoundary()
    checkEngineManifest()
    checkReferenceBoundary()
    checkSharedPresentationTheme()
    checkReplaceKeyInPlace()
    checkFigureTextNormalize()
    assert(fs.existsSync(path.join(root, 'vendor', 'katex', 'katex.min.js')), 'KaTeX vendor missing.')
    assert(fs.existsSync(path.join(root, 'vendor', 'konva', 'konva.min.js')), 'Konva vendor missing.')
    assert(
      fs.existsSync(path.join(root, 'vendor', 'jsxgraph', 'jsxgraphcore.js')),
      'JSXGraph vendor missing.'
    )
    assert(
      fs.existsSync(path.join(root, 'vendor', 'jsxgraph', 'jsxgraph.css')),
      'JSXGraph CSS vendor missing.'
    )

    run(process.execPath, ['tools/aiclass.mjs', 'course:check', fixtureCourseId])
    const generated = path.join(courseDir, '.generated')
    const generatedModule = fs.readFileSync(
      path.join(generated, 'lesson', 'modules', '01-problem-a.js'),
      'utf8'
    )
    assert(generatedModule.includes('"actions"'), 'Generated module drops figure actions.')
    assert(generatedModule.includes('"animate": true'), 'Generated animated figure is not marked for playback.')
    assert(generatedModule.includes('"label": "例"'), 'Generated example label is not normalized.')
    assert(
      generatedModule.includes('"source": "（合成测试来源）"'),
      'Generated module drops the real source.'
    )
    assert(
      generatedModule.includes('"guidanceLayout": "interleaved"'),
      'Generated left-right guidance must default to interleaved.'
    )
    assert(
      generatedModule.includes('"quickQALayout": "above-body"') &&
        generatedModule.includes('"id": "qa-a"') &&
        generatedModule.includes('"id": "qa-c"'),
      'Generated example must keep its 3–5 top quickQA items.'
    )
    assert(
      generatedModule.includes('"problemBrief"') &&
        generatedModule.includes('"ask": "验证例题模块"') &&
        generatedModule.includes('"known": 1'),
      'Generated module drops the fixed problemBrief.'
    )
    const practiceModule = fs.readFileSync(
      path.join(generated, 'lesson', 'modules', '02-problem-b.js'),
      'utf8'
    )
    const homeworkModule = fs.readFileSync(
      path.join(generated, 'lesson', 'modules', '03-problem-c.js'),
      'utf8'
    )
    assert(practiceModule.includes('"label": "练"'), 'Generated practice label is not 练.')
    assert(homeworkModule.includes('"label": "作业"'), 'Generated homework label is not 作业.')
    const firstHash = hashTree(generated)
    run(process.execPath, ['tools/aiclass.mjs', 'lesson:generate', fixtureCourseId])
    assert(hashTree(generated) === firstHash, 'Generator output is not deterministic.')

    run(process.execPath, ['tools/aiclass.mjs', 'course:export', fixtureCourseId, '--zip'])
    const exported = path.join(root, 'dist', fixtureCourseId)
    const catalog = JSON.parse(fs.readFileSync(path.join(exported, 'action-catalog.json'), 'utf8'))
    assert(catalog.some((item) => item.name === '测试_开始'), 'Generated catalog misses start action.')
    assert(catalog.some((item) => item.name === '测试_步骤01'), 'Generated catalog misses side effect.')
    assert(catalog.some((item) => item.name === '测试_快问快答_打开'), 'Generated catalog misses quickQA open action.')
    assert(catalog.some((item) => item.name === '测试_快问快答3_显示问题'), 'Generated catalog misses third quickQA question action.')
    assert(fs.existsSync(path.join(exported, 'debug', 'parent-shell', 'parent-shell.css')), 'Debug shell CSS missing.')
    assert(fs.existsSync(path.join(exported, 'debug', 'parent-shell', 'parent-shell.js')), 'Debug shell JS missing.')

    const index = fs.readFileSync(path.join(exported, 'index.html'), 'utf8')
    assert(!index.includes('__COURSE_TITLE__'), 'Course title placeholder leaked into export.')
    assert(!index.includes('__ACTION_CATALOG_JSON__'), 'Catalog placeholder leaked into export.')
    assert(!index.includes('__RUNTIME_CONFIG_JSON__'), 'Runtime config placeholder leaked into export.')
    assert(!index.includes('AICLASS_REFERENCE_ONLY'), 'Reference content leaked into export.')
    assert(!index.includes('REFERENCE_ONLY_DO_NOT_COPY'), 'Reference sentinel leaked into export.')
    assert(fs.existsSync(path.join(exported, 'authoring-snapshot', 'problem-a', 'plan.json')), 'Authoring snapshot missing.')
    assert(fs.existsSync(path.join(exported, 'framework-source', 'tools', 'aiclass.mjs')), 'Generator source missing.')
    assert(fs.existsSync(path.join(exported, 'framework-source', 'schemas', 'course.schema.json')), 'Schema source missing.')
    assert(fs.existsSync(path.join(exported, 'course-source', fixtureCourseId, 'course.json')), 'Course source missing.')
    assert(fs.existsSync(path.join(root, 'artifacts', `${fixtureCourseId}-0.1.0-source.zip`)), 'Source ZIP missing.')

    for (const rel of walk(exported, (name) => /\.(?:js|json|html|css|md)$/.test(name))) {
      if (rel.replaceAll('\\', '/') === 'framework-source/tools/aiclass.mjs') continue
      const text = fs.readFileSync(path.join(exported, rel), 'utf8')
      assert(!text.includes('REFERENCE_ONLY_DO_NOT_COPY'), `Reference sentinel leaked into ${rel}.`)
    }

    validateJson(
      path.join(exported, 'course.lock.json'),
      path.join(root, 'schemas', 'course-lock.schema.json')
    )
    run(process.execPath, ['tests/course-id-from-md.mjs'])
    run(process.execPath, ['tests/pipeline-board.test.mjs'])
    run(process.execPath, ['scripts/smoke-test.mjs'], { cwd: exported })
    console.log('All framework tests passed.')
  } finally {
    fs.rmSync(courseDir, { recursive: true, force: true })
  }
}

main()

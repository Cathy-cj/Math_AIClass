// AIClass（全功能，含图形/problemBrief）引擎测试薄壳。
// 公共检查（boundary/manifest/reference/主题不变量/replaceKey/键盘/提交协议/e2e 流水线）在
// shared/engine/tests/common.mjs，本文件只保留 AIClass 产品专属断言。
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { assert, createContext, runStaticChecks, runPipeline } from '../../../shared/engine/tests/common.mjs'

const require = createRequire(import.meta.url)
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ctx = createContext(root)

// 图形主题：problemBrief 渐进组件 + 白板图舞台 + guide-chain 链（AIClass 专属，text/calc 用 guide-track）。
function checkFigureTheme() {
  const engineCss = fs.readFileSync(path.join(root, 'src', 'styles', 'engine.css'), 'utf8')
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
    problemBrief.includes('createProblemBrief') && problemBrief.includes('setProblemBriefState'),
    'Shared progressive problemBrief component is missing.'
  )
  const problemBriefCss = fs.readFileSync(path.join(root, 'src', 'styles', 'problem-brief.css'), 'utf8')
  assert(
    problemBriefCss.includes('.cc-problem-brief--embedded'),
    'problemBrief must support embedding inside the review stage.'
  )
}

// host 就地改写语义：interleaved 累积保留 + top-split 清空分支（AIClass 与 calc 一致，text 用 !sideEffectStepIds）。
function checkHostAccumulate() {
  const host = fs.readFileSync(path.join(root, 'src', 'core', 'shell', 'container-host.js'), 'utf8')
  assert(
    host.includes('isInterleavedAccumulate'),
    'accumulate path must preserve accumulated push (clear own step only)'
  )
  assert(
    host.includes("container.layout === 'top-split'"),
    'container-host must branch top-split clearing semantics'
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
  runStaticChecks(ctx)
  checkFigureTheme()
  checkHostAccumulate()
  checkFigureTextNormalize()
  runPipeline(ctx, {
    onExampleModule: function (module) {
      assert(module.includes('"actions"'), 'Generated module drops figure actions.')
      assert(module.includes('"animate": true'), 'Generated animated figure is not marked for playback.')
      assert(
        module.includes('"guidanceLayout": "interleaved"'),
        'Generated left-right guidance must default to interleaved.'
      )
      assert(
        module.includes('"problemBrief"') &&
          module.includes('"ask": "验证例题模块"') &&
          module.includes('"known": 1'),
        'Generated module drops the fixed problemBrief.'
      )
    },
    extraVendor: ['jsxgraph/jsxgraphcore.js', 'jsxgraph/jsxgraph.css']
  })
}

main()

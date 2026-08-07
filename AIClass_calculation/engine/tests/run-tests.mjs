// AIClass_calculation（纯计算题）引擎测试薄壳。
// 公共检查（boundary/manifest/reference/主题不变量/replaceKey/键盘/提交协议/e2e 流水线）在
// shared/engine/tests/common.mjs，本文件只保留计算产品专属断言。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, createContext, runStaticChecks, runPipeline } from '../../../shared/engine/tests/common.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ctx = createContext(root)

// 计算主题：guide-track 链、无 problemBrief、清除旧文字标记、calc 要点/钉/最终答案。
function checkCalcTheme() {
  const engineCss = fs.readFileSync(path.join(root, 'src', 'styles', 'engine.css'), 'utf8')
  assert(
    !engineCss.includes('problem-brief.css'),
    'calculation engine must not load problem-brief.css'
  )
  assert(
    !fs.existsSync(path.join(root, 'src', 'components', 'problem-brief.js')),
    'calculation engine must not ship problem-brief component'
  )
  const presentation = fs.readFileSync(path.join(root, 'src', 'styles', 'course-presentation.css'), 'utf8')
  assert(
    presentation.includes('.cc-guide-track') &&
      presentation.includes('.cc-guide-dot') &&
      presentation.includes('.cc-guide-stem'),
    'Shared theme must bind guide dot/stem in .cc-guide-track.'
  )
  assert(
    presentation.includes('.cc-guide-slot'),
    'Shared theme missing guide slot styles.'
  )
  assert(
    !fs.existsSync(path.join(root, 'src', 'styles', 'text-explain.css')) &&
      !engineCss.includes('text-explain.css'),
    'legacy text-only marks (tx-*) must be purged from the calculation engine'
  )
  const calcExplain = fs.readFileSync(path.join(root, 'src', 'styles', 'calc-explain.css'), 'utf8')
  assert(
    calcExplain.includes('calc-label--key') &&
      calcExplain.includes('calc-key-pin') &&
      calcExplain.includes('calc-answer--final'),
    'calc marks must support 要点/右栏钉/最终答案 (module_template 讲法).'
  )
}

// top-split 布局语义：清空分支、双布局、拍照答案挂左栏滚动。
function checkCalcLayout() {
  const host = fs.readFileSync(path.join(root, 'src', 'core', 'shell', 'container-host.js'), 'utf8')
  assert(
    host.includes("container.layout === 'top-split'"),
    'container-host must branch top-split clearing semantics (module_template 讲法)'
  )
  assert(
    host.includes('isInterleavedAccumulate'),
    'accumulate path must preserve accumulated push (clear own step only)'
  )
  const courseContainer = fs.readFileSync(path.join(root, 'src', 'core', 'shell', 'course-container.js'), 'utf8')
  assert(
    courseContainer.includes("'top-split'") && courseContainer.includes("'left-right'"),
    'CourseContainer LAYOUTS must allow top-split and left-right (not text-only only)'
  )
  assert(
    courseContainer.includes("return this.scrollLeftEl || this.scrollEl"),
    'Photo answer must mount in the calculation top-split left scroll.'
  )
  const submit = fs.readFileSync(path.join(root, 'src', 'bridge', 'courseware-submit.js'), 'utf8')
  assert(
    submit.includes('course_photo') && submit.includes('course_choice'),
    'Interaction submit must use normalized protocol kinds.'
  )
}

function main() {
  runStaticChecks(ctx)
  checkCalcTheme()
  checkCalcLayout()
  runPipeline(ctx, {
    onExampleModule: function (module) {
      assert(
        module.includes('"layout": "top-split"') &&
          !/"guidanceChain"\s*:/.test(module) &&
          !/"group"\s*:/.test(module),
        'Generated module must use top-split and omit legacy guidance fields.'
      )
      assert(
        module.includes('calc-label calc-label--key') &&
          module.includes('"tag": "【要点】"') &&
          module.includes('calc-key-pin') &&
          !/"problemBrief"\s*:/.test(module),
        'Generated top-split module must use calc 要点/钉住 marks and omit problemBrief.'
      )
    },
    extraSubTests: ['tests/calc-tex-split.test.mjs']
  })
}

main()

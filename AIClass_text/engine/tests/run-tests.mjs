// AIClass_text（纯文字题）引擎测试薄壳。
// 公共检查（boundary/manifest/reference/主题不变量/replaceKey/键盘/提交协议/e2e 流水线）在
// shared/engine/tests/common.mjs，本文件只保留纯文字产品专属断言。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, createContext, runStaticChecks, runPipeline } from '../../../shared/engine/tests/common.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ctx = createContext(root)

// 纯文字主题：guide-track 链、无 problemBrief、文字标记（tx-*）、lesson.css 契约。
function checkTextTheme() {
  const engineCss = fs.readFileSync(path.join(root, 'src', 'styles', 'engine.css'), 'utf8')
  assert(
    !engineCss.includes('problem-brief.css'),
    'text-only engine must not load problem-brief.css'
  )
  assert(
    !fs.existsSync(path.join(root, 'src', 'components', 'problem-brief.js')),
    'text-only engine must not ship problem-brief component'
  )
  const presentation = fs.readFileSync(path.join(root, 'src', 'styles', 'course-presentation.css'), 'utf8')
  assert(
    presentation.includes('.cc-guide-track') &&
      presentation.includes('.cc-guide-dot') &&
      presentation.includes('.cc-guide-stem'),
    'Shared theme must bind guide dot/stem in .cc-guide-track.'
  )
  assert(
    !presentation.includes('.cc-guide-panel.cc-guide-panel--has-rail::before'),
    'Panel-level guide rail pseudo-element is retired; use .cc-guide-track.'
  )
  assert(
    presentation.includes('.cc-guide-slot'),
    'Shared theme missing text-only guide slot styles.'
  )
  assert(
    /--cc-guide-rail-x:\s*calc\(/.test(presentation),
    'Guide rail X must be derived from --cc-guide-dot-* tokens.'
  )
  assert(
    !/--cc-guide-rail-x:\s*\d+px/.test(presentation),
    'Guide rail X must not be a hardcoded pixel value (causes chain misalignment).'
  )
  const courseLessonCss = fs.readFileSync(
    path.join(root, 'templates', 'course', 'lesson', 'styles', 'lesson.css'),
    'utf8'
  )
  assert(
    courseLessonCss.includes('.cc-guide-track') &&
      courseLessonCss.includes('禁止在本文件写死 --cc-guide-rail-x'),
    'Course lesson.css template must document guide-track binding contract.'
  )
  assert(
    !/--cc-guide-rail-x:\s*\d+px/.test(courseLessonCss),
    'Course lesson.css template must not hardcode --cc-guide-rail-x.'
  )
  const textExplain = fs.readFileSync(path.join(root, 'src', 'styles', 'text-explain.css'), 'utf8')
  assert(
    textExplain.includes('tx-stem-mark--lit') &&
      textExplain.includes('tx-stem-mark--em') &&
      textExplain.includes('--marker-yellow-bg'),
    'text-only marks must support stem red (--lit) and explain yellow (--em).'
  )
  const containerRuntime = fs.readFileSync(
    path.join(root, 'src', 'core', 'shell', 'course-container.js'),
    'utf8'
  )
  assert(
    containerRuntime.includes('renderGuideTrack') &&
      containerRuntime.includes('_syncGuideRailEnds') &&
      !containerRuntime.includes('_updateGuideRailHeight'),
    'Guide chain must mount .cc-guide-track and sync is-rail-end (no geometry measuring).'
  )
}

// host 就地改写语义：sideEffect 不得清空全部 sideEffectStepIds（保留累积 push）。
function checkHostSideEffect() {
  const host = fs.readFileSync(path.join(root, 'src', 'core', 'shell', 'container-host.js'), 'utf8')
  assert(
    !host.includes('sideEffectStepIds'),
    'sideEffect must not clear all sideEffectStepIds (preserves accumulated push)'
  )
}

function main() {
  runStaticChecks(ctx)
  checkTextTheme()
  checkHostSideEffect()
  runPipeline(ctx, {
    onExampleModule: function (module) {
      assert(
        module.includes('"guidanceLayout": "interleaved"'),
        'Generated text-only guidance must default to interleaved.'
      )
      assert(
        module.includes('"tag": "已知"') &&
          module.includes('"tag": "求"') &&
          module.includes('"lead": "验证例题模块"') &&
          !/"problemBrief"\s*:/.test(module),
        'Generated text-only module must use section 已知/求 and omit problemBrief.'
      )
    }
  })
}

main()

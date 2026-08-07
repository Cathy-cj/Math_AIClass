import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import { distDir } from './dist-path.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
let exported = distDir(root, 'fixture-minimal')

if (!exported || !fs.existsSync(path.join(exported, 'index.html'))) {
  const result = spawnSync(process.execPath, ['tests/run-tests.mjs'], {
    cwd: root,
    encoding: 'utf8'
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
  exported = distDir(root, 'fixture-minimal')
}

const launchOptions = process.platform === 'win32'
  ? { channel: 'msedge', headless: true }
  : { headless: true }
const browser = await chromium.launch(launchOptions)
const page = await browser.newPage()
const errors = []
const networkRequests = []

page.on('pageerror', (error) => errors.push(String(error)))
page.on('request', (request) => {
  if (/^https?:/i.test(request.url())) networkRequests.push(request.url())
})

await page.goto(pathToFileURL(path.join(exported, 'index.html')).href, {
  waitUntil: 'domcontentloaded',
  timeout: 15000
})
await page.waitForFunction(() => window.AIClassMessageBridge && window.__courseScheduler, null, {
  timeout: 10000
})

const result = await page.evaluate(async () => {
  window._frameworkLog = []
  window.__onCourseMessage = (payload) => window._frameworkLog.push(payload)

  window.AIClassMessageBridge.handleMessage({ data: { action: '测试_开始' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '测试_步骤01' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '测试练_开始' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '测试练_步骤01' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '测试练_作答_拍照' } })
  var logCountBeforePhotoResult = window._frameworkLog.length
  var photoButton = document.querySelector('.cc-photo-answer-button')
  if (photoButton) photoButton.click()
  window.AIClassMessageBridge.handleMessage({
    data: {
      type: 'photo_result',
      value: '识别到：$x=3$，验算：$$2x+1=7$$'
    }
  })
  await new Promise((resolve) => setTimeout(resolve, 250))
  var photoCards = document.querySelectorAll('.cc-photo-answer')
  var photoCard = photoCards[0]
  var targetStack = photoCard && photoCard.parentElement
  var cardInRightStack = !!(
    photoCard &&
    photoCard.closest &&
    photoCard.closest('.course-scroll-stack')
  )
  var guide = targetStack && targetStack.querySelector('.cc-guide-panel, .cc-guide-section')
  var cardBeforeGuide = !guide || !!(photoCard.compareDocumentPosition &&
    (photoCard.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING))
  var brief = photoCard && photoCard.parentElement &&
    photoCard.parentElement.querySelector('.cc-problem-brief')
  var cardAfterBrief = !brief || !!(photoCard && brief.parentElement === photoCard.parentElement &&
    (brief.compareDocumentPosition(photoCard) & Node.DOCUMENT_POSITION_FOLLOWING))
  var photoLogs = window._frameworkLog.slice(logCountBeforePhotoResult)
  var submissions = {
    choice: window.AIClassCoursewareSubmit.buildUserSubmitted('choice', {}, 'A'),
    fill: window.AIClassCoursewareSubmit.buildUserSubmitted('fill', {}, 'x'),
    voice: window.AIClassCoursewareSubmit.buildUserSubmitted('oral', {}, '口答')
  }
  var logCountBeforeFallbackSubmit = window._frameworkLog.length
  window.AIClassCoursewareSubmit = null
  window.AIClassSubmitText.report('choice', 'A')
  var fallbackSubmitLogs = window._frameworkLog.slice(logCountBeforeFallbackSubmit)
  var longFormulaField = window.AIClassComponent.createLatexMathfield({ enabled: true })
  longFormulaField.style.width = '180px'
  document.body.appendChild(longFormulaField)
  var longFormula = '123456789+987654321+555555555+444444444+333333333'
  longFormulaField.setValue(longFormula)
  longFormulaField.dispatchEvent(new Event('input', { bubbles: true }))
  await new Promise((resolve) => setTimeout(resolve, 250))
  var formulaContent = longFormulaField.shadowRoot.querySelector('.ML__content')
  var longFormulaWraps = /^\\displaylines\{/.test(longFormulaField.getValue('latex'))
  var longFormulaFits = formulaContent.scrollWidth <= formulaContent.clientWidth + 1
  var longFormulaSubmitted = window.AIClassComponent.getLatexValue(longFormulaField)

  return {
    log: window._frameworkLog.slice(),
    hasFigure: !!document.querySelector('[data-figure-state], svg'),
    hasChoice: !!document.querySelector('.aic-choice-option, [data-value="A"]'),
    bodyText: document.body.innerText,
    photoCardCount: photoCards.length,
    photoText: photoCard && photoCard.textContent,
    photoHasLatex: !!(photoCard && photoCard.querySelector('.katex')),
    photoCardInRightStack: cardInRightStack,
    photoCardAfterBrief: cardAfterBrief,
    photoCardBeforeGuide: cardBeforeGuide,
    photoLogs: photoLogs,
    fallbackSubmitLogs: fallbackSubmitLogs,
    submissions: submissions,
    longFormulaWraps: longFormulaWraps,
    longFormulaFits: longFormulaFits,
    longFormulaSubmitted: longFormulaSubmitted
  }
})

await browser.close()

if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`)
const unexpectedRequests = networkRequests.filter(
  (url) => !url.startsWith('https://cdn.jsdmirror.com/npm/mathlive@0.110.0/')
)
if (unexpectedRequests.length) throw new Error(`Unexpected network requests:\n${unexpectedRequests.join('\n')}`)
if (!result.log.some((item) => item.type === 'step_ok')) throw new Error('Start action did not emit step_ok.')
if (!result.log.some((item) => item.type === 'side_effect_ok')) throw new Error('Side effect did not emit side_effect_ok.')
if (!result.hasFigure) throw new Error('Synthetic Figure was not mounted.')
if (!result.hasChoice) throw new Error('Synthetic choice was not rendered.')
if (!result.bodyText.includes('合成内容 A')) throw new Error('Synthetic text was not rendered.')
if (result.photoCardCount !== 1) {
  throw new Error('Photo answer action must mount one answer card.')
}
if (!result.photoText.includes('识别到')) throw new Error('Photo result did not render text.')
if (!result.photoHasLatex) throw new Error('Photo result did not render KaTeX.')
if (!result.photoCardInRightStack) {
  throw new Error('Photo result must mount in right main stack (.course-scroll-stack).')
}
if (!result.photoCardBeforeGuide) {
  throw new Error('Photo result must sit above guidance in the right main stack (.course-scroll-stack).')
}
if (!result.photoLogs.some((item) =>
  item.type === 'user_submitted' &&
  item.kind === 'course_photo' &&
  Object.keys(item).sort().join(',') === 'kind,type'
)) {
  throw new Error('Photo button did not emit a bare course_photo submission.')
}
if (!result.photoLogs.some((item) => item.type === 'answer_result_shown')) {
  throw new Error('Photo result did not emit answer_result_shown.')
}
if (result.photoLogs.some((item) => item.type === 'step_ok')) {
  throw new Error('Photo result must not advance a step.')
}
if (!result.fallbackSubmitLogs.some((item) =>
  item.type === 'user_submitted' &&
  item.kind === 'course_choice' &&
  item.value === 'A' &&
  Object.keys(item).sort().join(',') === 'kind,type,value'
)) {
  throw new Error('Fallback interaction submit did not use the normalized protocol kind.')
}
if (!result.longFormulaWraps || !result.longFormulaFits) {
  throw new Error('Long formula did not automatically wrap within the input bounds.')
}
if (result.longFormulaSubmitted !== '123456789+987654321+555555555+444444444+333333333') {
  throw new Error('Auto-wrapped formula did not normalize to the original submission value.')
}
for (const [kind, payload] of Object.entries(result.submissions)) {
  if (Object.keys(payload).sort().join(',') !== 'kind,value') {
    throw new Error(`${kind} submission must only contain kind and value.`)
  }
}
if (result.submissions.choice.kind !== 'course_choice' ||
    result.submissions.fill.kind !== 'course_fill' ||
    result.submissions.voice.kind !== 'voice') {
  throw new Error('Interaction submission kinds are not normalized.')
}

console.log('Browser smoke test passed.')

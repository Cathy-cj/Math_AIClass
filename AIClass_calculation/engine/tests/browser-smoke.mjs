import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const exported = path.join(root, 'dist', 'fixture-minimal')

if (!fs.existsSync(path.join(exported, 'index.html'))) {
  const result = spawnSync(process.execPath, ['tests/run-tests.mjs'], {
    cwd: root,
    encoding: 'utf8'
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout)
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
  var cardIsFirst = !!(photoCard && targetStack && targetStack.firstElementChild === photoCard)
  var cardInLeftScroll = !!(
    photoCard &&
    photoCard.closest &&
    photoCard.closest('.course-scroll-left')
  )
  var logAfterPhotoResult = window._frameworkLog.slice(logCountBeforePhotoResult)
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
    photoCardIsFirst: cardIsFirst,
    photoCardInLeftScroll: cardInLeftScroll,
    photoLogs: logAfterPhotoResult,
    fallbackSubmitLogs: fallbackSubmitLogs,
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
if (!result.photoCardIsFirst) throw new Error('Photo result is not at the target scroll area top.')
if (!result.photoCardInLeftScroll) {
  throw new Error('Photo answer must mount in the calculation left explanation scroll.')
}
if (!result.photoLogs.some((item) =>
  item.type === 'user_submitted' &&
  item.kind === 'course_photo' &&
  Object.keys(item).sort().join(',') === 'kind,type'
)) {
  throw new Error('Photo button did not emit course_photo.')
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

console.log('Browser smoke test passed.')

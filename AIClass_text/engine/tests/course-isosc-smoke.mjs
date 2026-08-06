// 验收 smoke：isosceles-triangle 课件 debug 页全 action 走查 + iframe 渲染检查
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const courseId = 'isosceles-triangle'
const exported = path.join(root, 'dist', courseId)
const debugHtml = path.join(exported, 'debug', 'parent-shell', 'index.html')

if (!path.basename(path.dirname(debugHtml)) === 'parent-shell') {
  throw new Error(`Unexpected debug shell path: ${debugHtml}`)
}
if (!path.basename(debugHtml) === 'index.html') {
  throw new Error(`Debug shell index missing: ${debugHtml}`)
}

const launchOptions = process.platform === 'win32'
  ? { channel: 'msedge', headless: true }
  : { headless: true }
const browser = await chromium.launch(launchOptions)
const page = await browser.newPage()
const errors = []
const pageLogs = []

page.on('pageerror', (error) => errors.push(`[pageerror] ${String(error)}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') pageLogs.push(`[console.error] ${msg.text()}`)
})

await page.goto(pathToFileURL(debugHtml).href, {
  waitUntil: 'domcontentloaded',
  timeout: 20000
})

// 等待 help 目录就绪
await page.evaluate(() => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Timed out waiting for help catalog.')), 15000)
  window.addEventListener('message', function onMessage(event) {
    const data = event.data || {}
    if (data.type !== 'help') return
    clearTimeout(timer)
    window.removeEventListener('message', onMessage)
    resolve()
  })
}))

const names = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.action-btn .name')).map((el) => el.textContent.trim())
)

if (!names.length) throw new Error('No actions found in debug catalog.')
if (!names.some((n) => n === '例1_开始')) throw new Error('Missing opening action 例1_开始.')
if (!names.some((n) => n.includes('快问快答'))) throw new Error('Missing quickQA actions.')
if (!names.some((n) => n.includes('步骤20'))) throw new Error('Missing final step action.')

// 跳过系统动作（清空课件/快问快答关闭/概念页），只播放课件动作
const SYSTEM_ACTIONS = new Set(['清空课件', '快问快答_关闭', 'concept-sheet:close'])
const playable = names.filter((n) => !SYSTEM_ACTIONS.has(n))
if (playable.length < 30) throw new Error(`Expected >=30 playable actions, got ${playable.length}.`)

// 逐 action 播放（快问快答放最后批量验证）
const playback = []
for (const name of playable) {
  const clicked = await page.evaluate((actionName) => {
    const btn = Array.from(document.querySelectorAll('.action-btn'))
      .find((el) => (el.querySelector('.name') || el).textContent.trim() === actionName)
    if (!btn) return false
    btn.click()
    return true
  }, name)
  if (!clicked) throw new Error(`Cannot click action: ${name}`)
  await page.waitForTimeout(180)
  playback.push(name)
}

// iframe 渲染检查
const frame = page.frames().find((f) => f !== page.mainFrame())
if (!frame) throw new Error('Course iframe not found.')

const render = await frame.evaluate(() => {
  const q = (sel) => document.querySelectorAll(sel).length
  return {
    stem: q('.tx-stem'),
    stemMarks: q('.tx-stem-mark'),
    katex: q('.katex'),
    sections: q('.lf-section'),
    sectionKnown: q('.lf-section-tag--known'),
    sectionAsk: q('.lf-section-tag--ask'),
    oralCards: q('.aic-oral-card'),
    choiceCards: q('.aic-choice-card'),
    fillInputs: q('.lf-fill-input'),
    guideSlots: q('.cc-guide-slot:not(.is-hidden)'),
    finalAnswer: q('.tx-label--answer'),
    currentStep: document.querySelector('.lf-block[data-is-current-step="true"]') != null
  }
})

await browser.close()

if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`)
if (pageLogs.length) throw new Error(`Console errors:\n${pageLogs.join('\n')}`)
if (render.stem < 1) throw new Error('Stem (tx-stem) not rendered.')
if (render.katex < 1) throw new Error('KaTeX did not render any formula.')
if (render.sectionKnown < 1 || render.sectionAsk < 1) throw new Error('审题 section 已知/求 missing.')
if (render.oralCards < 1 || render.choiceCards < 1 || render.fillInputs < 1) {
  throw new Error('Interaction widgets missing (oral/choice/fill).')
}
if (render.finalAnswer < 1) throw new Error('Final answer block (tx-label--answer) missing.')
if (render.guideSlots < 1) throw new Error('No guide slot rendered.')

console.log(JSON.stringify({
  courseId,
  played: playback.length,
  render,
  ok: true
}, null, 2))

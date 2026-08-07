import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { distDir } from './dist-path.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const exported = distDir(root, '8-1-mix')
if (!exported || !fs.existsSync(path.join(exported, 'index.html'))) {
  console.error('dist/8/8-1-mix missing — run course:export first')
  process.exit(1)
}

const launchOptions = process.platform === 'win32'
  ? { channel: 'msedge', headless: true }
  : { headless: true }
const browser = await chromium.launch(launchOptions)
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []

page.on('pageerror', (error) => errors.push(String(error)))

await page.goto(pathToFileURL(path.join(exported, 'index.html')).href, {
  waitUntil: 'domcontentloaded',
  timeout: 20000
})
await page.waitForFunction(() => window.AIClassMessageBridge && window.__courseScheduler, null, {
  timeout: 15000
})

// Drive both problems: 角例一 (top-split) then 角练一 (text-only)
await page.evaluate(() => {
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_开始' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_要点_起' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_要点_条' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_详解_起' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_详解_步1' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_详解_步2' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_详解_步3' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_详解_步4' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角例一_答案' } })
})
await page.waitForTimeout(600)

const ex1 = await page.evaluate(() => {
  const containers = document.querySelectorAll('.course-container')
  const results = []
  containers.forEach((el) => {
    results.push({
      layout: el.getAttribute('data-layout'),
      hasSplitLeft: !!el.querySelector('.course-split-left'),
      hasSplitRight: !!el.querySelector('.course-split-right'),
      calcEq: !!el.querySelector('.calc-eq'),
      calcSolve: el.querySelectorAll('.calc-solve-step').length,
      calcAnswer: !!el.querySelector('.calc-answer--final'),
      calcKeyPin: !!el.querySelector('.calc-key-pin'),
      katexRendered: el.querySelectorAll('.katex').length
    })
  })
  return results
})

// Now drive 角练一 (text-only)
await page.evaluate(() => {
  window.AIClassMessageBridge.handleMessage({ data: { action: '角练一_开始' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角练一_步骤一_展_直角条件' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角练一_步骤二_展_倍数条件' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '角练一_步骤三_展_明确所求' } })
})
await page.waitForTimeout(500)

const pr1 = await page.evaluate(() => {
  const containers = document.querySelectorAll('.course-container')
  const results = []
  containers.forEach((el) => {
    results.push({
      layout: el.getAttribute('data-layout'),
      hasGuidePanel: !!el.querySelector('.cc-guide-panel'),
      hasProblemBrief: !!el.querySelector('.cc-problem-brief'),
      katexRendered: el.querySelectorAll('.katex').length,
      textBlocks: el.querySelectorAll('.lf-block').length
    })
  })
  return results
})

console.log('=== 角例一 (top-split) containers ===')
console.log(JSON.stringify(ex1, null, 1))
console.log('=== 角练一 (text-only) containers ===')
console.log(JSON.stringify(pr1, null, 1))
console.log('=== page errors ===')
console.log(errors.length ? errors.join('\n') : '(none)')

const topSplitOk = ex1.some((c) => c.layout === 'top-split' && c.hasSplitLeft && c.hasSplitRight && c.calcEq && c.calcSolve > 0 && c.calcAnswer && c.katexRendered > 0)
const textOk = pr1.some((c) => c.layout === 'left-right' && c.hasGuidePanel && c.hasProblemBrief && c.katexRendered > 0)
console.log(topSplitOk && textOk && errors.length === 0 ? 'MIXED RENDER OK' : 'MIXED RENDER FAILED')

await browser.close()

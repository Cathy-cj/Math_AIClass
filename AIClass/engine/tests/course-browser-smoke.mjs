import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import { distDir } from '../../../shared/engine/tests/dist-path.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const [courseId, actionPrefix, expectedText, expectedState] = process.argv.slice(2)

if (!courseId || !actionPrefix || !expectedText || !expectedState) {
  throw new Error(
    'Use: node tests/course-browser-smoke.mjs <courseId> <actionPrefix> <expectedText> <expectedState>'
  )
}

const generated = spawnSync(process.execPath, ['tools/aiclass.mjs', 'course:export', courseId], {
  cwd: root,
  encoding: 'utf8'
})
if (generated.status !== 0) throw new Error(generated.stderr || generated.stdout)

const exported = distDir(root, courseId)
if (!exported) throw new Error(`No course.json for ${courseId} — cannot resolve dist path`)
const catalog = JSON.parse(fs.readFileSync(path.join(exported, 'course', 'runtime', 'action-catalog.json'), 'utf8'))
const actions = catalog
  .map((item) => item.name)
  .filter((name) => name.startsWith(actionPrefix) && !name.includes('快问快答'))

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

const result = await page.evaluate(async ({ actions }) => {
  window._courseSmokeLog = []
  window.__onCourseMessage = (payload) => window._courseSmokeLog.push(payload)
  for (const action of actions) {
    window.AIClassMessageBridge.handleMessage({ data: { action } })
    await new Promise((resolve) => setTimeout(resolve, 80))
  }
  const figure = document.querySelector('svg[data-figure-state]')
  return {
    log: window._courseSmokeLog.slice(),
    state: figure && figure.getAttribute('data-figure-state'),
    bodyText: document.body.innerText,
    computeCards: document.querySelectorAll('[data-replace-key$=":compute"]').length,
    hasLatex: !!document.querySelector('.katex')
  }
}, { actions })

await browser.close()

if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`)
if (networkRequests.length) throw new Error(`Unexpected network requests:\n${networkRequests.join('\n')}`)
if (!result.log.some((item) => item.type === 'step_ok')) throw new Error('Start action did not emit step_ok.')
if (!result.log.some((item) => item.type === 'side_effect_ok')) {
  throw new Error('Side effects did not emit side_effect_ok.')
}
if (result.state !== expectedState) {
  throw new Error(`Expected figure state ${expectedState}, received ${result.state || 'none'}.`)
}
if (!result.bodyText.includes(expectedText)) throw new Error(`Expected text not rendered: ${expectedText}`)
if (result.computeCards !== 1) throw new Error(`Expected one compute card, received ${result.computeCards}.`)
if (!result.hasLatex) throw new Error('KaTeX output was not rendered.')

console.log(`Course browser smoke passed: ${courseId}`)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const [courseId, actionPrefix, expectedText] = process.argv.slice(2)

if (!courseId || !actionPrefix || !expectedText) {
  throw new Error(
    'Use: node tests/course-browser-smoke.mjs <courseId> <actionPrefix> <expectedText>'
  )
}

const generated = spawnSync(process.execPath, ['tools/aiclass.mjs', 'course:export', courseId], {
  cwd: root,
  encoding: 'utf8'
})
if (generated.status !== 0) throw new Error(generated.stderr || generated.stdout)

const exported = path.join(root, 'dist', courseId)
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
  return {
    log: window._courseSmokeLog.slice(),
    bodyText: document.body.innerText,
    hasLatex: !!document.querySelector('.katex')
  }
}, { actions })

await browser.close()

if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`)
const unexpectedRequests = networkRequests.filter(
  (url) => !url.startsWith('https://cdn.jsdmirror.com/npm/mathlive@0.110.0/')
)
if (unexpectedRequests.length) throw new Error(`Unexpected network requests:\n${unexpectedRequests.join('\n')}`)
if (!result.log.some((item) => item.type === 'step_ok')) throw new Error('Start action did not emit step_ok.')
if (!result.log.some((item) => item.type === 'side_effect_ok')) {
  throw new Error('Side effects did not emit side_effect_ok.')
}
if (!result.bodyText.includes(expectedText)) throw new Error(`Expected text not rendered: ${expectedText}`)
if (!result.hasLatex) throw new Error('KaTeX output was not rendered.')

console.log(`Course browser smoke passed: ${courseId}`)

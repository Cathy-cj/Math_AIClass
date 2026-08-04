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

const result = await page.evaluate(() => {
  window._frameworkLog = []
  window.__onCourseMessage = (payload) => window._frameworkLog.push(payload)

  window.AIClassMessageBridge.handleMessage({ data: { action: '测试_开始' } })
  window.AIClassMessageBridge.handleMessage({ data: { action: '测试_步骤01' } })

  return {
    log: window._frameworkLog.slice(),
    hasFigure: !!document.querySelector('[data-figure-state], svg'),
    hasChoice: !!document.querySelector('.aic-choice-option, [data-value="A"]'),
    bodyText: document.body.innerText
  }
})

await browser.close()

if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`)
if (networkRequests.length) throw new Error(`Unexpected network requests:\n${networkRequests.join('\n')}`)
if (!result.log.some((item) => item.type === 'step_ok')) throw new Error('Start action did not emit step_ok.')
if (!result.log.some((item) => item.type === 'side_effect_ok')) throw new Error('Side effect did not emit side_effect_ok.')
if (!result.hasFigure) throw new Error('Synthetic Figure was not mounted.')
if (!result.hasChoice) throw new Error('Synthetic choice was not rendered.')
if (!result.bodyText.includes('合成内容 A')) throw new Error('Synthetic text was not rendered.')

console.log('Browser smoke test passed.')

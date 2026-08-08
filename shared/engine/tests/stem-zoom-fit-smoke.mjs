// 验收：短题干不应误报截断（StemExpand fit smoke）。由各引擎 package.json 传入 engine 根目录。
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { distDir } from './dist-path.mjs'

const root = path.resolve(process.argv[2] || '.')
// shared 目录没有自己的 node_modules，playwright 必须从调用方引擎的依赖树解析。
const requireEngine = createRequire(path.join(root, 'package.json'))
const { chromium } = requireEngine('playwright')
const courseId = 'fixture-minimal'
let exported = distDir(root, courseId)
let indexHtml = exported ? path.join(exported, 'index.html') : null
const OVERFLOW_SLACK_PX = 16

if (!indexHtml || !fs.existsSync(indexHtml)) {
  const result = spawnSync(process.execPath, ['tests/run-tests.mjs'], {
    cwd: root,
    encoding: 'utf8'
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'run-tests failed')
  }
  exported = distDir(root, courseId)
  indexHtml = path.join(exported, 'index.html')
}

const launchOptions = process.platform === 'win32'
  ? { channel: 'msedge', headless: true }
  : { headless: true }
const browser = await chromium.launch(launchOptions)
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(pathToFileURL(indexHtml).href, { waitUntil: 'domcontentloaded', timeout: 15000 })
await page.waitForFunction(() => window.AIClassMessageBridge && window.__courseScheduler, null, {
  timeout: 10000
})

const result = await page.evaluate(async (slackPx) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  window.AIClassMessageBridge.handleMessage({ data: { action: '测试_开始' } })
  await sleep(600)
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready
  }
  await sleep(200)
  await sleep(100)

  const top = document.querySelector('.course-scroll-top')
  const inner = top ? top.querySelector('.stem-expand-scroll') : null
  const bar = top ? top.querySelector('.stem-expand-bar') : null
  const chrome = top ? top.querySelector('.stem-expand-chrome') : null
  const scrollbar = top ? top.querySelector('.aic-overlay-scrollbar') : null

  return {
    hasStemExpand: top ? top.getAttribute('data-stem-expand') === '1' : false,
    truncated: top ? top.classList.contains('stem-expand-truncated') : false,
    fits: inner ? inner.classList.contains('stem-expand-fits') : false,
    innerOverflowY: inner ? getComputedStyle(inner).overflowY : null,
    barDisplay: bar ? getComputedStyle(bar).display : null,
    chromeDisplay: chrome ? getComputedStyle(chrome).display : null,
    overlayDisplay: scrollbar ? getComputedStyle(scrollbar).display : null,
    overflowPx: inner ? Math.max(0, inner.scrollHeight - inner.clientHeight) : null,
    innerScrollH: inner ? inner.scrollHeight : null,
    innerClientH: inner ? inner.clientHeight : null,
    initDone: top ? !top.classList.contains('stem-expand-init') : false
  }
}, OVERFLOW_SLACK_PX)

await browser.close()

if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`)
if (!result.hasStemExpand) throw new Error('fixture-minimal 应挂载 StemExpand')
if (!result.initDone) throw new Error('StemExpand init 未完成')
if (result.truncated) throw new Error('短题干不应处于 stem-expand-truncated')
if (!result.fits) throw new Error('短题干 inner 应有 stem-expand-fits')
if (result.innerOverflowY !== 'hidden') throw new Error('短题干 inner overflow-y 应为 hidden')
if (result.barDisplay !== 'none') throw new Error('短题干展开栏应隐藏')
if (result.chromeDisplay !== 'none') throw new Error('短题干 fade chrome 应隐藏')
if (result.overflowPx > OVERFLOW_SLACK_PX) {
  throw new Error(`短题干溢出 ${result.overflowPx}px 超过 slack ${OVERFLOW_SLACK_PX}px`)
}
if (result.overlayDisplay && result.overlayDisplay !== 'none') {
  throw new Error('短题干不应显示 overlay 滚动条')
}

console.log(`stem-expand fit passed: ${courseId}`)

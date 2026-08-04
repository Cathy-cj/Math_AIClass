// 验收：细线滚动条 CSS + 自动隐藏（滚动显示，1s 无滚动淡出）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const indexHtml = path.join(root, 'dist', 'isosceles-triangle', 'index.html')

// Node 侧校验细线滚动条 CSS 已进入导出产物
const scrollbarCss = fs.readFileSync(
  path.join(root, 'dist', 'isosceles-triangle', 'src', 'styles', 'scrollbar.css'),
  'utf8'
)
const engineCss = fs.readFileSync(
  path.join(root, 'dist', 'isosceles-triangle', 'src', 'styles', 'engine.css'),
  'utf8'
)
const hasCss =
  scrollbarCss.includes('::-webkit-scrollbar') &&
  scrollbarCss.includes('::-webkit-scrollbar-button') &&
  scrollbarCss.includes('.is-scrolling::-webkit-scrollbar-thumb') &&
  scrollbarCss.includes('scrollbar-width: thin') &&
  scrollbarCss.includes('scrollbar-color: transparent transparent') &&
  scrollbarCss.includes('.is-scrolling {\n  scrollbar-color:') &&
  engineCss.includes('@import "./scrollbar.css"')

const browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge', headless: true } : { headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(pathToFileURL(indexHtml).href, { waitUntil: 'domcontentloaded', timeout: 15000 })
await page.waitForFunction(() => window.AIClassMessageBridge && window.__courseScheduler, null, { timeout: 10000 })

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  window.AIClassMessageBridge.handleMessage({ data: { action: '例1_开始' } })
  await sleep(400)

  const top = document.querySelector('.course-scroll-top')
  const inner = top ? top.querySelector('.stem-expand-scroll') : null
  const scrollEl = inner || top
  const scrollable = scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 1
  const before = { scrollable, hasClass: scrollEl ? scrollEl.classList.contains('is-scrolling') : false }

  if (!scrollEl || !scrollable) {
    return { scrollable: false, skipped: true }
  }

  scrollEl.scrollTop = 40
  await sleep(50)
  const afterScroll = { hasClass: scrollEl.classList.contains('is-scrolling'), scrollTop: scrollEl.scrollTop }

  await sleep(1300)
  const afterIdle = { hasClass: scrollEl.classList.contains('is-scrolling') }

  scrollEl.scrollTop = 0
  await sleep(50)
  const afterScrollAgain = { hasClass: scrollEl.classList.contains('is-scrolling') }

  return { scrollable, before, afterScroll, afterIdle, afterScrollAgain }
})

await browser.close()
console.log(JSON.stringify({ result, errors }, null, 2))

const r = result
const fail = (msg) => { throw new Error(msg) }
if (!hasCss) fail('细线滚动条 CSS 规则未加载')
if (!r.scrollable) fail('题干 inner 应为可滚动容器')
if (r.before.hasClass) fail('初始不应有 is-scrolling')
if (!r.afterScroll.hasClass) fail('滚动时应显示滚动条（is-scrolling）')
if (r.afterIdle.hasClass) fail('1s 无滚动后滚动条应淡出（移除 is-scrolling）')
if (!r.afterScrollAgain.hasClass) fail('再次滚动应重新显示滚动条')
console.log('scrollbar auto-hide passed: isosceles-triangle')

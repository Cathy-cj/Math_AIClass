// 验收：host===scrollEl 时 overlay 轨道须钉在可视区，不随 scrollTop 滚走。由各引擎 package.json 传入 engine 根目录。
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(process.argv[2] || '.')
// shared 目录没有自己的 node_modules，playwright 必须从调用方引擎的依赖树解析。
const requireEngine = createRequire(path.join(root, 'package.json'))
const { chromium } = requireEngine('playwright')
const sharedEngineRoot = path.join(root, '..', '..', 'shared', 'engine')
// shared 抽取后共享文件不在 repo src，导出时装配；测试按 repo 优先、shared 兜底解析
function resolveSrc(rel) {
  const local = path.join(root, 'src', rel)
  if (fs.existsSync(local)) return local
  return path.join(sharedEngineRoot, 'src', rel)
}
const jsPath = resolveSrc('components/overlay-scrollbar.js')
const cssPath = resolveSrc('styles/overlay-scrollbar.css')

const launchOptions = process.platform === 'win32'
  ? { channel: 'msedge', headless: true }
  : { headless: true }
const browser = await chromium.launch(launchOptions)
const page = await browser.newPage()
await page.setContent('<!doctype html><html><body></body></html>')
await page.addStyleTag({ path: cssPath })
await page.addScriptTag({ path: jsPath })

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const host = document.createElement('div')
  host.style.cssText =
    'height:200px;width:320px;overflow:auto;position:relative;margin:40px;background:#f5f5f5'
  const content = document.createElement('div')
  content.style.cssText = 'height:900px;padding:8px'
  content.textContent = 'tall content'
  host.appendChild(content)
  document.body.appendChild(host)

  if (!window.AIClassOverlayScrollbar) {
    return { ok: false, reason: 'API missing' }
  }
  window.AIClassOverlayScrollbar.attach(host, host, { contentEl: content })
  void host.offsetHeight
  await sleep(30)

  host.scrollTo(0, 240)
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  await sleep(30)
  if (host._overlayScrollbarApi) host._overlayScrollbarApi.sync()
  await new Promise((resolve) => requestAnimationFrame(resolve))

  const rail = host.querySelector('.aic-overlay-scrollbar')
  const thumb = rail && rail.querySelector('.aic-overlay-scrollbar-thumb')
  const hr = host.getBoundingClientRect()
  const rr = rail ? rail.getBoundingClientRect() : null
  const tr = thumb ? thumb.getBoundingClientRect() : null
  const railWithinHost = !!(
    rr &&
    rr.top >= hr.top - 1 &&
    rr.bottom <= hr.bottom + 1
  )
  const thumbWithinRail = !!(
    rr &&
    tr &&
    tr.top >= rr.top - 1 &&
    tr.bottom <= rr.bottom + 1
  )

  return {
    ok: true,
    st: host.scrollTop,
    sh: host.scrollHeight,
    ch: host.clientHeight,
    hostTop: hr.top,
    railTop: rr ? rr.top : null,
    railBottom: rr ? rr.bottom : null,
    hostBottom: hr.bottom,
    railDisplay: rail ? getComputedStyle(rail).display : null,
    railWithinHost,
    thumbWithinRail
  }
})

await browser.close()

function fail(msg) {
  console.error('overlay-scrollbar pin smoke FAILED:', msg)
  console.error(JSON.stringify(result, null, 2))
  process.exit(1)
}

if (!result.ok) fail(result.reason || 'setup failed')
if (result.railDisplay === 'none') fail('可滚动时轨道应显示')
if (!result.railWithinHost) {
  fail('host===scrollEl 滚动后轨道应仍在容器可视区内（不得随内容滚走）')
}
if (!result.thumbWithinRail) fail('thumb 应落在轨道内')
console.log('overlay-scrollbar pin smoke passed')

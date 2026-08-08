// 验收：引擎 StemExpand 组件（用长题干课件 dist 作 fixture，不修改课件源码）。由各引擎 package.json 传入 engine 根目录。
import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { distDir } from './dist-path.mjs'

const root = path.resolve(process.argv[2] || '.')
// shared 目录没有自己的 node_modules，playwright 必须从调用方引擎的依赖树解析。
const requireEngine = createRequire(path.join(root, 'package.json'))
const { chromium } = requireEngine('playwright')
const courseId = 'primary-meet-speed-shift'
const exported = distDir(root, courseId)
const indexHtml = exported ? path.join(exported, 'index.html') : null

if (!indexHtml || !fs.existsSync(indexHtml)) {
  console.log(`stem-expand long smoke skipped: dist/<grade>/${courseId}/index.html not found`)
  process.exit(0)
}

const browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge', headless: true } : { headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(pathToFileURL(indexHtml).href, { waitUntil: 'domcontentloaded', timeout: 15000 })
await page.waitForFunction(() => window.AIClassMessageBridge && window.__courseScheduler, null, { timeout: 10000 })

const result = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  window.AIClassMessageBridge.handleMessage({ data: { action: '例1_开始' } })
  await sleep(900)

  const top = document.querySelector('.course-scroll-top')
  const inner = top ? top.querySelector('.stem-expand-scroll') : null
  const chrome = top ? top.querySelector('.stem-expand-chrome') : null
  const fade = top ? top.querySelector('.stem-expand-fade') : null
  const scrollbar = top ? top.querySelector('.aic-overlay-scrollbar') : null
  const scrollbarThumb = scrollbar ? scrollbar.querySelector('.aic-overlay-scrollbar-thumb') : null
  const scrollMain = document.querySelector('.course-scroll-main')
  const mainScrollbar = scrollMain ? scrollMain.querySelector('.aic-overlay-scrollbar') : null
  const bar = top ? top.querySelector('.stem-expand-bar') : null
  const btn = bar ? bar.querySelector('.stem-expand-btn') : null
  const main = document.querySelector('.course-main')
  const mainOffsetTop = main ? main.offsetTop : null
  const topRect = top.getBoundingClientRect()
  const innerRect = inner ? inner.getBoundingClientRect() : null
  const btnRect = btn ? btn.getBoundingClientRect() : null
  const gapToMain = main ? main.getBoundingClientRect().top - topRect.bottom : null

  const btnRect0 = btn ? btn.getBoundingClientRect() : null
  const head = top ? top.querySelector('.course-stem-head') : null
  const headRect0 = head ? head.getBoundingClientRect() : null
  inner.scrollTop = Math.max(0, inner.scrollHeight - inner.clientHeight)
  await sleep(100)
  const headRect1 = head ? head.getBoundingClientRect() : null
  const headScrollsWithInner = headRect0 && headRect1
    ? Math.abs(headRect1.top - headRect0.top) > 2
    : false
  const btnRect1 = btn ? btn.getBoundingClientRect() : null
  const scrollPin = {
    btnMovedWithScroll: btnRect0 && btnRect1
      ? Math.abs(btnRect1.top - btnRect0.top) > 2 || Math.abs(btnRect1.bottom - btnRect0.bottom) > 2
      : false,
    btnOutsideTop: btn ? !top.contains(btn) : false
  }
  inner.scrollTop = 0

  const stemRevealInitial = {
    scrollTop: inner ? inner.scrollTop : null,
    truncated: top ? top.classList.contains('stem-expand-truncated') : false
  }

  window.AIClassMessageBridge.handleMessage({ data: { action: '例1_步骤03_展_已知三' } })
  await sleep(500)

  const fadeH = fade ? parseFloat(getComputedStyle(fade).height) || 20 : 20
  const fadePad = fadeH + 8
  const innerRectAfterBottom = inner ? inner.getBoundingClientRect() : null
  const litMarks = inner
    ? Array.from(inner.querySelectorAll('.tx-stem-mark--case-a.tx-stem-mark--lit'))
    : []
  const litVisible = litMarks.some(function (node) {
    var rect = node.getBoundingClientRect()
    return innerRectAfterBottom && rect.bottom <= innerRectAfterBottom.bottom - fadePad + 1
  })

  const stemRevealAfterBottom = {
    scrollTop: inner ? inner.scrollTop : null,
    litCount: litMarks.length,
    litVisible: litVisible
  }

  window.AIClassMessageBridge.handleMessage({ data: { action: '例1_步骤01_展_已知一' } })
  await sleep(500)

  const innerRectAfterTop = inner ? inner.getBoundingClientRect() : null
  const litBaseMarks = inner
    ? Array.from(inner.querySelectorAll('.tx-stem-mark--base.tx-stem-mark--lit'))
    : []
  const baseLitVisible = litBaseMarks.some(function (node) {
    var rect = node.getBoundingClientRect()
    return innerRectAfterTop
      && rect.top >= innerRectAfterTop.top + 4
      && rect.bottom <= innerRectAfterTop.bottom - fadePad + 1
  })

  const stemRevealAfterTop = {
    scrollTop: inner ? inner.scrollTop : null,
    scrolledUpFromBottom: inner ? inner.scrollTop < stemRevealAfterBottom.scrollTop : false,
    baseLitVisible: baseLitVisible,
    stemScrollingDuringReveal: top ? top.classList.contains('aic-overlay-scrollbar-active') : false
  }

  inner.scrollTop = 0
  await sleep(1200)
  const stemScrollbarIdle = {
    topActive: top ? top.classList.contains('aic-overlay-scrollbar-active') : false
  }

  inner.scrollTop = 30
  await sleep(50)
  const railRect = scrollbar ? scrollbar.getBoundingClientRect() : null
  const thumbRect = scrollbarThumb ? scrollbarThumb.getBoundingClientRect() : null
  const thumbWithinRail = railRect && thumbRect
    ? thumbRect.top >= railRect.top - 1 && thumbRect.bottom <= railRect.bottom + 1
    : false
  const stemScrollbarActive = {
    topActive: top ? top.classList.contains('aic-overlay-scrollbar-active') : false,
    overlayExists: !!scrollbar,
    thumbExists: !!scrollbarThumb,
    thumbWithinRail: thumbWithinRail,
    nativeHidden: inner ? getComputedStyle(inner).scrollbarWidth === 'none' : false,
    mainOverlayExists: !!mainScrollbar,
    mainNativeHidden: scrollMain ? getComputedStyle(scrollMain).scrollbarWidth === 'none' : false
  }

  inner.scrollTop = 0

  if (scrollMain && scrollMain.scrollHeight > scrollMain.clientHeight + 2) {
    scrollMain.scrollTop = 40
    await sleep(50)
  }
  const mainRail = scrollMain ? scrollMain.querySelector('.aic-overlay-scrollbar') : null
  const mainThumb = mainRail ? mainRail.querySelector('.aic-overlay-scrollbar-thumb') : null
  const mainRailRect = mainRail ? mainRail.getBoundingClientRect() : null
  const mainThumbRect = mainThumb ? mainThumb.getBoundingClientRect() : null
  const mainHostRect = scrollMain ? scrollMain.getBoundingClientRect() : null
  const mainThumbWithinRail = mainRailRect && mainThumbRect
    ? mainThumbRect.top >= mainRailRect.top - 1 && mainThumbRect.bottom <= mainRailRect.bottom + 1
    : false
  const mainRailWithinHost = mainRailRect && mainHostRect
    ? mainRailRect.top >= mainHostRect.top - 1 && mainRailRect.bottom <= mainHostRect.bottom + 1
    : false
  const mainScrollbarCheck = {
    scrollable: scrollMain ? scrollMain.scrollHeight > scrollMain.clientHeight + 2 : false,
    overlayVisible: mainRail ? getComputedStyle(mainRail).display !== 'none' : false,
    thumbWithinRail: mainThumbWithinRail,
    railWithinHost: mainRailWithinHost
  }
  if (scrollMain) scrollMain.scrollTop = 0

  const before = {
    topMaxHeight: getComputedStyle(top).maxHeight,
    innerMaxHeight: inner ? getComputedStyle(inner).maxHeight : null,
    topOverflowY: getComputedStyle(top).overflowY,
    innerOverflowY: inner ? getComputedStyle(inner).overflowY : null,
    topClientH: top.clientHeight,
    topScrollH: top.scrollHeight,
    innerClientH: inner ? inner.clientHeight : null,
    innerScrollH: inner ? inner.scrollHeight : null,
    topWidth: top.offsetWidth,
    stemWidth: top.querySelector('.lf-block.tx-stem') ? top.querySelector('.lf-block.tx-stem').offsetWidth : null,
    transition: getComputedStyle(top).transitionProperty,
    mainOffsetTop: mainOffsetTop,
    innerGutter: inner ? getComputedStyle(inner).scrollbarWidth : null,
    overlayScrollbar: !!scrollbar,
    overlayThumb: !!scrollbarThumb,
    barExists: !!bar,
    barInTopNotInner: bar ? top.contains(bar) && !inner.contains(bar) : false,
    gapToMain,
    barLayoutHeight: bar ? bar.offsetHeight : null,
    chromeExists: !!chrome,
    fadeExists: !!fade,
    fadeHeight: fade ? getComputedStyle(fade).height : null,
    chromePosition: chrome ? getComputedStyle(chrome).position : null,
    glass: {
      backdrop: getComputedStyle(top).backdropFilter,
      radius: getComputedStyle(top).borderRadius,
      border: getComputedStyle(top).borderTopWidth,
      shadow: getComputedStyle(top).boxShadow,
      padInline: getComputedStyle(top).paddingLeft
    },
    btnVisible: bar ? getComputedStyle(bar).display !== 'none' : false,
    btnPosition: btn ? getComputedStyle(btn).position : null,
    btnText: btn ? btn.textContent : null,
    expandOpen: top.classList.contains('stem-expand-open'),
    scrollPin: {
      ...scrollPin,
      btnInStemGap: btnRect && innerRect ? btnRect.top >= innerRect.bottom - 2 : false,
      headScrollsWithInner
    }
  }

  if (btn) btn.click()
  await sleep(100)
  const midOpen = { topClientH: top.clientHeight, mainOffsetTop: main ? main.offsetTop : null }
  await sleep(500)
  const afterOpen = {
    expandOpen: top.classList.contains('stem-expand-open'),
    topClientH: top.clientHeight,
    topScrollH: top.scrollHeight,
    topWidth: top.offsetWidth,
    stemWidth: top.querySelector('.lf-block.tx-stem') ? top.querySelector('.lf-block.tx-stem').offsetWidth : null,
    topPosition: getComputedStyle(top).position,
    topZ: getComputedStyle(top).zIndex,
    btnText: btn ? btn.textContent : null,
    btnVisibleOpen: bar ? getComputedStyle(bar).display !== 'none' : false,
    innerOverflowOpen: inner ? getComputedStyle(inner).overflowY : null,
    innerGutterOpen: inner ? getComputedStyle(inner).scrollbarWidth : null,
    mainOffsetTop: main ? main.offsetTop : null,
    mainUnchanged: main ? main.offsetTop === mainOffsetTop : null,
    fullStemVisible: inner ? inner.scrollHeight <= inner.clientHeight + 2 : false,
    glass: {
      backdrop: getComputedStyle(top).backdropFilter,
      radius: getComputedStyle(top).borderRadius,
      border: getComputedStyle(top).borderTopWidth,
      shadow: getComputedStyle(top).boxShadow,
      padInline: getComputedStyle(top).paddingLeft
    }
  }

  if (btn) btn.click()
  await sleep(100)
  const midClose = { topClientH: top.clientHeight, mainOffsetTop: main ? main.offsetTop : null }
  await sleep(500)
  const afterToggleClose = {
    expandOpen: top.classList.contains('stem-expand-open'),
    btnText: btn ? btn.textContent : null,
    btnVisible: bar ? getComputedStyle(bar).display !== 'none' : false
  }

  if (btn) btn.click()
  await sleep(300)
  if (top) document.body.click()
  await sleep(700)
  const afterOutsideClick = { expandOpen: top.classList.contains('stem-expand-open') }

  if (window.AIClassContainerHost && typeof window.AIClassContainerHost.reset === 'function') {
    window.AIClassContainerHost.reset()
  }
  await sleep(200)
  const afterReset = {
    btnCount: document.querySelectorAll('.stem-expand-btn').length,
    barCount: document.querySelectorAll('.stem-expand-bar').length,
    chromeCount: document.querySelectorAll('.stem-expand-chrome').length,
    spacerCount: document.querySelectorAll('.stem-expand-spacer').length,
    expandFlag: document.querySelector('.course-scroll-top')
      ? document.querySelector('.course-scroll-top').getAttribute('data-stem-expand')
      : null
  }

  return {
    before,
    stemRevealInitial,
    stemRevealAfterBottom,
    stemRevealAfterTop,
    stemScrollbarIdle,
    stemScrollbarActive,
    mainScrollbarCheck,
    midOpen,
    afterOpen,
    midClose,
    afterToggleClose,
    afterOutsideClick,
    afterReset
  }
})

await browser.close()
console.log(JSON.stringify({ result, errors }, null, 2))

const r = result
const fail = (msg) => { throw new Error(msg) }
if (r.before.topMaxHeight !== 'none') fail('StemExpand 外壳 max-height 应为 none（限高在 inner）')
if (r.before.innerMaxHeight === 'none' || r.before.innerMaxHeight === '') fail('inner max-height 未生效')
if (r.before.topOverflowY !== 'visible') fail('外层 overflow 应为 visible（按钮浮在 gap）')
if (r.before.innerOverflowY !== 'auto') fail('inner overflow-y 应为 auto')
if (!(r.before.innerScrollH > r.before.innerClientH)) fail('题干应超出三行限高')
if (!r.before.barExists) fail('应有 stem-expand-bar')
if (!r.before.barInTopNotInner) fail('bar 应在顶栏内、滚动层外')
if (r.before.gapToMain == null || r.before.gapToMain > 12) fail('展开栏不应单独占行，top 与 main 间距应约为 course-body gap')
if (r.before.barLayoutHeight !== 0) fail('bar 应为零高度布局（absolute）')
if (!r.before.chromeExists) fail('应有 stem-expand-chrome 层')
if (!r.before.fadeExists) fail('应有 stem-expand-fade 渐变层')
if (r.before.chromePosition !== 'absolute') fail('chrome 应为 absolute 固定于顶栏底部')
if (!r.before.scrollPin.btnInStemGap) fail('展开按钮应在题干框下方（不压字）')
if (!r.before.scrollPin.headScrollsWithInner) fail('题号行应随题干区内滚动整体上移')
if (r.before.scrollPin.btnMovedWithScroll) fail('滚动 inner 后外置按钮位置不应变化')
if (!r.before.btnVisible) fail('超出三行时展开按钮应显示')
if (r.before.btnPosition === 'absolute') fail('外置展开按钮不应使用 absolute')
if (r.before.glass.backdrop === 'none' || !r.before.glass.backdrop.includes('blur')) {
  fail('收起态应有 backdrop blur（毛玻璃）')
}
if (!r.before.transition.includes('max-height')) fail('标题栏应有 max-height 过渡动画')
if (!r.afterOpen.expandOpen) fail('点击后应进入 stem-expand-open')
if (r.afterOpen.topClientH <= r.before.topClientH) fail('展开后标题栏应拉高')
if (r.afterOpen.topWidth !== r.before.topWidth) fail('展开后宽度应与收起态一致')
if (Math.abs(r.afterOpen.stemWidth - r.before.stemWidth) > 1) fail('展开后题干排版宽度应不变')
if (r.before.innerGutter !== 'none') fail('inner 应隐藏原生滚动条（scrollbar-width: none）')
if (!r.before.overlayScrollbar) fail('应有自绘 aic-overlay-scrollbar')
if (!r.before.overlayThumb) fail('应有 aic-overlay-scrollbar-thumb')
if (!r.stemScrollbarActive.thumbWithinRail) fail('thumb 不应超出轨道区域')
if (!r.stemScrollbarActive.mainOverlayExists) fail('解析区应有 aic-overlay-scrollbar')
if (!r.stemScrollbarActive.mainNativeHidden) fail('解析区应隐藏原生滚动条')
if (r.mainScrollbarCheck.scrollable && !r.mainScrollbarCheck.overlayVisible) {
  fail('解析区可滚动时应显示 overlay 轨道')
}
if (r.mainScrollbarCheck.scrollable && !r.mainScrollbarCheck.thumbWithinRail) {
  fail('解析区 thumb 不应超出轨道')
}
if (r.mainScrollbarCheck.scrollable && !r.mainScrollbarCheck.railWithinHost) {
  fail('解析区轨道不应超出容器可视区')
}
if (r.afterOpen.innerGutterOpen !== 'none') fail('展开态 inner 应隐藏原生滚动条')
if (r.afterOpen.innerOverflowOpen !== 'auto') fail('展开态 inner 应保持 overflow-y: auto 以稳定宽度')
if (!(r.midOpen.topClientH > r.before.topClientH && r.midOpen.topClientH < r.afterOpen.topClientH)) {
  fail('展开应有过渡动画')
}
if (r.afterOpen.topPosition !== 'absolute') fail('展开态应为 absolute')
if (r.afterOpen.topZ !== '15') fail('展开态 z-index 应为 15')
if (r.afterOpen.glass.backdrop === 'none' || !r.afterOpen.glass.backdrop.includes('blur')) {
  fail('展开态应有 backdrop blur')
}
if (!r.afterOpen.fullStemVisible) fail('展开态应显示完整题干')
if (!r.afterOpen.mainUnchanged) fail('展开时正文位置不应移动')
if (r.afterOpen.btnText !== '收起') fail('展开后按钮应为 收起')
if (r.afterToggleClose.btnText !== '展开') fail('收起后按钮应为 展开')
if (r.afterOutsideClick.expandOpen) fail('点外部应收起')
if (r.afterReset.btnCount !== 0) fail('reset 后按钮应移除')
if (r.afterReset.barCount !== 0) fail('reset 后 bar 应移除')
if (r.afterReset.chromeCount !== 0) fail('reset 后 chrome 应移除')
if (r.afterReset.spacerCount !== 0) fail('reset 后占位应移除')
if (r.afterReset.expandFlag != null) fail('reset 后 data-stem-expand 应清除')
if (r.stemRevealInitial.scrollTop !== 0) fail('初始 inner.scrollTop 应为 0')
if (!r.stemRevealInitial.truncated) fail('初始应为截断态')
if (!(r.stemRevealAfterBottom.scrollTop > 0)) fail('审题底部高亮应自动滚入视口（scrollTop > 0）')
if (r.stemRevealAfterBottom.litCount < 1) fail('步骤03 应点亮 case-a mark')
if (!r.stemRevealAfterBottom.litVisible) fail('底部高亮应在 fade 之上可见')
if (!r.stemRevealAfterTop.scrolledUpFromBottom) fail('切回顶部高亮后应向上滚动')
if (!r.stemRevealAfterTop.baseLitVisible) fail('顶部 base 高亮应在视口内可见')
if (!r.stemScrollbarActive.topActive) fail('手动滚 inner 应激活 overlay 滚动条')
if (r.stemScrollbarIdle.topActive) fail('停滚 1s 后 overlay 滚动条应淡出')
if (!r.stemScrollbarActive.nativeHidden) fail('原生滚动条应隐藏')
console.log(`stem-expand interaction passed: ${courseId}`)

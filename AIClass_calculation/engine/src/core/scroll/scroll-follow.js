// 内容追加后阻尼跟随滚动 — 支持 .lf-stage 与 split 布局内层滚动（如 course-scroll-main）
;(function () {
  var INNER_SCROLL_BOTTOM_INSET = 20

  var followState = {
    raf: null,
    ro: null,
    stopTimer: null,
    bumpTimers: [],
    anchor: null,
    stage: null,
    scrollEl: null,
    padding: 120,
    topPadding: 40,
    active: false,
    kbExtra: 0,
    alignStart: false,
    scrollPastEl: null,
    scrollPastGap: 8,
    preserveScroll: false,
    _cancelFollow: null,
    _scrollListeners: []
  }

  function getStage() {
    return document.querySelector('.lf-stage')
  }

  function detachScrollListeners() {
    if (!followState._cancelFollow) return
    followState._scrollListeners.forEach(function (entry) {
      entry.el.removeEventListener(entry.type, followState._cancelFollow)
    })
    followState._scrollListeners = []
  }

  function attachScrollListener(el, type) {
    if (!el || !followState._cancelFollow) return
    el.addEventListener(type, followState._cancelFollow, { passive: true })
    followState._scrollListeners.push({ el: el, type: type })
  }

  function stop() {
    followState.active = false
    followState._tickTarget = NaN
    if (followState.raf) {
      cancelAnimationFrame(followState.raf)
      followState.raf = null
    }
    if (followState.ro) {
      followState.ro.disconnect()
      followState.ro = null
    }
    if (followState.stopTimer) {
      clearTimeout(followState.stopTimer)
      followState.stopTimer = null
    }
    followState.bumpTimers.forEach(function (t) { clearTimeout(t) })
    followState.bumpTimers = []
    followState.alignStart = false
    followState.scrollPastEl = null
    followState.scrollPastGap = 8
    followState.preserveScroll = false
    detachScrollListeners()
    followState._cancelFollow = null
  }

  function getActiveScrollEl() {
    return followState.scrollEl || followState.stage || getStage()
  }

  function isStageScroll(scrollEl) {
    return !!(scrollEl && scrollEl.classList && scrollEl.classList.contains('lf-stage'))
  }

  function getScaleY(stage) {
    if (!stage) return 1
    var stageRect = stage.getBoundingClientRect()
    var scaleY = stageRect.height / stage.clientHeight
    if (!scaleY || scaleY <= 0) scaleY = 1
    return scaleY
  }

  function getScrollElScaleY(scrollEl) {
    if (!scrollEl || !scrollEl.closest) return 1
    var stage = scrollEl.closest('.lf-stage')
    return stage ? getScaleY(stage) : 1
  }

  function readBottomInset(scrollEl) {
    if (!scrollEl || !window.getComputedStyle) return INNER_SCROLL_BOTTOM_INSET
    var raw = getComputedStyle(scrollEl).getPropertyValue('--cc-scroll-bottom-inset').trim()
    if (!raw) return INNER_SCROLL_BOTTOM_INSET
    var n = parseFloat(raw)
    return isNaN(n) ? INNER_SCROLL_BOTTOM_INSET : n
  }

  function scrollContentBottom(scrollEl) {
    if (!scrollEl || !scrollEl.getBoundingClientRect) return 0
    var stack = scrollEl.querySelector && scrollEl.querySelector('.course-scroll-stack')
    var scope = stack || scrollEl
    var bottom = scope.getBoundingClientRect().top
    Array.prototype.forEach.call(scope.children, function (child) {
      if (!child.getBoundingClientRect) return
      if (child.classList && child.classList.contains('sf-scroll-spacer')) return
      bottom = Math.max(bottom, child.getBoundingClientRect().bottom)
      var katex = child.querySelector && child.querySelector('.katex-html, .katex')
      if (katex) bottom = Math.max(bottom, katex.getBoundingClientRect().bottom)
    })
    return bottom
  }

  function stackContentBottom(scrollEl) {
    return scrollContentBottom(scrollEl)
  }

  function adjustScrollForBottomInset(scrollEl, target) {
    if (!scrollEl) return target
    var inset = readBottomInset(scrollEl)
    var maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
    target = Math.max(0, Math.min(target, maxScroll))
    var saved = scrollEl.scrollTop
    scrollEl.scrollTop = target
    void scrollEl.offsetHeight
    var scrollRect = scrollEl.getBoundingClientRect()
    var contentBottom = stackContentBottom(scrollEl)
    if (!contentBottom) {
      scrollEl.scrollTop = saved
      return target
    }
    var overflow = contentBottom - (scrollRect.bottom - inset)
    scrollEl.scrollTop = saved
    if (overflow > 1) {
      var scaleY = getScrollElScaleY(scrollEl)
      target = Math.min(maxScroll, target + overflow / scaleY)
    }
    return target
  }

  function resolveAnchor(anchor) {
    if (!anchor) return null
    if (anchor.classList && anchor.classList.contains('course-scroll')) {
      return anchor.closest('.course-container') || anchor.lastElementChild || anchor
    }
    return anchor
  }

  function isInterleavedScrollEl(scrollEl) {
    if (!scrollEl || !scrollEl.closest) return false
    var container = scrollEl.closest('.course-container')
    return !!(container && container.getAttribute('data-guidance-layout') === 'interleaved')
  }

  function findInterleavedActiveSection(scrollEl) {
    if (!scrollEl || !scrollEl.querySelector) return null
    var panel = scrollEl.querySelector('.cc-guide-panel')
    if (!panel) return null
    var active = panel.querySelector('.cc-guide-section:not(.is-hidden) .cc-guide-node.is-active')
    if (active) return active.closest('.cc-guide-section')
    var sections = panel.querySelectorAll('.cc-guide-section:not(.is-hidden)')
    return sections.length ? sections[sections.length - 1] : null
  }

  function interleavedSlotForSection(section) {
    if (!section || !section.getAttribute) return null
    var panel = section.parentNode
    if (!panel || !panel.querySelector) return null
    var group = section.getAttribute('data-guide-group')
    if (!group) return null
    return panel.querySelector('.cc-guide-slot[data-guide-group="' + group + '"]:not(.is-hidden)')
  }

  function interleavedFocusInSlot(blockEl, section) {
    if (!blockEl || !section) return false
    var slot = interleavedSlotForSection(section)
    return !!(slot && slot.contains(blockEl))
  }

  function interleavedSlotLastBlock(section) {
    var slot = interleavedSlotForSection(section)
    if (!slot || !slot.querySelectorAll) return null
    var blocks = slot.querySelectorAll('.lf-block')
    return blocks.length ? blocks[blocks.length - 1] : null
  }

  function resolveInterleavedSection(scrollEl, blockEl) {
    if (blockEl && blockEl.classList && blockEl.classList.contains('cc-guide-section')) {
      return blockEl
    }
    return findInterleavedActiveSection(scrollEl)
  }

  function measureInterleavedComfortTarget(scrollEl, blockEl) {
    var section = resolveInterleavedSection(scrollEl, blockEl)
    if (!section) {
      return blockEl
        ? measureTargetInner(scrollEl, blockEl, followState.padding)
        : scrollEl.scrollTop
    }

    var topPadding = Math.max(followState.topPadding, 24)
    var topTarget = measureTopTargetInner(scrollEl, section, topPadding)
    var focusEl = interleavedSlotLastBlock(section)
    if (!focusEl && interleavedFocusInSlot(blockEl, section)) {
      focusEl = blockEl
    }

    if (!focusEl) {
      return topTarget
    }

    var bottomTarget = measureTargetInner(scrollEl, focusEl, followState.padding)
    // 交错布局：同时满足节标题顶对齐与末块底留白，避免跟随末尾因 headerLow/contentLow
    // 翻转而在 topTarget / bottomTarget 间上下弹跳（口答链步骤尤为明显）
    return Math.max(bottomTarget, topTarget)
  }

  function findRevealBlock(anchor, scrollEl) {
    if (!anchor) return null
    if (anchor.classList && anchor.classList.contains('lf-block')) return anchor
    if (anchor.classList && anchor.classList.contains('cc-guide-section')) {
      return interleavedSlotLastBlock(anchor) || anchor
    }

    if (scrollEl && isInterleavedScrollEl(scrollEl)) {
      var activeSection = resolveInterleavedSection(scrollEl, anchor)
      if (activeSection) {
        return interleavedSlotLastBlock(activeSection) || activeSection
      }
    }

    if (!anchor.querySelector) return null

    var main = anchor.classList && anchor.classList.contains('course-scroll-main')
      ? anchor
      : (anchor.classList && anchor.classList.contains('course-scroll-stack')
        ? anchor
        : anchor.querySelector('.course-scroll-stack, .course-scroll-main'))

    if (main) {
      if (isInterleavedScrollEl(scrollEl || main)) {
        var section = main.querySelector('.cc-guide-section:not(.is-hidden) .cc-guide-node.is-active')
        section = section ? section.closest('.cc-guide-section') : null
        if (!section) {
          var sections = main.querySelectorAll('.cc-guide-section:not(.is-hidden)')
          section = sections.length ? sections[sections.length - 1] : null
        }
        if (section) return interleavedSlotLastBlock(section) || section
      }
      var blocks = main.querySelectorAll('.lf-block')
      if (blocks.length) return blocks[blocks.length - 1]
      var activeNode = main.querySelector('.cc-guide-section:not(.is-hidden) .cc-guide-node.is-active')
      if (activeNode) return activeNode.closest('.cc-guide-section') || activeNode
      var guide = main.querySelector('.cc-guide-chain:not(.cc-guide-chain--collapsed)')
      if (guide) return guide
      if (main.lastElementChild) return main.lastElementChild
    }

    if (scrollEl && scrollEl.querySelector && !isInterleavedScrollEl(scrollEl)) {
      var inScroll = scrollEl.querySelectorAll('.lf-block')
      if (inScroll.length) return inScroll[inScroll.length - 1]
    }

    var legacy = anchor.querySelector('.course-scroll .lf-block:last-child')
    return legacy || null
  }

  function measureBottomInScroll(scrollEl, el) {
    if (!scrollEl || !el) return 0
    var bottom = el.getBoundingClientRect().bottom
    var katex = el.querySelector && el.querySelector('.katex-html, .katex')
    if (katex) bottom = Math.max(bottom, katex.getBoundingClientRect().bottom)
    var container = el.classList && el.classList.contains('course-container')
      ? el
      : (el.closest ? el.closest('.course-container') : null)
    if (container) {
      var main = container.querySelector('.course-scroll-stack, .course-scroll-main')
      if (main && main.lastElementChild) {
        var last = main.lastElementChild
        if (last.classList && last.classList.contains('sf-scroll-spacer')) {
          last = last.previousElementSibling
        }
        if (last) {
          bottom = Math.max(bottom, last.getBoundingClientRect().bottom)
          var lastKatex = last.querySelector && last.querySelector('.katex-html, .katex')
          if (lastKatex) bottom = Math.max(bottom, lastKatex.getBoundingClientRect().bottom)
        }
      }
    }
    return bottom
  }

  function measureTargetInner(scrollEl, el, padding) {
    if (!scrollEl || !el) return 0
    padding = padding != null ? padding : followState.padding
    var scrollRect = scrollEl.getBoundingClientRect()
    var scaleY = getScrollElScaleY(scrollEl)
    var bottom = measureBottomInScroll(scrollEl, el)
    var visualDelta = bottom - scrollRect.bottom + padding + followState.kbExtra
    var target = scrollEl.scrollTop + visualDelta / scaleY
    var maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
    target = Math.max(0, Math.min(target, maxScroll))
    return adjustScrollForBottomInset(scrollEl, target)
  }

  function getScrollStack(scrollEl) {
    if (!scrollEl || !scrollEl.querySelector) return null
    return scrollEl.querySelector('.course-scroll-stack')
  }

  function clearScrollCapacity(scrollEl) {
    if (!scrollEl) return
    var stack = getScrollStack(scrollEl)
    if (!stack) return
    var spacer = stack.querySelector('.sf-scroll-spacer')
    if (spacer) spacer.remove()
    delete stack.dataset.sfScrollPad
  }

  function findRevealAfterPast(el) {
    if (!el) return null
    var reveal = el.nextElementSibling
    while (reveal && reveal.classList && reveal.classList.contains('sf-scroll-spacer')) {
      reveal = reveal.nextElementSibling
    }
    return reveal
  }

  function pickScrollPastReveal(el) {
    var reveal = findRevealAfterPast(el)
    if (!reveal) return null
    if (reveal.classList && reveal.classList.contains('cc-guide-chain')) {
      return reveal.querySelector('.cc-guide-node.is-active') ||
        reveal.querySelector('.cc-guide-node:not(.is-hidden)') ||
        reveal
    }
    if (reveal.classList && reveal.classList.contains('cc-guide-section')) {
      return reveal.querySelector('.cc-guide-node.is-active') ||
        reveal.querySelector('.cc-guide-node:not(.is-hidden)') ||
        reveal
    }
    return reveal
  }

  // 底部垫高保证可滚内容完全离开视口，同时仍可向上滚回查看
  function ensureScrollPastCapacity(scrollEl, pastEl, topPadding) {
    if (!scrollEl || !pastEl) return
    var stack = getScrollStack(scrollEl)
    if (!stack) return
    var reveal = pickScrollPastReveal(pastEl)
    if (!reveal) return

    var scaleY = getScrollElScaleY(scrollEl)
    topPadding = topPadding != null ? topPadding : followState.topPadding

    function desiredTarget() {
      var scrollRect = scrollEl.getBoundingClientRect()
      var visualTop = reveal.getBoundingClientRect().top - scrollRect.top
      return Math.max(0, scrollEl.scrollTop + visualTop / scaleY - topPadding)
    }

    for (var attempt = 0; attempt < 4; attempt++) {
      var want = desiredTarget()
      var maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
      if (want <= maxScroll + 1) return

      var need = Math.ceil(want - maxScroll + 8)
      var spacer = stack.querySelector('.sf-scroll-spacer')
      if (!spacer) {
        spacer = document.createElement('div')
        spacer.className = 'sf-scroll-spacer'
        spacer.setAttribute('aria-hidden', 'true')
        stack.appendChild(spacer)
      } else if (spacer.parentNode === stack && spacer !== stack.lastElementChild) {
        stack.appendChild(spacer)
      }
      var current = parseFloat(spacer.style.height) || 0
      spacer.style.height = (current + need) + 'px'
      stack.dataset.sfScrollPad = spacer.style.height
      void scrollEl.offsetHeight
    }
  }

  function measureScrollPastInner(scrollEl, el, gap) {
    if (!scrollEl || !el) return 0
    gap = gap != null ? gap : followState.scrollPastGap
    ensureScrollPastCapacity(scrollEl, el, followState.topPadding)
    void scrollEl.offsetHeight
    var scrollRect = scrollEl.getBoundingClientRect()
    var scaleY = getScrollElScaleY(scrollEl)

    var reveal = pickScrollPastReveal(el)
    if (reveal) {
      var visualTop = reveal.getBoundingClientRect().top - scrollRect.top
      var target = scrollEl.scrollTop + visualTop / scaleY - followState.topPadding
      target = Math.max(0, target)
      var maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
      return Math.max(0, Math.min(target, maxScroll))
    }

    var visualDelta = el.getBoundingClientRect().bottom - scrollRect.top + gap
    var targetPast = scrollEl.scrollTop + visualDelta / scaleY
    var maxScrollPast = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
    return Math.max(0, Math.min(targetPast, maxScrollPast))
  }

  function measureTopTargetInner(scrollEl, el, topPadding) {
    if (!scrollEl || !el) return 0
    topPadding = topPadding != null ? topPadding : followState.topPadding
    var scrollRect = scrollEl.getBoundingClientRect()
    var scaleY = getScrollElScaleY(scrollEl)
    var visualDelta = el.getBoundingClientRect().top - scrollRect.top
    var target = scrollEl.scrollTop + visualDelta / scaleY - topPadding
    var maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
    return Math.max(0, Math.min(target, maxScroll))
  }

  function measureBottom(el) {
    if (!el) return 0
    var bottom = el.getBoundingClientRect().bottom
    var container = el.classList && el.classList.contains('course-container')
      ? el
      : (el.closest ? el.closest('.course-container') : null)
    if (container) {
      var figure = container.querySelector('.course-figure')
      if (figure) bottom = Math.max(bottom, figure.getBoundingClientRect().bottom)
      var scroll = container.querySelector('.course-scroll')
      if (scroll) bottom = Math.max(bottom, scroll.getBoundingClientRect().bottom)
    }
    return bottom
  }

  function measureTargetStage(el, stage) {
    if (!stage) return 0
    var bottom = measureBottom(el)
    var stageRect = stage.getBoundingClientRect()
    var scaleY = getScaleY(stage)
    var relBottom = (bottom - stageRect.top) / scaleY
    var absBottom = relBottom + stage.scrollTop
    var target = absBottom - stage.clientHeight + followState.padding + followState.kbExtra
    var maxScroll = Math.max(0, stage.scrollHeight - stage.clientHeight)
    return Math.max(0, Math.min(target, maxScroll))
  }

  function measureTopTargetStage(el, stage, topPadding) {
    if (!stage || !el) return 0
    topPadding = topPadding != null ? topPadding : followState.topPadding
    var stageRect = stage.getBoundingClientRect()
    var scaleY = getScaleY(stage)
    var relTop = (el.getBoundingClientRect().top - stageRect.top) / scaleY
    var target = relTop + stage.scrollTop - topPadding
    var maxScroll = Math.max(0, stage.scrollHeight - stage.clientHeight)
    return Math.max(0, Math.min(target, maxScroll))
  }

  function pickRevealTarget(anchor) {
    var scrollEl = getActiveScrollEl()
    if (!scrollEl || !anchor) return 0

    var block = findRevealBlock(anchor, scrollEl)
    var container = anchor.closest ? anchor.closest('.course-container') : null

    if (!isStageScroll(scrollEl)) {
      if (followState.scrollPastEl) {
        return measureScrollPastInner(scrollEl, followState.scrollPastEl, followState.scrollPastGap)
      }
      if (followState.preserveScroll) {
        return scrollEl.scrollTop
      }
      if (followState.alignStart) {
        if (container) return measureTopTargetInner(scrollEl, container, followState.topPadding)
        if (block) return measureTopTargetInner(scrollEl, block, followState.topPadding)
      }
      if (isInterleavedScrollEl(scrollEl)) {
        return measureInterleavedComfortTarget(scrollEl, block)
      }
      if (block) {
        var blockHeight = block.getBoundingClientRect().height
        var viewport = scrollEl.clientHeight - followState.topPadding - 24
        if (blockHeight >= viewport) {
          return measureTopTargetInner(scrollEl, block, followState.topPadding)
        }
      }
      return measureTargetInner(scrollEl, resolveAnchor(anchor), followState.padding)
    }

    var stage = followState.stage || getStage()
    if (followState.alignStart) {
      if (container) return measureTopTargetStage(container, stage, followState.topPadding)
      if (block) return measureTopTargetStage(block, stage, followState.topPadding)
    }
    if (!block) {
      return measureTargetStage(resolveAnchor(anchor), stage)
    }
    var scaleY = getScaleY(stage)
    var blockHeight = block.getBoundingClientRect().height / scaleY
    var viewport = stage.clientHeight - followState.topPadding - 24
    if (blockHeight >= viewport) {
      return measureTopTargetStage(block, stage, followState.topPadding)
    }
    return measureTargetStage(resolveAnchor(anchor), stage)
  }

  function clampScrollTarget(target) {
    var scrollEl = getActiveScrollEl()
    if (!scrollEl) return target
    var maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
    return Math.max(0, Math.min(target, maxScroll))
  }

  function applyScrollTop(target) {
    var scrollEl = getActiveScrollEl()
    if (!scrollEl) return
    scrollEl.scrollTop = clampScrollTarget(target)
  }

  function finalSnap() {
    if (!followState.anchor) return
    if (!getActiveScrollEl()) return
    // 使用缓存 target 而非重新计算，避免 1200ms 后布局微差导致可见跳动
    var target = isNaN(followState._tickTarget)
      ? pickRevealTarget(followState.anchor)
      : followState._tickTarget
    applyScrollTop(target)
  }

  function configureFollow(anchor, opts) {
    opts = opts || {}
    stop()
    var stage = opts.stage || getStage()
    if (!stage || !anchor) return false
    var scrollEl = opts.scrollEl || stage
    var layoutScrollEl = opts.layoutScrollEl || scrollEl
    if (layoutScrollEl && opts.resetPast) {
      clearScrollCapacity(layoutScrollEl)
    }
    followState.anchor = anchor
    followState.stage = stage
    followState.scrollEl = scrollEl
    followState.kbExtra = opts.keyboardExtra != null ? opts.keyboardExtra : 0
    followState.padding = opts.padding != null
      ? opts.padding
      : (isStageScroll(scrollEl) ? 120 : INNER_SCROLL_BOTTOM_INSET)
    followState.topPadding = opts.topPadding != null ? opts.topPadding : 10
    followState.alignStart = !!opts.alignStart
    followState.scrollPastEl = opts.scrollPastEl || null
    followState.scrollPastGap = opts.scrollPastGap != null ? opts.scrollPastGap : 8
    followState.preserveScroll = !!opts.preserveScroll
    clampScrollTarget(pickRevealTarget(anchor))
    return true
  }

  function reveal(anchor, opts) {
    if (!configureFollow(anchor, opts)) return
    applyScrollTop(pickRevealTarget(anchor))
  }

  function tick() {
    if (!followState.active) return
    var scrollEl = getActiveScrollEl()
    if (!scrollEl) {
      followState.raf = null
      return
    }

    // 锁定 target：只在首次 tick 或显式 bump 时重新计算，避免逐帧依赖
    // getBoundingClientRect 引起的反馈振荡
    if (isNaN(followState._tickTarget)) {
      followState._tickTarget = clampScrollTarget(pickRevealTarget(followState.anchor))
    }
    var target = followState._tickTarget
    var current = scrollEl.scrollTop
    var diff = target - current

    if (Math.abs(diff) < 1) {
      scrollEl.scrollTop = target
      followState.raf = null
      return
    }

    var absDiff = Math.abs(diff)
    var step
    // 叠层切题 alignStart：距离大时放慢，让用户感知「向上滚入」
    if (followState.alignStart && absDiff > 80) {
      step = absDiff > 520 ? 0.08 : (absDiff > 240 ? 0.1 : 0.13)
    } else {
      step = absDiff > 240 ? 0.35 : (absDiff > 80 ? 0.45 : 0.55)
    }
    scrollEl.scrollTop = current + diff * step
    followState.raf = requestAnimationFrame(tick)
  }

  function bump(recompute) {
    if (!followState.active) return
    // 布局变化时（ResizeObserver）用 bump() 不带参数：保持缓存 target，只确保 tick 继续运行
    // 显式需要重新计算 target 时（定时调度 bump、initial follow）传 true
    if (recompute) followState._tickTarget = NaN
    if (!followState.raf) followState.raf = requestAnimationFrame(tick)
  }

  function scheduleLayoutBumps() {
    ;[80, 200, 400].forEach(function (ms) {
      followState.bumpTimers.push(setTimeout(function () {
        if (followState.active) bump(true)
      }, ms))
    })
  }

  function observeLayout(anchor) {
    if (typeof ResizeObserver === 'undefined') return
    followState.ro = new ResizeObserver(function () { bump() })
    var el = resolveAnchor(anchor)
    if (el) followState.ro.observe(el)
    var scrollEl = getActiveScrollEl()
    if (scrollEl) followState.ro.observe(scrollEl)
    if (anchor && anchor !== scrollEl && anchor.nodeType === 1) {
      followState.ro.observe(anchor)
    }
    var main = anchor.closest
      ? anchor.closest('.course-scroll-main')
      : null
    if (!main && el && el.querySelector) {
      main = el.querySelector('.course-scroll-main')
    }
    if (main && main !== scrollEl) followState.ro.observe(main)
    var panel = anchor && anchor.querySelector
      ? anchor.querySelector('.cc-guide-panel')
      : null
    if (!panel && el && el.querySelector) {
      panel = el.querySelector('.cc-guide-panel')
    }
    if (panel) {
      followState.ro.observe(panel)
      var activeSection = panel.querySelector('.cc-guide-section:not(.is-hidden) .cc-guide-node.is-active')
      activeSection = activeSection ? activeSection.closest('.cc-guide-section') : null
      if (activeSection) {
        var activeSlot = interleavedSlotForSection(activeSection)
        if (activeSlot) followState.ro.observe(activeSlot)
      }
    }
    if (followState.stage && followState.stage !== scrollEl) {
      followState.ro.observe(followState.stage)
    }
  }

  function follow(anchor, opts) {
    opts = opts || {}
    if (!configureFollow(anchor, opts)) return
    if (opts.preserveScroll) return
    followState.active = true

    // 锁定 target：内容已渲染完毕，一次计算后阻尼平滑收敛到目标位置
    // ResizeObserver 确保 tick 持续运行，1200ms 后 finalSnap 做一次最终校准
    followState._tickTarget = clampScrollTarget(pickRevealTarget(followState.anchor))

    bump()
    observeLayout(anchor)

    followState._cancelFollow = function () {
      if (followState.active) stop()
    }
    var scrollEl = getActiveScrollEl()
    if (scrollEl) {
      attachScrollListener(scrollEl, 'wheel')
      attachScrollListener(scrollEl, 'touchmove')
    }
    if (followState.stage && followState.stage !== scrollEl) {
      attachScrollListener(followState.stage, 'wheel')
      attachScrollListener(followState.stage, 'touchmove')
    }

    followState.stopTimer = setTimeout(function () {
      finalSnap()
      stop()
    }, 1200)
  }

  function resetScrollPast() {
    var scrollEl = getActiveScrollEl()
    if (scrollEl) {
      clearScrollCapacity(scrollEl)
    }
  }

  window.AIClassScrollFollow = {
    follow: follow,
    reveal: reveal,
    stop: stop,
    finalSnap: finalSnap,
    resetScrollPast: resetScrollPast
  }
})()

// 内容追加后阻尼跟随滚动 — 支持 .lf-stage 与 split 布局内层滚动（如 course-scroll-main）
;(function () {
  var INNER_SCROLL_BOTTOM_INSET = 20

  var OUTER_NEED_PX = 12

  var followState = {
    raf: null,
    ro: null,
    stopTimer: null,
    bumpTimers: [],
    anchor: null,
    stage: null,
    scrollEl: null,
    pageEl: null,
    padding: 120,
    topPadding: 40,
    active: false,
    alignStart: false,
    scrollPastEl: null,
    scrollPastGap: 8,
    preserveScroll: false,
    phase: null,
    _innerScrollEl: null,
    _innerAlignStart: false,
    _innerPadding: INNER_SCROLL_BOTTOM_INSET,
    _lockListeners: [],
    _animFrom: 0,
    _animTo: 0,
    _animStart: null,
    _animDuration: 0
  }

  function getStage() {
    return document.querySelector('.lf-stage')
  }

  function blockUserScroll(e) {
    e.preventDefault()
  }

  function detachInputLock() {
    followState._lockListeners.forEach(function (entry) {
      entry.el.removeEventListener(entry.type, blockUserScroll)
    })
    followState._lockListeners = []
  }

  function attachInputLock(el, type) {
    if (!el) return
    el.addEventListener(type, blockUserScroll, { passive: false })
    followState._lockListeners.push({ el: el, type: type })
  }

  function lockUserInput() {
    detachInputLock()
    var stage = followState.stage || getStage()
    var inner = followState._innerScrollEl
    var active = followState.scrollEl
    ;[stage, inner, active].forEach(function (el) {
      if (!el) return
      attachInputLock(el, 'wheel')
      attachInputLock(el, 'touchmove')
    })
  }

  function stop() {
    followState.active = false
    followState._tickTarget = NaN
    followState.phase = null
    followState._animStart = null
    followState._animDuration = 0
    followState._animFrom = 0
    followState._animTo = 0
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
    followState.pageEl = null
    followState._innerScrollEl = null
    followState._innerAlignStart = false
    detachInputLock()
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

  function stackContentBottom(scrollEl) {
    if (!scrollEl || !scrollEl.querySelector) return 0
    var stack = scrollEl.querySelector('.course-scroll-stack')
    if (!stack) return 0
    var bottom = stack.getBoundingClientRect().top
    Array.prototype.forEach.call(stack.children, function (child) {
      if (!child.getBoundingClientRect) return
      if (child.classList && child.classList.contains('sf-scroll-spacer')) return
      bottom = Math.max(bottom, child.getBoundingClientRect().bottom)
    })
    return bottom
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
    var visualDelta = bottom - scrollRect.bottom + padding
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

  // 手写板保留在文档流中；底部垫高保证可滚动手写板完全离开视口，同时仍可向上滚回查看
  function ensureScrollPastCapacity(scrollEl, pastEl, topPadding) {
    if (!scrollEl || !pastEl) return
    var stack = getScrollStack(scrollEl)
    if (!stack) return
    var reveal = pickScrollPastReveal(pastEl)
    var latest = findRevealBlock(followState.anchor, scrollEl)
    if (latest && pastEl.compareDocumentPosition) {
      var pos = pastEl.compareDocumentPosition(latest)
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        reveal = latest
      }
    }
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

  function collapseHandwritingPast(el) {
    if (!el || !el.classList) return
    el.classList.add('lf-block-handwriting--past')
  }

  function expandHandwritingPast(scrollEl) {
    if (!scrollEl || !scrollEl.querySelectorAll) return
    scrollEl.querySelectorAll('.lf-block-handwriting--past').forEach(function (node) {
      node.classList.remove('lf-block-handwriting--past')
      node.style.display = ''
    })
  }

  function measureScrollPastInner(scrollEl, el, gap) {
    if (!scrollEl || !el) return 0
    gap = gap != null ? gap : followState.scrollPastGap
    collapseHandwritingPast(el)
    ensureScrollPastCapacity(scrollEl, el, followState.topPadding)
    void scrollEl.offsetHeight
    var scrollRect = scrollEl.getBoundingClientRect()
    var scaleY = getScrollElScaleY(scrollEl)

    // 优先跟到「手写板之后的最新内容」（本步新 push），否则退回手写板后第一个节点
    var reveal = pickScrollPastReveal(el)
    var latest = findRevealBlock(followState.anchor, scrollEl)
    if (latest && el.compareDocumentPosition) {
      var pos = el.compareDocumentPosition(latest)
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        reveal = latest
      }
    }
    if (reveal) {
      ensureScrollPastCapacity(scrollEl, el, followState.topPadding)
      void scrollEl.offsetHeight
      scrollRect = scrollEl.getBoundingClientRect()
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
    var target = absBottom - stage.clientHeight + followState.padding
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

  function resolvePageEl(anchor, opts) {
    if (opts && opts.pageEl) return opts.pageEl
    if (!anchor) return null
    if (anchor.classList && anchor.classList.contains('course-container')) return anchor
    return anchor.closest ? anchor.closest('.course-container') : null
  }

  function isTwoLayerFollow() {
    var stage = followState.stage
    var inner = followState._innerScrollEl
    return !!(stage && inner && inner !== stage && !isStageScroll(inner))
  }

  function measureOuterPageTarget() {
    var stage = followState.stage
    var pageEl = followState.pageEl
    if (!stage || !pageEl) return 0
    return measureTopTargetStage(pageEl, stage, followState.topPadding)
  }

  function needsOuterPhase() {
    if (!isTwoLayerFollow()) return false
    var stage = followState.stage
    if (!stage || !followState.pageEl) return false
    if (stage.classList && stage.classList.contains('lf-scroll-locked')) return false
    var maxScroll = stage.scrollHeight - stage.clientHeight
    if (maxScroll <= 1) return false
    return Math.abs(stage.scrollTop - measureOuterPageTarget()) > OUTER_NEED_PX
  }

  function configureFollow(anchor, opts) {
    opts = opts || {}
    stop()
    var stage = opts.stage || getStage()
    if (!stage || !anchor) return false
    var scrollEl = opts.scrollEl || stage
    var layoutScrollEl = opts.layoutScrollEl || scrollEl
    if (layoutScrollEl && opts.resetPast) {
      expandHandwritingPast(layoutScrollEl)
      clearScrollCapacity(layoutScrollEl)
    }
    var innerEl = (scrollEl && scrollEl !== stage && !isStageScroll(scrollEl)) ? scrollEl : null
    followState.anchor = anchor
    followState.stage = stage
    followState.scrollEl = scrollEl
    followState.pageEl = resolvePageEl(anchor, opts)
    followState._innerScrollEl = innerEl
    followState._innerAlignStart = !!opts.alignStart
    followState.padding = opts.padding != null
      ? opts.padding
      : (isStageScroll(scrollEl) ? 120 : INNER_SCROLL_BOTTOM_INSET)
    followState._innerPadding = followState.padding
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

  function armPhaseTimer(ms, onTimeout) {
    if (followState.stopTimer) {
      clearTimeout(followState.stopTimer)
      followState.stopTimer = null
    }
    followState.stopTimer = setTimeout(function () {
      followState.stopTimer = null
      if (typeof onTimeout === 'function') onTimeout()
    }, ms)
  }

  // 先加速再减速：两端柔、中间快，变速过程更明显
  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function durationForDistance(dist, kind) {
    var d = Math.abs(dist)
    if (kind === 'outer') {
      // 远距离翻页：约 0.55s～1.25s
      return Math.min(1250, Math.max(560, 520 + d * 0.7))
    }
    // 内层跟最新：约 0.4s～1.0s
    return Math.min(1000, Math.max(400, 340 + d * 0.9))
  }

  function startAnim(target) {
    var scrollEl = getActiveScrollEl()
    var from = scrollEl ? scrollEl.scrollTop : 0
    followState._tickTarget = target
    followState._animFrom = from
    followState._animTo = target
    followState._animStart = performance.now()
    followState._animDuration = durationForDistance(
      target - from,
      followState.phase === 'outer' ? 'outer' : 'inner'
    )
  }

  function beginInnerPhase(opts) {
    opts = opts || {}
    if (!followState.active) return
    followState.phase = 'inner'
    if (followState._innerScrollEl) {
      followState.scrollEl = followState._innerScrollEl
      // 外层刚把目标页滚回视窗：保留该页内层当前位置，只从这里跟到最新；
      // 不要用 alignStart 把内层重新顶到上方再滚
      followState.alignStart = opts.fromOuter ? false : followState._innerAlignStart
      followState.padding = followState._innerPadding
    }
    var target = clampScrollTarget(pickRevealTarget(followState.anchor))
    var scrollEl = getActiveScrollEl()
    if (!scrollEl || Math.abs(target - scrollEl.scrollTop) < 1) {
      if (scrollEl) scrollEl.scrollTop = target
      followState._tickTarget = target
      if (followState.stopTimer) {
        clearTimeout(followState.stopTimer)
        followState.stopTimer = null
      }
      finalSnap()
      stop()
      return
    }
    startAnim(target)
    armPhaseTimer(followState._animDuration + 220, function () {
      finalSnap()
      stop()
    })
    bump()
  }

  function beginOuterPhase() {
    if (!followState.active) return
    followState.phase = 'outer'
    followState.scrollEl = followState.stage
    followState.alignStart = true
    var target = clampScrollTarget(measureOuterPageTarget())
    var scrollEl = getActiveScrollEl()
    if (!scrollEl || Math.abs(target - scrollEl.scrollTop) < OUTER_NEED_PX) {
      if (scrollEl) scrollEl.scrollTop = target
      beginInnerPhase({ fromOuter: true })
      return
    }
    startAnim(target)
    armPhaseTimer(followState._animDuration + 220, function () {
      finalSnap()
      beginInnerPhase({ fromOuter: true })
    })
    bump()
  }

  function onPhaseSettled() {
    if (!followState.active) return
    if (followState.phase === 'outer') {
      beginInnerPhase({ fromOuter: true })
      return
    }
    if (followState.stopTimer) {
      clearTimeout(followState.stopTimer)
      followState.stopTimer = null
    }
    finalSnap()
    stop()
  }

  function resolvePhaseTarget() {
    if (followState.phase === 'outer') {
      return clampScrollTarget(measureOuterPageTarget())
    }
    return clampScrollTarget(pickRevealTarget(followState.anchor))
  }

  function tick(now) {
    if (!followState.active) return
    var scrollEl = getActiveScrollEl()
    if (!scrollEl) {
      followState.raf = null
      return
    }

    now = now != null ? now : performance.now()

    // 目标失效时从当前位置重新开一段缓出动画
    if (isNaN(followState._tickTarget) || followState._animStart == null) {
      startAnim(resolvePhaseTarget())
    }

    var elapsed = now - followState._animStart
    var duration = followState._animDuration || 1
    var t = elapsed / duration

    if (t >= 1) {
      scrollEl.scrollTop = followState._animTo
      followState.raf = null
      followState._animStart = null
      onPhaseSettled()
      return
    }

    var eased = easeInOutCubic(Math.max(0, Math.min(1, t)))
    scrollEl.scrollTop = followState._animFrom +
      (followState._animTo - followState._animFrom) * eased
    followState.raf = requestAnimationFrame(tick)
  }

  function bump(recompute) {
    if (!followState.active) return
    // 布局变化：不重算目标，只保证 tick 在跑
    // 显式 recompute：从当前位置重新缓出到新目标
    if (recompute) {
      followState._tickTarget = NaN
      followState._animStart = null
    }
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
    lockUserInput()
    observeLayout(anchor)

    // 两层：若外层未把目标页顶进视窗，先外层到位（同首次），再内层跟到最新；
    // 自动滚动期间锁定用户手势，结束后解锁（见 stop → detachInputLock）
    if (needsOuterPhase()) {
      beginOuterPhase()
    } else {
      beginInnerPhase()
    }
  }

  function resetScrollPast() {
    var scrollEl = getActiveScrollEl()
    if (scrollEl) {
      expandHandwritingPast(scrollEl)
      clearScrollCapacity(scrollEl)
    }
  }

  window.AIClassScrollFollow = {
    follow: follow,
    reveal: reveal,
    stop: stop,
    finalSnap: finalSnap,
    resetScrollPast: resetScrollPast,
    isActive: function () { return !!followState.active },
    getPhase: function () { return followState.phase }
  }
})()

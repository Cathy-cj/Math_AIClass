// 自绘 overlay 滚动条 — 隐藏原生条，细 pill；布局稳定优先，避免 thumb 顶部抖动
;(function () {
  var MIN_THUMB = 24
  var HIDE_MS = 1000
  var INSET = 4
  var RAIL_WIDTH = 4
  var SH_STABLE_DELTA = 8
  var THUMB_STABLE_DELTA = 4
  var MIN_SCROLL_RANGE = 16

  function readCornerPad(el) {
    if (!el) return 0
    var cs = window.getComputedStyle(el)
    var r = parseFloat(cs.borderTopRightRadius) || parseFloat(cs.borderRadius) || 0
    if (r <= 0) return 0
    return Math.min(Math.max(4, Math.round(r * 0.58)), 14)
  }

  function readGutter(el, fallback) {
    fallback = fallback != null ? fallback : 14
    if (!el || !window.getComputedStyle) return fallback
    var cs = window.getComputedStyle(el)
    var raw = cs.getPropertyValue('--aic-overlay-scrollbar-gutter').trim()
    if (raw) {
      var fromVar = parseFloat(raw)
      if (!isNaN(fromVar) && fromVar > 0) return fromVar
    }
    var pad = parseFloat(cs.paddingRight)
    if (!isNaN(pad) && pad > 0) return pad
    return fallback
  }

  function attach(host, scrollEl, options) {
    if (!host || !scrollEl) return null
    options = options || {}
    if (host.getAttribute('data-overlay-scrollbar') === '1') {
      return typeof host._overlayScrollbarApi === 'object' ? host._overlayScrollbarApi : null
    }
    host.setAttribute('data-overlay-scrollbar', '1')
    scrollEl.classList.add('aic-overlay-scroll')
    if (options.gutter != null) {
      host.style.setProperty('--aic-overlay-scrollbar-gutter', options.gutter + 'px')
    }

    var alignEl = options.alignEl || scrollEl
    var clipEl = options.clipEl || host
    var contentEl = options.contentEl || scrollEl.firstElementChild || scrollEl
    var hideMs = options.hideMs != null ? options.hideMs : HIDE_MS
    var useOffsetMetrics = alignEl === scrollEl && host === scrollEl

    var rail = document.createElement('div')
    rail.className = 'aic-overlay-scrollbar'
    rail.setAttribute('aria-hidden', 'true')
    var thumb = document.createElement('div')
    thumb.className = 'aic-overlay-scrollbar-thumb'
    rail.appendChild(thumb)
    host.appendChild(rail)

    var hideTimer = null
    var layoutRaf = null
    var thumbRaf = null
    var moTimer = null
    var cache = {
      sh: 0,
      ch: 0,
      railTop: -1,
      railH: 0,
      railRight: -1,
      thumbH: 0,
      thumbTop: -1,
      visible: false
    }

    function trackMetrics() {
      var cornerPad = readCornerPad(clipEl)
      var gutter = readGutter(host)
      if (useOffsetMetrics) {
        return {
          top: cornerPad,
          height: Math.max(0, scrollEl.clientHeight - cornerPad * 2),
          gutter: gutter
        }
      }
      var hostRect = host.getBoundingClientRect()
      var portRect = alignEl.getBoundingClientRect()
      return {
        top: Math.max(0, Math.round(portRect.top - hostRect.top + cornerPad)),
        height: Math.max(0, Math.round(portRect.height - cornerPad * 2)),
        gutter: gutter
      }
    }

    function hideRail() {
      cache.visible = false
      rail.style.display = 'none'
    }

  function needsHide(sh, ch) {
    return sh <= ch + 2 || sh - ch <= MIN_SCROLL_RANGE
  }

    function readScrollMetrics() {
      return {
        sh: scrollEl.scrollHeight,
        ch: scrollEl.clientHeight,
        st: scrollEl.scrollTop
      }
    }

    function shouldUpdateScrollMetrics(sh, ch) {
      if (needsHide(sh, ch) || needsHide(cache.sh, cache.ch)) return true
      if (!cache.visible) return true
      return Math.abs(sh - cache.sh) >= SH_STABLE_DELTA || Math.abs(ch - cache.ch) >= 2
    }

    function applyThumb(thumbH, thumbTop) {
      thumbH = Math.round(thumbH)
      thumbTop = Math.round(thumbTop)
      if (
        cache.thumbH === thumbH &&
        cache.thumbTop === thumbTop
      ) return
      cache.thumbH = thumbH
      cache.thumbTop = thumbTop
      thumb.style.height = thumbH + 'px'
      thumb.style.transform = 'translate3d(0,' + thumbTop + 'px,0)'
    }

    function computeThumb(sh, ch, st, trackH) {
      var thumbH = Math.round(trackH * (ch / sh))
      thumbH = Math.max(MIN_THUMB, Math.min(thumbH, trackH - 4))
      var travel = Math.max(0, trackH - thumbH)
      var maxScroll = sh - ch
      var top = 0
      if (maxScroll > 0) {
        if (st <= 2) top = 0
        else if (st >= maxScroll - 2) top = travel
        else top = (st / maxScroll) * travel
      }
      if (top > travel) top = travel
      if (top < 0) top = 0

      if (
        cache.thumbH > 0 &&
        st <= 2 &&
        Math.abs(thumbH - cache.thumbH) < THUMB_STABLE_DELTA
      ) {
        thumbH = cache.thumbH
      }
      return { thumbH: thumbH, thumbTop: top }
    }

    function syncThumb(forceMetrics) {
      var live = readScrollMetrics()
      if (needsHide(live.sh, live.ch)) {
        hideRail()
        cache.sh = live.sh
        cache.ch = live.ch
        return
      }
      if (!cache.visible || cache.railH < MIN_THUMB + 4) return
      if (forceMetrics !== true && !shouldUpdateScrollMetrics(live.sh, live.ch)) {
        live.sh = cache.sh
        live.ch = cache.ch
      } else {
        cache.sh = live.sh
        cache.ch = live.ch
      }
      var t = computeThumb(live.sh, live.ch, live.st, cache.railH)
      applyThumb(t.thumbH, t.thumbTop)
    }

    function railRightFromMetrics(m) {
      if (options.inset != null) return options.inset
      return Math.max(0, (m.gutter - RAIL_WIDTH) / 2)
    }

    function pinRailToViewport(st) {
      // host===scrollEl 时 rail 是滚动容器子节点，须用 scrollTop 抵消，否则会随内容滚出视口
      if (host !== scrollEl || !cache.visible) return
      rail.style.top = cache.railTop + st + 'px'
    }

    function syncLayout() {
      layoutRaf = null
      var live = readScrollMetrics()
      var m = trackMetrics()
      var railRight = railRightFromMetrics(m)

      if (needsHide(live.sh, live.ch) || m.height < MIN_THUMB + 4) {
        hideRail()
        cache.sh = live.sh
        cache.ch = live.ch
        return
      }

      var metricsChanged = shouldUpdateScrollMetrics(live.sh, live.ch)
      var layoutChanged =
        m.top !== cache.railTop ||
        m.height !== cache.railH ||
        railRight !== cache.railRight

      if (metricsChanged) {
        cache.sh = live.sh
        cache.ch = live.ch
      }

      var wasVisible = cache.visible
      if (layoutChanged || !wasVisible) {
        cache.visible = true
        cache.railTop = m.top
        cache.railH = m.height
        cache.railRight = railRight
        rail.style.display = ''
        rail.style.right = railRight + 'px'
        rail.style.bottom = 'auto'
        rail.style.height = m.height + 'px'
      }

      // host===scrollEl：用 scrollTop 钉轨；否则只在布局变化时写 top
      if (host === scrollEl) pinRailToViewport(live.st)
      else if (layoutChanged || !wasVisible) rail.style.top = m.top + 'px'

      syncThumb(true)
    }

    function scheduleLayoutSync() {
      if (layoutRaf) return
      layoutRaf = window.requestAnimationFrame(syncLayout)
    }

    function scheduleThumbSync() {
      if (thumbRaf) return
      thumbRaf = window.requestAnimationFrame(function () {
        thumbRaf = null
        if (!cache.visible) syncLayout()
        else syncThumb(false)
      })
    }

    function showActive() {
      host.classList.add('aic-overlay-scrollbar-active')
      if (hideTimer) window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(function () {
        host.classList.remove('aic-overlay-scrollbar-active')
        hideTimer = null
      }, hideMs)
    }

    function pulse() {
      syncLayout()
      showActive()
    }

    function onScroll() {
      var live = readScrollMetrics()
      if (needsHide(live.sh, live.ch)) {
        hideRail()
        cache.sh = live.sh
        cache.ch = live.ch
        return
      }
      pinRailToViewport(live.st)
      scheduleThumbSync()
      showActive()
    }

    scrollEl.addEventListener('scroll', onScroll, { passive: true })

    var onWheelForward = null

    function bindWheelForward() {
      if (host !== scrollEl) return
      onWheelForward = function (e) {
        var max = scrollEl.scrollHeight - scrollEl.clientHeight
        if (max <= 1) return
        var st = scrollEl.scrollTop
        var next = st + e.deltaY
        if (next < 0) next = 0
        else if (next > max) next = max
        if (Math.abs(next - st) < 0.5) return
        scrollEl.scrollTop = next
        e.preventDefault()
        onScroll()
      }
      host.addEventListener('wheel', onWheelForward, { passive: false })
    }

    function bindThumbDrag() {
      var drag = null
      function onThumbDown(e) {
        if (!cache.visible || cache.railH < MIN_THUMB + 4) return
        e.preventDefault()
        e.stopPropagation()
        var live = readScrollMetrics()
        var maxScroll = Math.max(0, live.sh - live.ch)
        if (maxScroll <= 0) return
        // 用可视矩形算 travel，自动消化 .lf-stage 的 transform: scale
        var railRect = rail.getBoundingClientRect()
        var thumbRect = thumb.getBoundingClientRect()
        drag = {
          startY: e.clientY,
          startScroll: live.st,
          travel: Math.max(0, railRect.height - thumbRect.height),
          maxScroll: maxScroll
        }
        showActive()
        window.addEventListener('pointermove', onThumbMove)
        window.addEventListener('pointerup', onThumbUp)
        window.addEventListener('pointercancel', onThumbUp)
      }
      function onThumbMove(e) {
        if (!drag) return
        if (drag.travel <= 0) return
        var delta = e.clientY - drag.startY
        var scrollDelta = (delta / drag.travel) * drag.maxScroll
        scrollEl.scrollTop = Math.max(0, Math.min(drag.maxScroll, drag.startScroll + scrollDelta))
        onScroll()
      }
      function onThumbUp() {
        drag = null
        window.removeEventListener('pointermove', onThumbMove)
        window.removeEventListener('pointerup', onThumbUp)
        window.removeEventListener('pointercancel', onThumbUp)
      }
      thumb.addEventListener('pointerdown', onThumbDown)
    }

    bindWheelForward()
    bindThumbDrag()

    var ro = window.ResizeObserver
      ? new ResizeObserver(function () {
          scheduleLayoutSync()
        })
      : null
    if (ro) {
      ro.observe(scrollEl)
    }

    var mo = window.MutationObserver
      ? new MutationObserver(function () {
          if (moTimer) window.clearTimeout(moTimer)
          moTimer = window.setTimeout(function () {
            moTimer = null
            scheduleLayoutSync()
          }, 120)
        })
      : null
    if (mo && contentEl) {
      mo.observe(contentEl, { childList: true, subtree: true })
    }

    window.addEventListener('resize', scheduleLayoutSync)

    syncLayout()

    function teardown() {
      if (hideTimer) window.clearTimeout(hideTimer)
      if (moTimer) window.clearTimeout(moTimer)
      hideTimer = null
      moTimer = null
      if (layoutRaf) window.cancelAnimationFrame(layoutRaf)
      if (thumbRaf) window.cancelAnimationFrame(thumbRaf)
      layoutRaf = null
      thumbRaf = null
      scrollEl.removeEventListener('scroll', onScroll)
      if (onWheelForward) host.removeEventListener('wheel', onWheelForward)
      window.removeEventListener('resize', scheduleLayoutSync)
      if (ro) ro.disconnect()
      if (mo) mo.disconnect()
      host.classList.remove('aic-overlay-scrollbar-active')
      host.removeAttribute('data-overlay-scrollbar')
      scrollEl.classList.remove('aic-overlay-scroll')
      if (rail.parentNode) rail.parentNode.removeChild(rail)
      host._overlayScrollbarApi = null
      host._overlayScrollbarTeardown = null
    }

    var api = {
      sync: function () {
        syncLayout()
      },
      pulse: pulse,
      teardown: teardown
    }
    host._overlayScrollbarApi = api
    host._overlayScrollbarTeardown = teardown
    return api
  }

  window.AIClassOverlayScrollbar = { attach: attach }
})()

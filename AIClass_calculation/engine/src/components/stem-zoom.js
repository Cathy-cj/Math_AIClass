// 题干展开（StemExpand）— 通用组件：顶栏题干限高，点「展开」仅向下拉高，宽度与收起态一致
// 挂载：AIClassStemExpand.mount(container) — text-only / top-split / left-right
;(function () {
  var EXPAND_LABEL = '展开'
  var COLLAPSE_LABEL = '收起'
  var EXPAND_LAYOUTS = { 'text-only': true, 'top-split': true, 'left-right': true }
  var CHEVRON_SVG =
    '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>'
  var OVERFLOW_SLACK_PX = 16

  function overflowPx(el) {
    return Math.max(0, el.scrollHeight - el.clientHeight)
  }

  function isStemTruncated(el) {
    return overflowPx(el) > OVERFLOW_SLACK_PX
  }

  function mount(container) {
    if (!container || !container.el || !container.scrollEl) return
    if (!EXPAND_LAYOUTS[container.layout]) return
    var scrollEl = container.scrollEl
    if (scrollEl.getAttribute('data-stem-expand') === '1') return
    scrollEl.setAttribute('data-stem-expand', '1')

    var innerScroll = document.createElement('div')
    innerScroll.className = 'stem-expand-scroll'
    while (scrollEl.firstChild) {
      innerScroll.appendChild(scrollEl.firstChild)
    }
    scrollEl.appendChild(innerScroll)

    var chrome = document.createElement('div')
    chrome.className = 'stem-expand-chrome'
    chrome.setAttribute('aria-hidden', 'true')

    var fade = document.createElement('div')
    fade.className = 'stem-expand-fade'
    chrome.appendChild(fade)
    scrollEl.appendChild(chrome)

    var overlayApi = null
    if (window.AIClassOverlayScrollbar && typeof window.AIClassOverlayScrollbar.attach === 'function') {
      overlayApi = window.AIClassOverlayScrollbar.attach(scrollEl, innerScroll, {
        alignEl: innerScroll,
        clipEl: scrollEl
      })
    }

    var bar = document.createElement('div')
    bar.className = 'stem-expand-bar'

    var spacer = null
    var openSnapshot = null
    var labelEl = null
    var rafPending = false
    var initDone = false
    var initTimer = null
    var scrollAnimRaf = null

    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'stem-expand-btn'
    btn.innerHTML =
      '<span class="stem-expand-icon">' + CHEVRON_SVG + '</span>' +
      '<span class="stem-expand-label">' + EXPAND_LABEL + '</span>'
    labelEl = btn.querySelector('.stem-expand-label')
    btn.setAttribute('aria-label', '展开查看完整题干')
    btn.setAttribute('aria-expanded', 'false')
    bar.appendChild(btn)
    scrollEl.appendChild(bar)
    scrollEl.classList.add('stem-expand-init')

    function isShellNode(node) {
      if (!node || node.nodeType !== 1) return false
      if (node === innerScroll || node === chrome || node === bar) return true
      return !!(node.classList && node.classList.contains('stem-expand-spacer'))
    }

    function setLabel(text) {
      if (labelEl) labelEl.textContent = text
    }

    function isOpen() {
      return scrollEl.classList.contains('stem-expand-open')
    }

    function syncOverlayScrollbar() {
      if (overlayApi) overlayApi.sync()
    }

    function refreshNow() {
      if (isOpen()) {
        scrollEl.classList.remove('stem-expand-truncated')
        innerScroll.classList.remove('stem-expand-fits')
        chrome.style.display = 'none'
        bar.style.display = ''
        btn.style.display = ''
        syncOverlayScrollbar()
        return
      }
      var truncated = isStemTruncated(innerScroll)
      scrollEl.classList.toggle('stem-expand-truncated', truncated)
      innerScroll.classList.toggle('stem-expand-fits', !truncated)
      if (!initDone) {
        chrome.style.display = 'none'
        bar.style.display = 'none'
        return
      }
      chrome.style.display = truncated ? '' : 'none'
      bar.style.display = truncated ? '' : 'none'
      syncOverlayScrollbar()
      if (!truncated) {
        window.requestAnimationFrame(function () {
          syncOverlayScrollbar()
        })
      }
    }

    function finishInitReveal() {
      refreshNow()
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          scrollEl.classList.remove('stem-expand-init')
        })
      })
    }

    function completeInit() {
      if (initDone) return
      initDone = true
      if (initTimer) {
        window.clearTimeout(initTimer)
        initTimer = null
      }
      if (document.fonts && typeof document.fonts.ready === 'object' && document.fonts.ready.then) {
        document.fonts.ready.then(finishInitReveal).catch(finishInitReveal)
      } else {
        finishInitReveal()
      }
    }

    function scheduleInitComplete() {
      if (initDone) return
      if (initTimer) window.clearTimeout(initTimer)
      initTimer = window.setTimeout(completeInit, 80)
    }

    function refresh() {
      refreshNow()
      if (!initDone) scheduleInitComplete()
      if (rafPending) return
      rafPending = true
      window.requestAnimationFrame(function () {
        rafPending = false
        refreshNow()
      })
    }

    function adoptDirectContent() {
      var moved = false
      Array.prototype.slice.call(scrollEl.childNodes).forEach(function (node) {
        if (isShellNode(node)) return
        innerScroll.appendChild(node)
        moved = true
      })
      if (moved) refresh()
    }

    adoptDirectContent()

    var settleTimer = null
    function scheduleSettle(fn) {
      if (settleTimer) window.clearTimeout(settleTimer)
      var done = false
      function finish() {
        if (done) return
        done = true
        settleTimer = null
        scrollEl.removeEventListener('transitionend', onEnd)
        fn()
      }
      function onEnd(event) {
        if (event && event.propertyName === 'max-height') finish()
      }
      scrollEl.addEventListener('transitionend', onEnd)
      settleTimer = window.setTimeout(finish, 400)
    }

    function captureSnapshot() {
      return {
        top: scrollEl.offsetTop,
        left: scrollEl.offsetLeft,
        width: scrollEl.offsetWidth,
        height: scrollEl.offsetHeight
      }
    }

    function applyOpenStyles(snapshot) {
      scrollEl.style.top = snapshot.top + 'px'
      scrollEl.style.left = snapshot.left + 'px'
      scrollEl.style.width = snapshot.width + 'px'
      scrollEl.style.right = 'auto'
    }

    function clearOpenStyles() {
      scrollEl.style.top = ''
      scrollEl.style.left = ''
      scrollEl.style.width = ''
      scrollEl.style.right = ''
      scrollEl.style.maxHeight = ''
    }

    function open() {
      openSnapshot = captureSnapshot()
      spacer = document.createElement('div')
      spacer.className = 'stem-expand-spacer'
      spacer.style.height = openSnapshot.height + 'px'
      scrollEl.parentNode.insertBefore(spacer, scrollEl)

      scrollEl.classList.add('stem-expand-animating')
      scrollEl.classList.remove('stem-expand-truncated')
      scrollEl.classList.add('stem-expand-open')
      applyOpenStyles(openSnapshot)
      scrollEl.style.maxHeight = openSnapshot.height + 'px'
      void scrollEl.offsetHeight
      scrollEl.style.maxHeight = scrollEl.scrollHeight + 'px'

      btn.classList.add('is-open')
      setLabel(COLLAPSE_LABEL)
      btn.setAttribute('aria-expanded', 'true')
      bar.classList.add('is-open')
      scheduleSettle(function () {
        scrollEl.classList.remove('stem-expand-animating')
        refresh()
      })
    }

    function close() {
      scrollEl.classList.add('stem-expand-animating')
      if (openSnapshot) scrollEl.style.maxHeight = openSnapshot.height + 'px'
      btn.classList.remove('is-open')
      bar.classList.remove('is-open')
      setLabel(EXPAND_LABEL)
      btn.setAttribute('aria-expanded', 'false')
      scheduleSettle(function () {
        scrollEl.classList.remove('stem-expand-open', 'stem-expand-animating')
        clearOpenStyles()
        if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer)
        spacer = null
        openSnapshot = null
        refresh()
      })
    }

    btn.addEventListener('click', function (event) {
      event.stopPropagation()
      if (isOpen()) close()
      else open()
    })

    function onDocClick(event) {
      if (!isOpen()) return
      if (scrollEl.contains(event.target) || bar.contains(event.target)) return
      close()
    }
    document.addEventListener('click', onDocClick)

    var observer = window.MutationObserver ? new MutationObserver(refresh) : null
    if (observer) observer.observe(innerScroll, { childList: true, subtree: true, attributes: false })

    var shellObserver = window.MutationObserver
      ? new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
              if (isShellNode(node)) return
              innerScroll.appendChild(node)
            })
          })
          refresh()
        })
      : null
    if (shellObserver) shellObserver.observe(scrollEl, { childList: true })

    var ro = window.ResizeObserver ? new ResizeObserver(refresh) : null
    if (ro) {
      ro.observe(scrollEl)
      ro.observe(innerScroll)
    }
    window.addEventListener('resize', refresh)

    refresh()
    scheduleInitComplete()

    function getFadeInset() {
      if (!fade) return 20
      var h = parseFloat(window.getComputedStyle(fade).height)
      return isNaN(h) ? 20 : h + 8
    }

    function cancelScrollAnim() {
      if (scrollAnimRaf) {
        cancelAnimationFrame(scrollAnimRaf)
        scrollAnimRaf = null
      }
    }

    function pulseStemScrollbar() {
      if (overlayApi) overlayApi.pulse()
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3)
    }

    function animateScrollTo(targetTop, duration) {
      cancelScrollAnim()
      var from = innerScroll.scrollTop
      var to = Math.max(0, targetTop)
      if (Math.abs(to - from) < 1) return
      var ms = duration == null ? 360 : duration
      var start = null
      pulseStemScrollbar()
      function frame(ts) {
        if (!start) start = ts
        var p = Math.min(1, (ts - start) / ms)
        innerScroll.scrollTop = from + (to - from) * easeOutCubic(p)
        syncOverlayScrollbar()
        if (p < 1) {
          scrollAnimRaf = requestAnimationFrame(frame)
        } else {
          scrollAnimRaf = null
          innerScroll.scrollTop = to
          pulseStemScrollbar()
        }
      }
      scrollAnimRaf = requestAnimationFrame(frame)
    }

    function revealNodes(nodes) {
      if (!nodes || !nodes.length || isOpen()) return
      if (!isStemTruncated(innerScroll)) return
      var targets = []
      for (var i = 0; i < nodes.length; i++) {
        if (innerScroll.contains(nodes[i])) targets.push(nodes[i])
      }
      if (!targets.length) return
      window.requestAnimationFrame(function () {
        if (isOpen()) return
        var innerRect = innerScroll.getBoundingClientRect()
        var fadeInset = getFadeInset()
        var pad = 8
        var minTop = Infinity
        var maxBottom = -Infinity
        targets.forEach(function (node) {
          var rect = node.getBoundingClientRect()
          if (rect.top < minTop) minTop = rect.top
          if (rect.bottom > maxBottom) maxBottom = rect.bottom
        })
        if (!isFinite(minTop) || !isFinite(maxBottom)) return
        var scrollTop = innerScroll.scrollTop
        var clientH = innerScroll.clientHeight
        var minOffset = minTop - innerRect.top + scrollTop
        var maxOffset = maxBottom - innerRect.top + scrollTop
        if (maxOffset > scrollTop + clientH - fadeInset) {
          scrollTop = maxOffset - clientH + fadeInset
        }
        if (minOffset < scrollTop + pad) {
          scrollTop = Math.max(0, minOffset - pad)
        }
        animateScrollTo(scrollTop)
      })
    }

    var litObserver = window.MutationObserver
      ? new MutationObserver(function (mutations) {
          var litNodes = []
          mutations.forEach(function (mutation) {
            if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') return
            var node = mutation.target
            if (!node || node.nodeType !== 1 || !innerScroll.contains(node)) return
            if (node.classList && node.classList.contains('tx-stem-mark--lit')) {
              litNodes.push(node)
            }
          })
          if (litNodes.length) revealNodes(litNodes)
        })
      : null
    if (litObserver) {
      litObserver.observe(innerScroll, { subtree: true, attributes: true, attributeFilter: ['class'] })
    }

    function teardown() {
      cancelScrollAnim()
      if (overlayApi && typeof overlayApi.teardown === 'function') overlayApi.teardown()
      overlayApi = null
      if (initTimer) window.clearTimeout(initTimer)
      initTimer = null
      initDone = false
      if (settleTimer) window.clearTimeout(settleTimer)
      document.removeEventListener('click', onDocClick)
      window.removeEventListener('resize', refresh)
      if (observer) observer.disconnect()
      if (shellObserver) shellObserver.disconnect()
      if (litObserver) litObserver.disconnect()
      if (ro) ro.disconnect()
      scrollEl.classList.remove('stem-expand-open', 'stem-expand-truncated', 'stem-expand-init', 'stem-expand-animating')
      clearOpenStyles()
      if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer)
      spacer = null
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar)
      if (chrome && chrome.parentNode) chrome.parentNode.removeChild(chrome)
      if (innerScroll && innerScroll.parentNode) {
        while (innerScroll.firstChild) {
          scrollEl.insertBefore(innerScroll.firstChild, innerScroll)
        }
        innerScroll.parentNode.removeChild(innerScroll)
      }
      scrollEl.removeAttribute('data-stem-expand')
      container.el._stemExpandTeardown = null
    }

    container.el._stemExpandTeardown = teardown
  }

  window.AIClassStemExpand = { mount: mount, EXPAND_LABEL: EXPAND_LABEL, COLLAPSE_LABEL: COLLAPSE_LABEL }
})()

// 滚动条自动隐藏 — 滚动时显示（加 .is-scrolling），1s 无滚动淡出
// 事件委托 + capture：任何可滚动元素（含动态创建的课件容器）的 scroll 都会被捕获
;(function () {
  var HIDE_DELAY = 1000
  var timers = typeof WeakMap !== 'undefined' ? new WeakMap() : null
  var fallback = {}

  function timerGet(el) {
    return timers ? timers.get(el) : fallback[el]
  }
  function timerSet(el, t) {
    if (timers) timers.set(el, t)
    else fallback[el] = t
  }
  function timerDel(el) {
    if (timers) timers.delete(el)
    else delete fallback[el]
  }

  function isScrollable(el) {
    if (!el || el.nodeType !== 1) return false
    return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1
  }

  function show(el) {
    el.classList.add('is-scrolling')
    var timer = timerGet(el)
    if (timer) clearTimeout(timer)
    timerSet(el, setTimeout(function () {
      el.classList.remove('is-scrolling')
      timerDel(el)
    }, HIDE_DELAY))
  }

  document.addEventListener('scroll', function (event) {
    var el = event.target
    // 视口滚动时 Chrome/Firefox 的 target 是 document
    if (el === document) el = document.scrollingElement || document.documentElement
    if (isScrollable(el)) show(el)
  }, true)
})()

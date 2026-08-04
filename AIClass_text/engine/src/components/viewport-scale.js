// 视口缩放控制器 — 跟踪页面棋盘缩放 (--lf-board-scale) 与视口适配，resize 时自动刷新
// 独立于数学键盘：任何需要按设计尺寸缩放的组件都可订阅
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}

  var BOARD_SCALE_CSS_VAR = '--lf-board-scale'

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n))
  }

  function parsePositiveNumber(value) {
    var n = parseFloat(value)
    return n > 0 && isFinite(n) ? n : null
  }

  function readCssVariable(el, name) {
    if (!el) return ''
    return getComputedStyle(el).getPropertyValue(name).trim()
  }

  function defaultDesignSize() {
    return {
      width: Number(window.DESIGN_WIDTH) || 1200,
      height: Number(window.DESIGN_HEIGHT) || 680
    }
  }

  function createViewportScaleController(options) {
    options = options || {}
    var design = defaultDesignSize()
    var designWidth = Number(options.designWidth) || design.width
    var designHeight = Number(options.designHeight) || design.height
    var minScale = Number(options.minScale) || 0.72
    var maxScale = Number(options.maxScale) || 1.25
    var scaleRoot = options.scaleRoot || document.documentElement
    var listeners = []
    var lastScale = null
    var started = false

    function computeFromViewport() {
      return Math.min(window.innerWidth / designWidth, window.innerHeight / designHeight)
    }

    function getScale() {
      var fromBoard = parsePositiveNumber(readCssVariable(scaleRoot, BOARD_SCALE_CSS_VAR))
      var raw = fromBoard != null ? fromBoard : computeFromViewport()
      return clamp(raw, minScale, maxScale)
    }

    function notify(force) {
      var scale = getScale()
      if (!force && scale === lastScale) return
      lastScale = scale
      listeners.forEach(function (fn) { fn(scale) })
    }

    function onViewportChange() {
      notify(false)
    }

    function start() {
      if (started) return
      started = true
      window.addEventListener('resize', onViewportChange)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onViewportChange)
      }
      notify(true)
    }

    function stop() {
      if (!started) return
      started = false
      window.removeEventListener('resize', onViewportChange)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onViewportChange)
      }
    }

    function subscribe(fn) {
      listeners.push(fn)
      return function unsubscribe() {
        var index = listeners.indexOf(fn)
        if (index >= 0) listeners.splice(index, 1)
      }
    }

    function setDesignSize(width, height) {
      if (width > 0) designWidth = width
      if (height > 0) designHeight = height
      notify(true)
    }

    return {
      getScale: getScale,
      subscribe: subscribe,
      refresh: function () { notify(true) },
      setDesignSize: setDesignSize,
      start: start,
      stop: stop
    }
  }

  ns.createViewportScaleController = createViewportScaleController
})()

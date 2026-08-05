// 背景板缩放 — canvas（全屏自适应）与 stack（宽度等比缩放）两种模式
;(function () {
  function toCssSize(value) {
    if (value == null) return ''
    return typeof value === 'number' ? value + 'px' : String(value)
  }

  function removeById(root, id) {
    if (!root || !id) return
    var existing = root.querySelector('#' + id)
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing)
  }

  function designSize(layout) {
    layout = layout || {}
    return {
      width: layout.designWidth || window.DESIGN_WIDTH || 1200,
      height: layout.designHeight || window.DESIGN_HEIGHT || 680
    }
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v)
  }

  function sync(stage, bg, layout) {
    if (!stage) return
    var size = designSize(layout)
    var mode = (layout && layout.mode) || 'canvas'
    var scale, left, top

    if (mode === 'stack') {
      scale = clamp(window.innerWidth / size.width, 0.45, 1.2)
      left = Math.round((window.innerWidth - size.width * scale) / 2)
      top = 0

      stage.style.width = size.width + 'px'
      stage.style.height = Math.ceil(window.innerHeight / scale) + 'px'
      stage.style.minHeight = ''
      stage.style.left = left + 'px'
      stage.style.top = '0px'
      stage.style.overflowY = 'auto'
      stage.style.overflowX = 'hidden'
    } else {
      scale = Math.min(window.innerWidth / size.width, window.innerHeight / size.height)
      left = Math.round((window.innerWidth - size.width * scale) / 2)
      top = Math.round((window.innerHeight - size.height * scale) / 2)

      stage.style.width = size.width + 'px'
      stage.style.height = size.height + 'px'
      stage.style.left = left + 'px'
      stage.style.top = top + 'px'
      stage.style.overflow = 'auto'
    }

    stage.style.transform = 'scale(' + scale + ')'
    stage.style.transformOrigin = 'top left'

    document.documentElement.style.setProperty('--lf-board-scale', String(scale))
    document.documentElement.style.setProperty('--lf-board-offset-x', left + 'px')
    document.documentElement.style.setProperty('--lf-board-offset-y', top + 'px')

    if (bg) {
      var unit = 20 * scale
      bg.style.backgroundSize =
        unit + 'px ' + unit + 'px, ' +
        unit + 'px ' + unit + 'px, ' +
        (unit * 5) + 'px ' + (unit * 5) + 'px, ' +
        (unit * 5) + 'px ' + (unit * 5) + 'px'
      bg.style.backgroundPosition = left + 'px ' + top + 'px'
    }
  }

  function resolveMountRoot(config, id, bg, onResize) {
    config = config || {}
    var explicitRoot = config.root
      ? (typeof config.root === 'string' ? document.querySelector(config.root) : config.root)
      : null
    var hostRoot = explicitRoot || document.getElementById(window.CONTENT_ID || 'matrix-content')
    if (hostRoot) {
      return {
        root: hostRoot,
        board: null,
        stage: null,
        ownsStage: false,
        resizeHandler: null
      }
    }

    removeById(document.body, id + '-board')
    var board = document.createElement('div')
    board.id = id + '-board'
    board.className = 'lf-board'

    var stage = document.createElement('div')
    stage.id = id + '-stage'
    stage.className = 'lf-stage'
    board.appendChild(stage)
    document.body.appendChild(board)

    var layout = config.layout || {}
    sync(stage, bg, layout)
    var resizeHandler = function () {
      sync(stage, bg, layout)
      if (typeof onResize === 'function') onResize()
    }
    window.addEventListener('resize', resizeHandler)

    return {
      root: stage,
      board: board,
      stage: stage,
      ownsStage: true,
      resizeHandler: resizeHandler
    }
  }

  window.AIClassLayoutStage = {
    toCssSize: toCssSize,
    removeById: removeById,
    designSize: designSize,
    sync: sync,
    resolveMountRoot: resolveMountRoot
  }
})()

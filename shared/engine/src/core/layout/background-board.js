// 背景板 — 网格纸背景 + board/stage 缩放容器
;(function () {
  var LS = window.AIClassLayoutStage

  function createViewportBackground(id) {
    LS.removeById(document.body, id + '-bg')
    var bg = document.createElement('div')
    bg.id = id + '-bg'
    bg.className = 'lf-viewport-bg'
    document.body.insertBefore(bg, document.body.firstChild)
    return bg
  }

  function ensureViewportBackground(id) {
    var existing = document.getElementById(id + '-bg')
    if (existing) return existing
    return createViewportBackground(id)
  }

  function mountBackgroundBoard(config) {
    config = config || {}
    var layout = config.layout || {}
    var id = layout.id || config.id || 'lesson'

    var background = createViewportBackground(id)
    var mount = LS.resolveMountRoot(config, id, background, config.onResize)

    return {
      id: id,
      background: background,
      root: mount.root,
      board: mount.board,
      stage: mount.stage,
      ownsStage: mount.ownsStage,
      resizeHandler: mount.resizeHandler,

      sync: function () {
        LS.sync(mount.stage, background, layout)
      },

      teardown: function () {
        if (background && background.parentNode) {
          background.parentNode.removeChild(background)
        }
        if (mount.resizeHandler) {
          window.removeEventListener('resize', mount.resizeHandler)
        }
        if (mount.ownsStage && mount.board && mount.board.parentNode) {
          mount.board.parentNode.removeChild(mount.board)
        }
      }
    }
  }

  function mountBoardStage(options) {
    options = options || {}
    var boardId = options.boardId || 'board'
    var stageId = options.stageId || 'stage'

    LS.removeById(document.body, boardId)
    var board = document.createElement('div')
    board.className = 'lf-board'
    board.id = boardId

    var stage = document.createElement('div')
    stage.className = 'lf-stage'
    stage.id = stageId
    board.appendChild(stage)
    document.body.appendChild(board)

    var layout = options.layout || { mode: 'stack' }
    var bg = options.background || null
    LS.sync(stage, bg, layout)

    var resizeHandler = function () {
      LS.sync(stage, bg, layout)
      if (typeof options.onResize === 'function') options.onResize()
    }
    window.addEventListener('resize', resizeHandler)

    return {
      board: board,
      stage: stage,
      sync: function () { LS.sync(stage, bg, layout) },
      teardown: function () {
        window.removeEventListener('resize', resizeHandler)
        if (board.parentNode) board.parentNode.removeChild(board)
      }
    }
  }

  window.AIClassBackgroundBoard = {
    createViewportBackground: createViewportBackground,
    ensureViewportBackground: ensureViewportBackground,
    mount: mountBackgroundBoard,
    mountBoardStage: mountBoardStage
  }
})()

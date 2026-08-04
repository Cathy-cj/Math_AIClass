// 费曼屏流程 — overlay 挂载，不触碰 course-flow 正文
;(function () {
  var screenEl = null
  var stageEl = null
  var figureHost = null
  var openId = null
  var HIDE_MS = 380
  var overlay = window.AIClassOverlayMount

  function toCssSize(value) {
    if (value == null || value === '') return null
    return typeof value === 'number' ? value + 'px' : String(value)
  }

  function applyLayout(el, layoutParams, style) {
    layoutParams = layoutParams || {}
    style = style || {}
    var map = {
      '--fq-edge-pad': toCssSize(layoutParams.edgePad),
      '--fq-gap': toCssSize(layoutParams.gap),
      '--fq-split-left-width': toCssSize(layoutParams.splitLeftWidth),
      '--fq-body-size': toCssSize(style.bodySize),
      '--fq-line-height': style.lineHeight != null ? String(style.lineHeight) : null
    }
    Object.keys(map).forEach(function (key) {
      if (map[key] != null) el.style.setProperty(key, map[key])
    })
  }

  function mulberry32(seed) {
    var a = seed >>> 0
    return function () {
      a |= 0
      a = (a + 0x6d2b79f5) | 0
      var t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function shuffleIds(ids, seed) {
    var arr = ids.slice()
    var rnd = seed != null ? mulberry32(Number(seed)) : Math.random
    for (var i = arr.length - 1; i > 0; i--) {
      var j = seed != null ? Math.floor(rnd() * (i + 1)) : Math.floor(Math.random() * (i + 1))
      var tmp = arr[i]
      arr[i] = arr[j]
      arr[j] = tmp
    }
    return arr
  }

  function getStage() {
    return overlay ? overlay.getContentStage() : (
      document.getElementById('course-stack-stage') || document.querySelector('.lf-stage')
    )
  }

  function syncBounds() {
    if (overlay && screenEl) overlay.syncOverlayBounds(screenEl)
  }

  function renderQuad(parent, cards, cardOrder) {
    if (!window.AIClassWidgetRegistry) {
      throw new Error('[FeynmanFlow] AIClassWidgetRegistry required')
    }
    var block = {
      type: 'feynman-quad',
      cards: cards,
      cardOrder: cardOrder,
      __stepId: 'feynman-quad',
      __isCurrentStep: true
    }
    parent.appendChild(AIClassWidgetRegistry.renderBlock(block, { instant: true }, 0))
  }

  function removeScreenDom() {
    if (overlay) overlay.unbindOverlaySync()
    if (figureHost) {
      figureHost.teardown()
      figureHost = null
    }
    if (screenEl && window.AIClassStageScrollLock) {
      AIClassStageScrollLock.unbindOverlay(screenEl)
    }
    if (screenEl && screenEl.parentNode) {
      screenEl.parentNode.removeChild(screenEl)
    }
    if (stageEl && window.AIClassStageScrollLock) {
      AIClassStageScrollLock.unlock(stageEl)
    }
    screenEl = null
    stageEl = null
    openId = null
  }

  function showScreen() {
    if (!screenEl) return
    syncBounds()
    requestAnimationFrame(function () {
      syncBounds()
      requestAnimationFrame(function () {
        if (screenEl) screenEl.classList.add('is-visible')
      })
    })
  }

  function mount(config, options) {
    options = options || {}
    if (openId) throw new Error('[FeynmanFlow] already open: ' + openId)

    if (!overlay) throw new Error('[FeynmanFlow] AIClassOverlayMount not loaded')

    stageEl = getStage()
    var parentEl = overlay.getOverlayParent()
    if (!stageEl || !parentEl) throw new Error('[FeynmanFlow] stage not found')

    var cards = (config.cards || []).slice()
    var cardOrder = shuffleIds(
      cards.map(function (c) { return c.id }),
      options.seed
    )

    screenEl = document.createElement('div')
    screenEl.className = 'feynman-screen'
    screenEl.id = 'feynman-screen'
    screenEl.setAttribute('data-feynman-id', String(config.id))
    screenEl.setAttribute('role', 'dialog')
    screenEl.setAttribute('aria-label', '费曼复述 ' + config.id)
    applyLayout(screenEl, config.layoutParams, config.style)

    var bodyEl = document.createElement('div')
    bodyEl.className = 'feynman-body'
    screenEl.appendChild(bodyEl)

    var top = document.createElement('div')
    top.className = 'feynman-top'
    top.textContent = config.stem || ''
    bodyEl.appendChild(top)

    var split = document.createElement('div')
    split.className = 'feynman-split'
    bodyEl.appendChild(split)

    var left = document.createElement('div')
    left.className = 'feynman-left'
    var figureSlot = document.createElement('div')
    figureSlot.className = 'feynman-figure-slot'
    left.appendChild(figureSlot)
    split.appendChild(left)

    var right = document.createElement('div')
    right.className = 'feynman-right'
    var quadHost = document.createElement('div')
    quadHost.className = 'feynman-quad-host'
    right.appendChild(quadHost)
    split.appendChild(right)

    parentEl.appendChild(screenEl)
    overlay.bindOverlaySync(screenEl)

    if (window.AIClassStageScrollLock) {
      AIClassStageScrollLock.lock(stageEl)
      AIClassStageScrollLock.bindOverlay(screenEl)
    }

    if (config.figure && window.AIClassFigureHost) {
      var figureDef = window.AIClassFigureRegistry
        ? AIClassFigureRegistry.resolve(config.figure)
        : config.figure
      figureHost = new AIClassFigureHost(figureSlot, figureDef, {})
      figureHost.mount()
      if (config.figureState) {
        figureHost.setState(
          typeof config.figureState === 'string' ? config.figureState : { state: config.figureState },
          {}
        )
      }
    }

    renderQuad(quadHost, cards, cardOrder)
    openId = String(config.id)
    showScreen()

    return { cardOrder: cardOrder }
  }

  function teardown(done, options) {
    options = options || {}
    if (!screenEl) {
      if (typeof done === 'function') done()
      return
    }

    if (options.immediate) {
      removeScreenDom()
      if (typeof done === 'function') done()
      return
    }

    var el = screenEl
    var bodyEl = el.querySelector('.feynman-body')
    var animEl = bodyEl || el
    var finished = false

    function finish() {
      if (finished) return
      finished = true
      removeScreenDom()
      if (typeof done === 'function') done()
    }

    el.classList.remove('is-visible')
    el.classList.add('is-hiding')
    animEl.addEventListener('transitionend', function (e) {
      if (e.target === animEl && e.propertyName === 'opacity') finish()
    }, { once: true })
    setTimeout(finish, HIDE_MS)
  }

  window.AIClassFeynmanFlow = {
    mount: mount,
    teardown: teardown,
    isOpen: function () { return openId != null },
    openId: function () { return openId }
  }
})()

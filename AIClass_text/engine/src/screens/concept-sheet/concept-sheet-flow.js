// 概念插播 — 底部抽屉，独立 mini figure，不触碰正文 course-flow
;(function () {
  var rootEl = null
  var stageEl = null
  var figureHost = null
  var openId = null
  var figureId = null
  var seqTimer = null
  var HIDE_MS = 360
  var overlay = window.AIClassOverlayMount

  function clearSeqTimer() {
    if (seqTimer) {
      clearTimeout(seqTimer)
      seqTimer = null
    }
  }

  function syncBounds() {
    if (overlay && rootEl) overlay.syncOverlayBounds(rootEl)
  }

  function removeDom() {
    clearSeqTimer()
    if (overlay) overlay.unbindOverlaySync()
    if (figureHost) {
      figureHost.teardown()
      figureHost = null
    }
    if (rootEl && window.AIClassStageScrollLock) {
      AIClassStageScrollLock.unbindOverlay(rootEl)
    }
    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl)
    }
    rootEl = null
    stageEl = null
    openId = null
    figureId = null
  }

  function playSequence(host, states, intervalMs) {
    clearSeqTimer()
    if (!host || !states || !states.length) return
    var idx = 0
    var gap = intervalMs != null ? intervalMs : 700

    function tick() {
      host.setState(states[idx], {})
      idx += 1
      if (idx < states.length) {
        seqTimer = setTimeout(tick, gap)
      }
    }

    host.reset()
    tick()
  }

  function renderText(parent, config) {
    var badge = document.createElement('span')
    badge.className = 'concept-sheet-badge'
    badge.textContent = '概念补充'
    parent.appendChild(badge)

    if (config.title) {
      var title = document.createElement('div')
      title.className = 'concept-sheet-title'
      title.textContent = config.title
      parent.appendChild(title)
    }

    var lines = config.lines || []
    if (lines.length) {
      var ul = document.createElement('ul')
      ul.className = 'concept-sheet-lines'
      lines.forEach(function (line) {
        var li = document.createElement('li')
        if (line && typeof line === 'object') {
          if (line.class) li.className = line.class
          if (line.html) {
            li.innerHTML = line.text || ''
          } else {
            li.textContent = line.text != null ? line.text : ''
          }
        } else {
          li.textContent = typeof line === 'string' ? line : String((line && line.text) || '')
        }
        ul.appendChild(li)
      })
      parent.appendChild(ul)
    }
  }

  function showRoot() {
    if (!rootEl) return
    syncBounds()
    requestAnimationFrame(function () {
      syncBounds()
      requestAnimationFrame(function () {
        if (rootEl) {
          rootEl.classList.add('is-visible')
          rootEl.classList.add('is-active')
        }
      })
    })
  }

  function resolveFigureId(figure) {
    if (!figure) return null
    return typeof figure === 'string' ? figure : null
  }

  function getStates(config) {
    if (config.sequenceStates && config.sequenceStates.length) {
      return config.sequenceStates
    }
    return config.figureState ? [config.figureState] : []
  }

  function applyFigureState(host, states, intervalMs) {
    if (!host || !states.length) return
    if (states.length > 1) {
      playSequence(host, states, intervalMs)
      return
    }
    clearSeqTimer()
    host.reset()
    host.setState(states[0], {})
  }

  function mountFigure(slot, config, options) {
    if (!config.figure || !window.AIClassFigureHost || !slot) return null
    var nextFigureId = resolveFigureId(config.figure)
    var figureDef = window.AIClassFigureRegistry
      ? AIClassFigureRegistry.resolve(config.figure)
      : config.figure
    var host = new AIClassFigureHost(slot, figureDef, {})
    host.mount()
    figureId = nextFigureId
    applyFigureState(host, getStates(config), options.sequenceIntervalMs)
    return host
  }

  function updateBody(config) {
    if (!rootEl) return
    var body = rootEl.querySelector('.concept-sheet-body')
    if (!body) return
    body.innerHTML = ''
    renderText(body, config)
  }

  function update(config, options) {
    options = options || {}
    if (!config || !config.id) throw new Error('[ConceptSheetFlow] config.id required')
    if (!rootEl) return mount(config, options)

    clearSeqTimer()
    rootEl.setAttribute('data-concept-id', String(config.id))
    rootEl.setAttribute('aria-label', config.title || '概念补充')
    updateBody(config)

    var slot = rootEl.querySelector('.concept-sheet-figure-slot')
    var nextFigureId = resolveFigureId(config.figure)
    var states = getStates(config)

    if (!config.figure || !slot) {
      if (figureHost) {
        figureHost.teardown()
        figureHost = null
        figureId = null
      }
    } else if (figureHost && figureId === nextFigureId) {
      applyFigureState(figureHost, states, options.sequenceIntervalMs)
    } else {
      if (figureHost) {
        figureHost.teardown()
        figureHost = null
      }
      figureHost = mountFigure(slot, config, options)
    }

    openId = String(config.id)
    syncBounds()
    return { conceptId: openId, updated: true }
  }

  function mount(config, options) {
    options = options || {}
    if (openId && rootEl) {
      return update(config, options)
    }

    if (!overlay) throw new Error('[ConceptSheetFlow] AIClassOverlayMount not loaded')
    stageEl = overlay.getContentStage()
    var parentEl = overlay.getOverlayParent()
    if (!stageEl || !parentEl) throw new Error('[ConceptSheetFlow] stage not found')
    if (!config || !config.id) throw new Error('[ConceptSheetFlow] config.id required')

    rootEl = document.createElement('div')
    rootEl.className = 'concept-sheet-root'
    rootEl.id = 'concept-sheet-root'
    rootEl.setAttribute('data-concept-id', String(config.id))
    rootEl.setAttribute('role', 'dialog')
    rootEl.setAttribute('aria-label', config.title || '概念补充')

    var backdrop = document.createElement('div')
    backdrop.className = 'concept-sheet-backdrop'
    rootEl.appendChild(backdrop)

    var panel = document.createElement('div')
    panel.className = 'concept-sheet-panel'
    rootEl.appendChild(panel)

    var figureWrap = document.createElement('div')
    figureWrap.className = 'concept-sheet-figure'
    var figureSlot = document.createElement('div')
    figureSlot.className = 'concept-sheet-figure-slot'
    figureWrap.appendChild(figureSlot)
    panel.appendChild(figureWrap)

    var body = document.createElement('div')
    body.className = 'concept-sheet-body'
    panel.appendChild(body)

    parentEl.appendChild(rootEl)
    overlay.bindOverlaySync(rootEl)

    if (window.AIClassStageScrollLock) {
      AIClassStageScrollLock.bindOverlay(rootEl)
    }

    if (config.figure && window.AIClassFigureHost) {
      figureHost = mountFigure(figureSlot, config, options)
    }

    renderText(body, config)
    openId = String(config.id)
    showRoot()

    return { conceptId: openId, updated: false }
  }

  function teardown(done, options) {
    options = options || {}
    if (!rootEl) {
      if (typeof done === 'function') done()
      return
    }

    if (options.immediate) {
      removeDom()
      if (typeof done === 'function') done()
      return
    }

    var el = rootEl
    var finished = false

    function finish() {
      if (finished) return
      finished = true
      removeDom()
      if (typeof done === 'function') done()
    }

    el.classList.remove('is-visible')
    el.classList.add('is-hiding')
    el.classList.remove('is-active')
    setTimeout(finish, HIDE_MS)
  }

  window.AIClassConceptSheetFlow = {
    mount: mount,
    update: update,
    teardown: teardown,
    isOpen: function () { return openId != null },
    openId: function () { return openId }
  }
})()

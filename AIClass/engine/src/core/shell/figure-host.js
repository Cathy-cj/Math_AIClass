// Figure 挂载 — 容器 figure 字段解析为可渲染图形
;(function () {
  function createFigure(figureDef, defaults) {
    if (!figureDef) return null
    if (typeof figureDef === 'function') return figureDef(defaults || {})
    return Object.assign({}, figureDef)
  }

  function noop() {}

  function AIClassFigureHost(slot, figureDef, options) {
    this.slot = slot
    this.options = options || {}
    this.figure = createFigure(figureDef, this.options.defaults || {})
    this.mounted = false
  }

  AIClassFigureHost.prototype.mount = function () {
    if (this.mounted) return
    if (!this.slot) throw new Error('[AIClassFigureHost] figure slot not found')
    if (!this.figure) {
      this.slot.innerHTML = ''
      this.mounted = true
      return
    }
    if (typeof this.figure.mount !== 'function') {
      throw new Error('[AIClassFigureHost] figure must implement mount(slotEl)')
    }
    this.figure.mount(this.slot)
    this.mounted = true
  }

  AIClassFigureHost.prototype.reset = function () {
    if (!this.mounted) this.mount()
    if (!this.figure) {
      if (this.slot) this.slot.innerHTML = ''
      return
    }
    ;(this.figure.reset || noop).call(this.figure)
  }

  AIClassFigureHost.prototype.setState = function (figureState, runtime) {
    if (!figureState) return
    if (!this.mounted) this.mount()
    if (!this.figure || typeof this.figure.setState !== 'function') return
    var state = typeof figureState === 'string' ? figureState : figureState.state
    var params = typeof figureState === 'string'
      ? {}
      : Object.assign({}, figureState, figureState.params || {})
    if (params.state != null) delete params.state
    this.figure.setState(state, params, runtime || {})
  }

  AIClassFigureHost.prototype.teardown = function () {
    if (this.figure && typeof this.figure.teardown === 'function') this.figure.teardown()
    if (this.slot) this.slot.innerHTML = ''
    this.mounted = false
  }

  window.AIClassFigureHost = AIClassFigureHost
})()

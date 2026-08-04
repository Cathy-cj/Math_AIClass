// Widget 注册表 — push 块 type → 渲染函数；提供 renderBlock / mountAll
;(function () {
  var renderers = {}

  function register(type, render) {
    if (!type || typeof render !== 'function') throw new Error('[AIClassWidgetRegistry] invalid renderer')
    renderers[type] = render
  }

  function text(value) {
    return value == null ? '' : String(value)
  }

  function applyBlockClass(el, block) {
    if (!block || !block.class) return
    String(block.class).split(/\s+/).forEach(function (name) {
      if (name) el.classList.add(name)
    })
  }

  function blockEl(block, runtime) {
    var el = document.createElement('div')
    el.className = 'lf-block lf-block-' + (block.type || 'unknown')
    el.setAttribute('data-step-id', block.__stepId)
    el.setAttribute('data-block-type', block.type || 'unknown')
    el.setAttribute('data-is-current-step', block.__isCurrentStep ? 'true' : 'false')
    applyBlockClass(el, block)
    if (runtime && runtime.isCurrentStep && !runtime.instant) {
      el.classList.add('lf-enter')
      var delay = (block.__localIndex || 0) * 70
      el.style.animationDelay = delay + 'ms'
    }
    return el
  }

  function renderBlock(block, ctx, index, existingEl) {
    var type = block.type || 'text'
    var render = renderers[type]
    if (!render) render = renderers.text
    var runtime = {
      blockIndex: index != null ? index : 0,
      stepId: block.__stepId,
      stepIndex: block.__stepIndex,
      isCurrentStep: !!block.__isCurrentStep,
      instant: !!(ctx && ctx.instant),
      lessonMeta: ctx && ctx.config ? ctx.config.meta : {}
    }
    var el = existingEl || blockEl(block, runtime)
    if (existingEl) {
      el.className = 'lf-block lf-block-' + (block.type || 'unknown')
      el.setAttribute('data-step-id', block.__stepId)
      el.setAttribute('data-block-type', block.type || 'unknown')
      el.setAttribute('data-is-current-step', block.__isCurrentStep ? 'true' : 'false')
      applyBlockClass(el, block)
      el.classList.remove('lf-enter')
      el.style.animationDelay = ''
      if (runtime.isCurrentStep && !runtime.instant) {
        el.classList.add('lf-enter')
        var delay = (block.__localIndex || 0) * 70
        el.style.animationDelay = delay + 'ms'
      }
    }
    render(el, block, runtime, ctx || {})
    return el
  }

  function mountAll(blocks, ctx) {
    var frag = document.createDocumentFragment()
    blocks.forEach(function (block, index) {
      frag.appendChild(renderBlock(block, ctx, index))
    })
    return frag
  }

  window.AIClassWidgetRegistry = {
    register: register,
    mountAll: mountAll,
    renderBlock: renderBlock,
    text: text
  }
})()

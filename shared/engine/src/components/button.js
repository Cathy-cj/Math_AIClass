// 提交/重置按钮 — AIClassComponent.createSubmitButton 等
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var dom = ns._dom

  if (!dom) throw new Error('[AIClassComponent.Button] shared/dom.js is required')

  function createButton(opts) {
    opts = opts || {}
    var kind = opts.kind || 'default'
    var text = opts.text != null ? opts.text : '按钮'
    var btn = dom.create('button', {
      type: 'button',
      className: 'aic-button aic-button-' + kind + (opts.className ? ' ' + opts.className : ''),
      text: text,
      disabled: !!opts.disabled,
      attributes: {
        lang: opts.lang || 'zh-CN',
        'aria-label': opts.ariaLabel || text,
        'data-aic-kind': kind
      },
      on: {
        click: function (event) {
          if (btn.disabled || typeof opts.onClick !== 'function') return
          opts.onClick(event)
        }
      }
    })
    return btn
  }

  var SUBMIT_DEBOUNCE_MS = 10000

  function createSubmitButton(opts) {
    opts = opts || {}
    opts.kind = 'submit'
    if (opts.text == null) opts.text = '提交'
    var onClick = opts.onClick
    var lastSubmitAt = 0
    opts.onClick = function (event) {
      var now = Date.now()
      if (now - lastSubmitAt < SUBMIT_DEBOUNCE_MS) return
      lastSubmitAt = now
      if (typeof onClick === 'function') onClick(event)
    }
    return createButton(opts)
  }

  function createResetButton(opts) {
    opts = opts || {}
    opts.kind = 'reset'
    if (opts.text == null) opts.text = '重置'
    return createButton(opts)
  }

  ns.createButton = createButton
  ns.createSubmitButton = createSubmitButton
  ns.createResetButton = createResetButton
})()

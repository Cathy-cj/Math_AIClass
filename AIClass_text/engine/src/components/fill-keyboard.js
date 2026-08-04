// 填空输入绑定浮层数学键盘 — 仅 wireFillKeyboard 挂载/显示，离开填空步自动隐藏
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}

  function shouldUseKeyboard(block) {
    if (!block || block.keyboard === false) return false
    return true
  }

  function resolvePreset(block) {
    if (block.keyboard && block.keyboard.preset) return block.keyboard.preset
    if (block.keyboardPreset) return block.keyboardPreset
    return 'numbers'
  }

  function findActiveFillInputs() {
    var inputs = []
    document.querySelectorAll('.lf-block[data-block-type="fill"][data-is-current-step="true"]').forEach(function (block) {
      block.querySelectorAll('.lf-fill-input').forEach(function (input) {
        if (!input.disabled) inputs.push(input)
      })
    })
    return inputs
  }

  function syncFillKeyboardVisibility() {
    var inputs = findActiveFillInputs()
    if (!inputs.length) {
      if (typeof ns.hideFloatingMathKeyboard === 'function') ns.hideFloatingMathKeyboard()
      return
    }
    if (typeof ns.getFloatingMathKeyboard !== 'function') return
    var keyboard = ns.getFloatingMathKeyboard()
    if (typeof keyboard.pruneBindings === 'function') keyboard.pruneBindings(inputs)
  }

  function wireFillKeyboard(host, block, inputs, runtimeOpts) {
    runtimeOpts = runtimeOpts || {}
    inputs = inputs || []
    if (!shouldUseKeyboard(block) || !inputs.length) return null
    if (typeof ns.getFloatingMathKeyboard !== 'function') {
      throw new Error('[AIClassComponent.wireFillKeyboard] MathKeyboard.js is required')
    }

    var preset = resolvePreset(block)
    var allow = typeof ns.createAllowFromPreset === 'function'
      ? ns.createAllowFromPreset(preset)
      : null
    var keyboard = ns.getFloatingMathKeyboard()

    var anchor = block.keyboard && (block.keyboard.anchor || block.keyboard.position)
    if (anchor && typeof keyboard.setAnchor === 'function') {
      keyboard.setAnchor(anchor)
    }

    inputs.forEach(function (input) {
      var meta = {
        allow: allow,
        maxLength: input.maxLength >= 0 ? input.maxLength : null
      }
      if (block.keyboard && block.keyboard.maxLength != null) {
        meta.maxLength = Number(block.keyboard.maxLength)
      }
      if (typeof runtimeOpts.onChange === 'function') {
        meta.onInput = runtimeOpts.onChange
      }
      keyboard.bindAsHelper(input, meta)
    })

    if (typeof keyboard.pruneBindings === 'function') keyboard.pruneBindings(inputs)
    keyboard.show()
    return { keyboard: keyboard }
  }

  ns.wireFillKeyboard = wireFillKeyboard
  ns.syncFillKeyboardVisibility = syncFillKeyboardVisibility
})()

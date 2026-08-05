// 口答文字输入 — AIClassComponent.createOralInput
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var dom = ns._dom

  if (!dom) throw new Error('[AIClassComponent.OralInput] shared/dom.js is required')
  if (typeof ns.createSubmitButton !== 'function') throw new Error('[AIClassComponent.OralInput] Button.js is required')

  function autoResize(textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }

  // opts: { badge, question, placeholder, value, disabled, interactive, actions, submitText,
  //         required, onChange, onSubmit, onInvalid, onReset }
  function createOralInput(opts) {
    opts = opts || {}
    var disabled = opts.interactive === false || !!opts.disabled
    var value = opts.value != null ? String(opts.value) : ''

    var root = dom.create('div', { className: 'aic-oral-input' })
    var head = dom.create('div', { className: 'aic-oral-input-head' })
    var badge = dom.create('span', {
      className: 'aic-oral-input-badge',
      text: opts.badge || '说一说'
    })
    var question = dom.create('span', {
      className: 'aic-oral-input-question',
      text: opts.question || opts.text || ''
    })
    head.appendChild(badge)
    head.appendChild(question)
    root.appendChild(head)

    var textarea = dom.create('textarea', {
      className: 'aic-oral-input-field',
      attributes: {
        placeholder: opts.placeholder || '请输入你的想法',
        'aria-label': opts.ariaLabel || opts.question || '口答输入'
      },
      on: {
        input: function () {
          value = textarea.value
          autoResize(textarea)
          if (typeof opts.onChange === 'function') opts.onChange(value)
        }
      }
    })
    textarea.value = value
    textarea.disabled = disabled
    textarea.readOnly = disabled
    root.appendChild(textarea)
    autoResize(textarea)

    function getValue() { return textarea.value.trim() }

    function setValue(nextValue, silent) {
      value = nextValue != null ? String(nextValue) : ''
      textarea.value = value
      autoResize(textarea)
      if (!silent && typeof opts.onChange === 'function') opts.onChange(value)
    }

    function setDisabled(nextDisabled) {
      disabled = !!nextDisabled
      textarea.disabled = disabled
      textarea.readOnly = disabled
      if (submitBtn) submitBtn.disabled = disabled
      dom.toggle(root, 'is-disabled', disabled)
    }

    function reset() {
      setValue('')
      if (typeof opts.onReset === 'function') opts.onReset()
    }

    var actions = dom.create('div', { className: 'aic-oral-input-actions' })
    var submitBtn = null
    var actionNames = opts.actions === false ? [] : (Array.isArray(opts.actions) ? opts.actions : ['submit'])

    actionNames.forEach(function (name) {
      if (name === 'submit') {
        submitBtn = ns.createSubmitButton({
          text: opts.submitText || '提交',
          disabled: disabled,
          onClick: function () {
            var current = getValue()
            if (!current && opts.required !== false) {
              if (typeof opts.onInvalid === 'function') opts.onInvalid()
              return
            }
            if (typeof opts.onSubmit === 'function') opts.onSubmit(current)
          }
        })
        actions.appendChild(submitBtn)
      }
    })

    if (actions.childNodes.length) root.appendChild(actions)
    setDisabled(disabled)

    return { el: root, getValue: getValue, setValue: setValue, setDisabled: setDisabled, reset: reset }
  }

  ns.createOralInput = createOralInput
})()

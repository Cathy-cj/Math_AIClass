// 选择题 UI 组件 — AIClassComponent.createChoiceQuestion
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var dom = ns._dom
  var option = ns._option

  if (!dom) throw new Error('[AIClassComponent.ChoiceQuestion] shared/dom.js is required')
  if (!option) throw new Error('[AIClassComponent.ChoiceQuestion] shared/option.js is required')
  if (typeof ns.createSubmitButton !== 'function') throw new Error('[AIClassComponent.ChoiceQuestion] Button.js is required')

  function sameValue(a, b) {
    return a != null && b != null && String(a) === String(b)
  }

  function asArray(value) {
    if (value == null) return []
    return Array.isArray(value) ? value.map(String) : [String(value)]
  }

  function containsValue(values, value) {
    return values.some(function (item) { return sameValue(item, value) })
  }

  function choiceVariant(opts) {
    if (opts.variant) return opts.variant
    return 'paper'
  }

  function normalizeActions(actions) {
    if (actions === false) return []
    if (Array.isArray(actions)) return actions.slice()
    return ['submit']
  }

  function createOptionButton(item, opts) {
    var variant = opts.variant || 'paper'
    var hasRadio = variant !== 'plain'
    var btn = dom.create('button', {
      type: 'button',
      className: 'aic-choice-option aic-choice-option--' + variant,
      attributes: {
        'data-value': item.value,
        'aria-pressed': 'false'
      }
    })

    if (hasRadio) {
      btn.appendChild(dom.create('span', {
        className: 'aic-choice-radio',
        attributes: { 'aria-hidden': 'true' }
      }))
      btn.appendChild(dom.create('span', {
        className: 'aic-choice-label',
        text: item.label
      }))
    } else {
      btn.textContent = item.label
    }

    return btn
  }

  function capturePointer(el, event) {
    try {
      if (el.setPointerCapture) el.setPointerCapture(event.pointerId)
    } catch (err) { /* ignore */ }
  }

  function releasePointer(el, event) {
    try {
      if (el.hasPointerCapture && el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId)
      }
    } catch (err) { /* ignore */ }
  }

  function wirePointerPress(el, handler, canPress) {
    var activeId = null

    el.addEventListener('pointerdown', function (event) {
      if (canPress && !canPress()) return
      activeId = event.pointerId
      capturePointer(el, event)
      event.preventDefault()
    })

    el.addEventListener('pointerup', function (event) {
      if (activeId == null || event.pointerId !== activeId) return
      activeId = null
      releasePointer(el, event)
      if (!canPress || canPress()) handler(event)
    })

    el.addEventListener('pointercancel', function (event) {
      if (event.pointerId !== activeId) return
      activeId = null
      releasePointer(el, event)
    })
  }

  function createChoiceQuestion(opts) {
    opts = opts || {}
    var items = option.normalizeAll(opts.options)
    var multiple = !!opts.multiple
    var selected = multiple ? asArray(opts.value) : (opts.value != null ? opts.value : null)
    var revealed = !!opts.revealed
    var disabled = opts.interactive === false || !!opts.disabled
    var variant = choiceVariant(opts)
    var actionNames = normalizeActions(opts.actions)
    var buttons = []

    var root = dom.create('div', {
      className: 'aic-choice aic-choice--' + variant
    })
    var grid = dom.create('div', {
      className: 'aic-choice-grid aic-choice-grid--' + variant,
      attributes: { role: 'group' }
    })
    root.appendChild(grid)

    function updateStates() {
      var selectedValues = multiple ? selected : [selected]
      buttons.forEach(function (btn) {
        var value = btn.getAttribute('data-value')
        var isSelected = containsValue(selectedValues, value)
        var answerValues = asArray(opts.answer)
        var isCorrect = revealed && answerValues.length && containsValue(answerValues, value)
        var isWrong = revealed && isSelected && answerValues.length && !containsValue(answerValues, value)

        dom.toggle(btn, 'is-selected', isSelected)
        dom.toggle(btn, 'is-correct', isCorrect)
        dom.toggle(btn, 'is-wrong', isWrong)
        dom.toggle(btn, 'is-disabled', disabled)
        dom.toggle(btn, 'is-revealed', revealed)
        btn.disabled = disabled
        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false')
      })
    }

    function setValue(value, silent) {
      selected = multiple ? asArray(value) : (value != null ? value : null)
      updateStates()
      if (!silent && typeof opts.onChange === 'function') opts.onChange(selected)
    }

    function toggleValue(value) {
      if (!multiple) {
        setValue(value)
        return
      }
      var next = selected.slice()
      var existing = next.indexOf(String(value))
      if (existing >= 0) next.splice(existing, 1)
      else next.push(String(value))
      setValue(next)
    }

    function setDisabled(nextDisabled) {
      disabled = !!nextDisabled
      updateStates()
      if (submitBtn) submitBtn.disabled = disabled
      if (resetBtn) resetBtn.disabled = disabled
    }

    function findItem(value) {
      for (var i = 0; i < items.length; i++) {
        if (sameValue(items[i].value, value)) return items[i]
      }
      return null
    }

    function buildSubmitText(value) {
      if (window.AIClassSubmitText && typeof AIClassSubmitText.formatChoice === 'function') {
        return AIClassSubmitText.formatChoice(value, opts.options, multiple)
      }
      if (multiple) {
        return asArray(value).map(String).join('；')
      }
      return value == null ? '' : String(value)
    }

    function reveal(answer) {
      setRevealed(true, answer)
    }

    function reset() {
      setRevealed(false)
      setValue(null)
      if (typeof opts.onReset === 'function') opts.onReset()
    }

    items.forEach(function (item) {
      var btn = createOptionButton(item, { variant: variant })
      wirePointerPress(btn, function () { toggleValue(item.value) }, function () { return !disabled })
      grid.appendChild(btn)
      buttons.push(btn)
    })

    var actions = dom.create('div', { className: 'aic-choice-submit-row' })
    var submitBtn = null
    var resetBtn = null

    function setActionsVisible(show) {
      if (!actions) return
      actions.style.display = show ? '' : 'none'
    }

    function setRevealed(state, answer) {
      if (state && answer != null) opts.answer = answer
      revealed = !!state
      disabled = revealed || opts.interactive === false
      if (revealed && answer != null) setValue(answer, true)
      setActionsVisible(!revealed && actionNames.length > 0)
      dom.toggle(root, 'is-revealed', revealed)
      updateStates()
      if (submitBtn) submitBtn.disabled = disabled
      if (resetBtn) resetBtn.disabled = disabled
    }

    actionNames.forEach(function (name) {
      if (name === 'reset') {
        resetBtn = ns.createResetButton({
          text: opts.resetText || '重置',
          disabled: disabled,
          onClick: reset
        })
        actions.appendChild(resetBtn)
      }

      if (name === 'submit') {
        submitBtn = ns.createSubmitButton({
          text: opts.submitText || '提交',
          disabled: disabled,
          onClick: function () {
            var empty = multiple ? !selected.length : selected == null
            if (empty && opts.required !== false) {
              if (typeof opts.onInvalid === 'function') opts.onInvalid()
              return
            }
            var text = buildSubmitText(selected)
            if (typeof opts.onSubmit === 'function') opts.onSubmit(text, selected)
          }
        })
        actions.appendChild(submitBtn)
      }
    })

    if (actions.childNodes.length) root.appendChild(actions)
    updateStates()
    // 选项 label 支持 $...$，统一渲染分式、根号、上下标等数学表达。
    if (window.AIClassLatex) window.AIClassLatex.render(root)

    return {
      el: root,
      getValue: function () { return selected },
      setValue: setValue,
      setDisabled: setDisabled,
      setRevealed: setRevealed,
      reveal: reveal,
      reset: reset
    }
  }

  ns.createChoiceQuestion = createChoiceQuestion
})()

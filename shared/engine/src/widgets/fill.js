// 填空 widget — 使用 MathLive 公式编辑器与课件悬浮键盘。
;(function () {
  function renderPart(container, part, block, enabled) {
    part = part || {}
    if (part.kind === 'blank' || part.type === 'blank') {
      var displayValue = null
      if (!enabled && part.answer != null) {
        displayValue = part.answer
      } else if (part.value != null) {
        displayValue = part.value
      } else if (block.value != null) {
        displayValue = block.value
      }

      if (!window.AIClassComponent || typeof window.AIClassComponent.createLatexMathfield !== 'function') {
        throw new Error('[fill widget] MathLive is required for fill input')
      }
      var formulaField = window.AIClassComponent.createLatexMathfield({
        id: part.id || block.id || '',
        placeholder: part.placeholder || '',
        width: part.width,
        value: displayValue,
        enabled: enabled
      })
      if (!enabled) formulaField.classList.add('lf-fill-input--revealed')
      if (block.animateValue && block.__isCurrentStep) {
        formulaField.classList.add('lf-fill-input--anim-' + block.animateValue)
      }
      container.appendChild(formulaField)
      return formulaField
    }
    var span = document.createElement('span')
    span.textContent = part.value != null ? String(part.value) : ''
    container.appendChild(span)
    return null
  }

  function normalizeHintLine(line) {
    if (line == null || line === '') return null
    if (typeof line === 'object' && line.text != null) {
      return {
        text: String(line.text),
        suffix: line.suffix != null ? String(line.suffix) : '',
        role: line.role || 'note'
      }
    }
    return { text: String(line), suffix: '', role: 'note' }
  }

  function appendHintLine(parent, item) {
    if (item.suffix) {
      var titleEl = document.createElement('div')
      titleEl.className = 'lf-fill-hint-line lf-fill-hint-line--' + item.role
      var strong = document.createElement('span')
      strong.className = 'lf-fill-hint-strong'
      strong.textContent = item.text
      titleEl.appendChild(strong)
      parent.appendChild(titleEl)

      var formulaEl = document.createElement('div')
      formulaEl.className = 'lf-fill-hint-line lf-fill-hint-line--formula lf-fill-hint-formula'
      formulaEl.textContent = item.suffix
      parent.appendChild(formulaEl)
      return
    }
    var lineEl = document.createElement('div')
    lineEl.className = 'lf-fill-hint-line lf-fill-hint-line--' + item.role
    lineEl.textContent = item.text
    parent.appendChild(lineEl)
  }

  function appendBlankHints(parent, part) {
    part = part || {}
    if (part.label) {
      var labelEl = document.createElement('div')
      labelEl.className = 'lf-fill-label'
      labelEl.textContent = String(part.label)
      parent.appendChild(labelEl)
    }
    var hints = []
    if (part.hint != null && part.hint !== '') {
      hints = hints.concat(Array.isArray(part.hint) ? part.hint : [part.hint])
    }
    if (part.formula) hints.push({ text: String(part.formula), role: 'formula' })
    if (!hints.length) return

    var hintEl = document.createElement('div')
    hintEl.className = 'lf-fill-hint'
    hints.forEach(function (line) {
      var item = normalizeHintLine(line)
      if (!item) return
      appendHintLine(hintEl, item)
    })
    if (hintEl.childNodes.length) parent.appendChild(hintEl)
  }

  function hasHintRows(parts) {
    return (parts || []).some(function (part) {
      part = part || {}
      if (part.kind !== 'blank' && part.type !== 'blank') return false
      return part.hint || part.label || part.formula
    })
  }

  function isCardFill(block) {
    block = block || {}
    if (block.card === true) return true
    return String(block.class || '').indexOf('lf-fill-card') >= 0
  }

  function useRowLayout(block, parts) {
    return hasHintRows(parts) || isCardFill(block)
  }

  function renderBlankRow(wrap, part, block, enabled, inputs) {
    var rowWrap = document.createElement('div')
    rowWrap.className = 'lf-fill-row'
    appendBlankHints(rowWrap, part)
    var line = document.createElement('div')
    line.className = 'lf-fill-line'
    var input = renderPart(line, part, block, enabled)
    if (input) inputs.push(input)
    rowWrap.appendChild(line)
    wrap.appendChild(rowWrap)
    return line
  }

  function collectValues(inputs) {
    return inputs.map(function (input) {
      if (input && input.tagName === 'MATH-FIELD') {
        return window.AIClassComponent.getLatexValue(input)
      }
      return input.value.trim()
    })
  }

  function submitFill(inputs, block, ctx) {
    var values = collectValues(inputs)
    if (block.required !== false && values.some(function (v) { return !v })) {
      if (window.toast && typeof window.toast.show === 'function') window.toast.show('请填写答案')
      return
    }
    AIClassInteractionGate.submit('fill', values.length === 1 ? values[0] : values, block, ctx.config)
    console.log('[提交] fill', {
      values: values,
      stepId: ctx.currentStepId
    })
  }

  AIClassWidgetRegistry.register('fill', function (el, block, runtime, ctx) {
    var parts = block.parts || []
    var hasAnswer = parts.some(function (part) {
      part = part || {}
      return (part.kind === 'blank' || part.type === 'blank') && part.answer != null && part.answer !== ''
    })

    function render(enabled) {
      el.innerHTML = ''
      var wrap = document.createElement('div')
      wrap.className = 'lf-fill' + (isCardFill(block) ? ' lf-fill-card' : '')
      var inputs = []
      var submitLine = null
      var rowLayout = useRowLayout(block, parts)

      if (rowLayout) {
        parts.forEach(function (part) {
          part = part || {}
          if (part.kind !== 'blank' && part.type !== 'blank') {
            var inlineLine = document.createElement('div')
            inlineLine.className = 'lf-fill-line'
            var inlineInput = renderPart(inlineLine, part, block, enabled)
            if (inlineInput) inputs.push(inlineInput)
            wrap.appendChild(inlineLine)
            submitLine = inlineLine
            return
          }
          if (isCardFill(block) || part.hint || part.label || part.formula) {
            renderBlankRow(wrap, part, block, enabled, inputs)
            return
          }
          var plainLine = document.createElement('div')
          plainLine.className = 'lf-fill-line'
          var plainInput = renderPart(plainLine, part, block, enabled)
          if (plainInput) inputs.push(plainInput)
          wrap.appendChild(plainLine)
          submitLine = plainLine
        })
      } else {
        var row = document.createElement('div')
        row.className = 'lf-fill-line'
        parts.forEach(function (part) {
          var input = renderPart(row, part, block, enabled)
          if (input) inputs.push(input)
        })
        wrap.appendChild(row)
        submitLine = row
      }

      if (enabled) {
        if (!window.AIClassComponent || typeof window.AIClassComponent.createSubmitButton !== 'function') {
          throw new Error('[fill widget] AIClassComponent.createSubmitButton is required')
        }
        var btn = window.AIClassComponent.createSubmitButton({
          text: block.submitText || '提交',
          onClick: function () { submitFill(inputs, block, ctx) }
        })
        if (rowLayout) {
          var actions = document.createElement('div')
          actions.className = 'lf-fill-actions'
          actions.appendChild(btn)
          wrap.appendChild(actions)
        } else if (submitLine) {
          submitLine.appendChild(btn)
        }

        setTimeout(function () {
          if (inputs[0] && typeof inputs[0].focus === 'function') {
            inputs[0].focus()
          }
        }, 0)
      }

      el.appendChild(wrap)
    }

    var enabled = AIClassInteractionGate.isInteractive(block, runtime)
    render(enabled)

    // 供容器在步骤推进后原地揭示答案（镜像 choice 的 _choiceApi.setRevealed）
    el._fillApi = {
      hasAnswer: hasAnswer,
      setRevealed: function (state) {
        render(state ? false : AIClassInteractionGate.isInteractive(block, runtime))
      }
    }
  })
})()

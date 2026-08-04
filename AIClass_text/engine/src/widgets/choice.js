// 选择题 widget — push type: choice，委托 AIClassComponent.createChoiceQuestion
;(function () {
  function showToast(message) {
    if (window.toast && typeof window.toast.show === 'function') {
      window.toast.show(message)
    }
  }

  AIClassWidgetRegistry.register('choice', function (el, block, runtime, ctx) {
    if (!window.AIClassComponent || typeof window.AIClassComponent.createChoiceQuestion !== 'function') {
      throw new Error('[choice widget] AIClassComponent.createChoiceQuestion is required')
    }

    var enabled = AIClassInteractionGate.isInteractive(block, runtime)
    var isPastStep = runtime && !runtime.isCurrentStep
    var revealed = !!block.revealed || (isPastStep && block.answer != null)
    var value = block.value != null ? block.value : (revealed && block.answer != null ? block.answer : null)

    var choice = window.AIClassComponent.createChoiceQuestion({
      options: block.options || [],
      value: value,
      answer: block.answer,
      multiple: !!block.multiple,
      revealed: revealed,
      interactive: enabled,
      required: block.required,
      variant: block.variant,
      actions: enabled ? block.actions : false,
      submitText: block.submitText || '提交',
      resetText: block.resetText || '重置',
      onInvalid: function () { showToast(block.requiredText || '请选择答案') },
      onSubmit: function (text, selected) {
        AIClassInteractionGate.submit('choice', selected, block, ctx.config)
      }
    })

    if (block.answer != null) {
      // 保留原始 answer（含多选数组），勿用 String([...]) 否则揭晓匹配失败
      el._choiceAnswer = block.answer
      el.setAttribute(
        'data-choice-answer',
        Array.isArray(block.answer) ? JSON.stringify(block.answer) : String(block.answer)
      )
    }
    el._choiceApi = choice

    var card = AIClassComponent.createChoiceCard({
      id: block.id,
      badge: block.badge,
      question: block.prompt || block.question
    })
    card.querySelector('.aic-choice-card__body').appendChild(choice.el)
    el.appendChild(card)
  })
})()

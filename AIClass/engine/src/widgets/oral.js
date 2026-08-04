// 口答展示 widget — push type: oral
;(function () {
  function runAttach(el, block, attempt) {
    var scope = el.closest('.course-container')
    if (!scope) {
      if (attempt < 4) {
        window.setTimeout(function () {
          runAttach(el, block, attempt + 1)
        }, attempt === 0 ? 0 : 16)
      }
      return
    }

    var stepBlock = scope.querySelector('.lf-block[data-step-id="' + String(block.attachStepId) + '"]')
    var card = stepBlock && stepBlock.querySelector('.aic-oral-card')
    if (card && block.answer != null && block.answer !== '') {
      AIClassComponent.setOralCardAnswer(card, block.answer)
      el.classList.add('lf-block-oral--attach-only')
      return
    }

    if (attempt < 4) {
      window.setTimeout(function () {
        runAttach(el, block, attempt + 1)
      }, 16)
    }
  }

  AIClassWidgetRegistry.register('oral', function (el, block) {
    el.classList.add('lf-block-oral')

    if (block.attachStepId && block.answer != null && block.answer !== '' && !block.question && !block.text) {
      el.classList.add('lf-block-oral--attach-only')
      runAttach(el, block, 0)
      return
    }

    el.appendChild(AIClassComponent.createOralCard({
      badge: block.badge,
      question: block.question || block.text,
      answer: block.answer,
      action: block.action,
      lead: block.lead
    }))
  })
})()

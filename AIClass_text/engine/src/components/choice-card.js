// 选择题卡片 — 统一 DOM 结构（引导链 guidanceSub 与 push type: choice 共用）
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var dom = ns._dom

  function createChoiceCard(opts) {
    opts = opts || {}
    var card = dom.create('div', { className: 'aic-choice-card' })
    if (opts.id) card.setAttribute('data-choice-id', String(opts.id))

    card.appendChild(dom.create('div', { className: 'aic-choice-card__head' }, [
      dom.create('span', {
        className: 'aic-choice-card__badge',
        text: opts.badge || '选择'
      }),
      dom.create('span', {
        className: 'aic-choice-card__question',
        text: opts.question || opts.prompt || ''
      })
    ]))

    card.appendChild(dom.create('div', { className: 'aic-choice-card__body' }))
    return card
  }

  function setChoiceCardQuestion(card, question) {
    if (!card) return
    var q = card.querySelector('.aic-choice-card__question')
    if (q) q.textContent = question || ''
  }

  ns.createChoiceCard = createChoiceCard
  ns.setChoiceCardQuestion = setChoiceCardQuestion
})()

// 口答卡片 — 统一 DOM 结构（引导链 guidanceSub 与 push type: oral 共用）
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var dom = ns._dom

  function formatAnswer(answer) {
    if (answer == null || answer === '') return ''
    var s = String(answer)
    return s.indexOf('答：') === 0 ? s : '答：' + s
  }

  function needsLatex(answer) {
    return /\\frac|\$/.test(String(answer || ''))
  }

  function renderAnswerEl(el, answer) {
    if (!el) return
    el.textContent = formatAnswer(answer)
    if (needsLatex(answer) && window.AIClassLatex) {
      window.AIClassLatex.render(el)
    }
  }

  function createOralCard(opts) {
    opts = opts || {}
    var card = dom.create('div', { className: 'aic-oral-card' })
    var main = dom.create('div', { className: 'aic-oral-card__main' }, [
      dom.create('span', {
        className: 'aic-oral-card__badge',
        text: opts.badge || '口答'
      }),
      dom.create('span', {
        className: 'aic-oral-card__question' + (opts.lead ? ' lf-text-lead' : ''),
        text: opts.question || opts.text || ''
      })
    ])
    card.appendChild(main)

    if (opts.action) {
      card.appendChild(dom.create('span', {
        className: 'aic-oral-card__action',
        text: opts.action
      }))
    }

    if (opts.answer != null && opts.answer !== '') {
      var answerEl = dom.create('span', { className: 'aic-oral-card__answer' })
      renderAnswerEl(answerEl, opts.answer)
      card.appendChild(answerEl)
    }

    return card
  }

  function setOralCardAnswer(card, answer) {
    if (!card) return
    var existing = card.querySelector('.aic-oral-card__answer')
    if (existing) {
      renderAnswerEl(existing, answer)
      return
    }
    var answerEl = dom.create('span', { className: 'aic-oral-card__answer' })
    renderAnswerEl(answerEl, answer)
    card.appendChild(answerEl)
  }

  ns.createOralCard = createOralCard
  ns.setOralCardAnswer = setOralCardAnswer
})()

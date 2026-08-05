// feynman-quad — 2×2 只读卡片（顺序由 cardOrder 指定）
;(function () {
  function cardById(cards, id) {
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].id === id) return cards[i]
    }
    return null
  }

  function renderCell(card) {
    var cell = document.createElement('div')
    cell.className = 'fq-cell'
    cell.setAttribute('data-card-id', card.id)

    var title = document.createElement('div')
    title.className = 'fq-cell-title'
    title.textContent = card.title || ''
    cell.appendChild(title)

    if (card.body) {
      var body = document.createElement('div')
      body.className = 'fq-cell-body'
      body.textContent = card.body
      cell.appendChild(body)
    }

    return cell
  }

  AIClassWidgetRegistry.register('feynman-quad', function (el, block) {
    el.className = 'fq-grid'
    el.innerHTML = ''

    var cards = block.cards || []
    var order = block.cardOrder || cards.map(function (c) { return c.id })

    order.forEach(function (id) {
      var card = cardById(cards, id)
      if (card) el.appendChild(renderCell(card))
    })
  })
})()

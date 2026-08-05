// 解题步骤 widget — push type: solveStep
;(function () {
  function appendHighlightedText(el, text, highlight) {
    if (!text) return
    if (!highlight) {
      el.appendChild(document.createTextNode(text))
      return
    }
    var idx = text.indexOf(highlight)
    if (idx < 0) {
      el.appendChild(document.createTextNode(text))
      return
    }
    if (idx > 0) el.appendChild(document.createTextNode(text.slice(0, idx)))
    var mark = document.createElement('span')
    mark.className = 'lf-solve-answer-highlight'
    mark.textContent = highlight
    el.appendChild(mark)
    if (idx + highlight.length < text.length) {
      el.appendChild(document.createTextNode(text.slice(idx + highlight.length)))
    }
  }

  AIClassWidgetRegistry.register('solveStep', function (el, block) {
    var row = document.createElement('div')
    row.className = 'lf-solve-step' + (block.highlightAnswer ? ' lf-solve-step--answer' : '')
    var title = document.createElement('span')
    title.className = 'lf-solve-title'
    appendHighlightedText(title, block.title || '', block.highlightAnswer)
    if (title.childNodes.length) row.appendChild(title)
    el.appendChild(row)
    ;(block.lines || []).forEach(function (line) {
      var p = document.createElement('p')
      p.className = 'lf-text-line'
      p.textContent = line
      el.appendChild(p)
    })
  })
})()

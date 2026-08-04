// Agent 作答结果只读回显 — 内容可混排文字与 $...$ / $$...$$ 公式
;(function () {
  function create(content) {
    var card = document.createElement('section')
    card.className = 'cc-recognition-result'
    card.setAttribute('aria-label', '作答结果')

    var title = document.createElement('div')
    title.className = 'cc-recognition-result-title'
    title.textContent = '作答结果'

    var body = document.createElement('div')
    body.className = 'cc-recognition-result-content'
    body.textContent = String(content == null ? '' : content)

    card.appendChild(title)
    card.appendChild(body)
    if (window.AIClassLatex) AIClassLatex.render(body)
    return card
  }

  window.AIClassRecognitionResult = {
    create: create
  }
})()

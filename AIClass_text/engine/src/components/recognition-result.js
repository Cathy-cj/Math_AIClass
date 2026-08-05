// 练习题拍照作答卡 — 宿主负责拍照/OCR，课件只请求和回显结果
;(function () {
  function create(onPhotoRequest) {
    var card = document.createElement('section')
    card.className = 'cc-photo-answer'
    card.setAttribute('aria-label', '作答结果')

    var title = document.createElement('div')
    title.className = 'cc-photo-answer-title'
    title.textContent = '作答结果'

    var body = document.createElement('div')
    body.className = 'cc-photo-answer-content'

    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'cc-photo-answer-button'
    button.textContent = '拍照上传'
    button.addEventListener('click', function () {
      if (typeof onPhotoRequest === 'function') onPhotoRequest()
    })

    body.appendChild(button)
    card.appendChild(title)
    card.appendChild(body)
    return card
  }

  function showResult(card, content) {
    if (!card) return false
    var body = card.querySelector('.cc-photo-answer-content')
    if (!body) return false
    body.textContent = String(content == null ? '' : content)
    card.classList.add('is-result-shown')
    if (window.AIClassLatex) AIClassLatex.render(body)
    return true
  }

  window.AIClassPhotoAnswer = {
    create: create,
    showResult: showResult
  }
})()

// 段落与小节标题 widget — push type: text | section
;(function () {
  function renderLine(el, value) {
    var line = typeof value === 'object' && value ? value : { text: value }
    var tagName = line.block ? 'div' : 'p'
    var lineEl = document.createElement(tagName)
    lineEl.className = 'lf-text-line' + (line.role ? ' lf-text-' + line.role : '')
    var content = line.text != null ? line.text : line.value
    if (line.html) {
      lineEl.innerHTML = AIClassWidgetRegistry.text(content)
    } else {
      lineEl.textContent = AIClassWidgetRegistry.text(content)
    }
    el.appendChild(lineEl)
  }

  AIClassWidgetRegistry.register('text', function (el, block) {
    el.innerHTML = ''
    if (block.size === 'large') {
      el.style.fontSize = 'calc(var(--cc-body-size, var(--lf-body-size, 24px)) * 1.35)'
      el.style.fontWeight = '600'
    } else {
      el.style.fontSize = ''
      el.style.fontWeight = ''
    }
    var lines = block.lines || (block.text ? [block.text] : [])
    lines.forEach(function (line) { renderLine(el, line) })
  })

  AIClassWidgetRegistry.register('section', function (el, block) {
    el.innerHTML = ''
    el.classList.add('lf-section')
    if (block.tag) {
      var tag = document.createElement('span')
      tag.className = 'lf-section-tag'
      tag.textContent = block.tag
      el.appendChild(tag)
    }
    var title = document.createElement('span')
    title.className = 'lf-section-title'
    if (block.color) title.classList.add('lf-section-title--' + block.color)
    title.textContent = block.title || block.text || ''
    el.appendChild(title)
  })
})()

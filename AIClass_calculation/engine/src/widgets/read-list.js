// 阅读列表 widget — push type: readList（已知/求）
;(function () {
  AIClassWidgetRegistry.register('readList', function (el, block) {
    var wrap = document.createElement('div')
    var kind = block.kind || 'known'
    wrap.className = 'lf-read-list lf-read-' + kind
    ;(block.items || []).forEach(function (item, i) {
      var line = document.createElement('div')
      line.className = 'lf-read-line'
      var label = document.createElement('span')
      label.className = 'lf-read-label'
      label.textContent = i === 0 ? (kind === 'ask' ? '求：' : '已知：') : ''
      var text = document.createElement('span')
      text.className = 'lf-read-item'
      text.textContent = item
      line.appendChild(label)
      line.appendChild(text)
      wrap.appendChild(line)
    })
    el.appendChild(wrap)
  })
})()

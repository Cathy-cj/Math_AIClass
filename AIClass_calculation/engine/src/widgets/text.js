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
    if (block.size === 'large') {
      el.style.fontSize = 'calc(var(--cc-body-size, var(--lf-body-size, 24px)) * 1.35)'
      el.style.fontWeight = '600'
    }
    if (block.hangAfterTag) {
      el.classList.add('lf-text--hang-after-tag')
    }
    var lines = block.lines || (block.text ? [block.text] : [])
    lines.forEach(function (line) { renderLine(el, line) })
  })

  AIClassWidgetRegistry.register('section', function (el, block) {
    el.classList.add('lf-section')
    var hasLead = block.lead != null && String(block.lead) !== ''
    var hasTitle = !!(block.title || (block.text && !hasLead))
    if (!hasTitle && !hasLead && block.tag) el.classList.add('lf-section--badge-only')
    if (hasLead) el.classList.add('lf-section--lead')
    if (block.tagTone) el.classList.add('lf-section--' + block.tagTone)
    var tag = null
    if (block.tag) {
      tag = document.createElement('span')
      tag.className = 'lf-section-tag'
      if (block.tagTone) tag.classList.add('lf-section-tag--' + block.tagTone)
      tag.textContent = block.tag
      el.appendChild(tag)
    }
    if (hasLead) {
      var lead = document.createElement('span')
      lead.className = 'lf-section-lead'
      if (block.leadHtml) {
        lead.innerHTML = AIClassWidgetRegistry.text(block.lead)
      } else {
        lead.textContent = block.lead
      }
      el.appendChild(lead)
    }
    if (hasTitle) {
      var title = document.createElement('span')
      title.className = 'lf-section-title'
      if (block.color) title.classList.add('lf-section-title--' + block.color)
      title.textContent = block.title || block.text || ''
      el.appendChild(title)
    }
    // 仅【已知】写入挂行缩进；避免【求】覆盖同一槽位变量
    if (tag && hasLead && block.tagTone === 'known') {
      var leadEl = el.querySelector('.lf-section-lead')
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var host = el.closest('.cc-guide-slot') || el.parentElement
          if (!host || !leadEl) return
          host.style.setProperty('--lf-hang-indent', leadEl.offsetLeft + 'px')
        })
      })
    }
  })
})()

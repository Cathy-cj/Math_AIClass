// 图文画廊 widget — push type: introGallery，支持多图卡片与标题说明
;(function () {
  function safeText(value) {
    return AIClassWidgetRegistry.text(value)
  }

  function resolveAsset(src) {
    if (!src) return src
    if (/^(https?:|data:|blob:)/.test(src)) return src
    return String(src).replace(/^(\.\.\/)+/, '')
  }

  function appendText(parent, className, value) {
    if (value == null || value === '') return null
    var el = document.createElement('div')
    el.className = className
    el.textContent = safeText(value)
    parent.appendChild(el)
    return el
  }

  function renderImage(media, item) {
    var wrap = document.createElement('div')
    wrap.className = 'lf-intro-gallery-media lf-intro-gallery-media--image'

    var img = document.createElement('img')
    img.className = 'lf-intro-gallery-img'
    img.src = resolveAsset(item.src || '')
    img.alt = item.alt || item.title || ''
    img.loading = item.loading || 'lazy'
    wrap.appendChild(img)

    media.appendChild(wrap)
  }

  function renderItem(grid, item, index, runtime) {
    item = item || {}
    var card = document.createElement('figure')
    card.className = 'lf-intro-gallery-card'
    card.setAttribute('data-gallery-kind', item.kind || 'image')
    card.style.setProperty('--lf-intro-item-index', index)
    if (runtime && runtime.isCurrentStep && !runtime.instant) {
      card.classList.add('is-sequential-enter')
      card.style.animationDelay = (160 + index * 180) + 'ms'
    }

    var media = document.createElement('div')
    media.className = 'lf-intro-gallery-card-media'
    renderImage(media, item)
    card.appendChild(media)

    if (item.title || item.caption) {
      var caption = document.createElement('figcaption')
      caption.className = 'lf-intro-gallery-caption'
      if (item.title) appendText(caption, 'lf-intro-gallery-card-title', item.title)
      if (item.caption) appendText(caption, 'lf-intro-gallery-card-desc', item.caption)
      card.appendChild(caption)
    }

    grid.appendChild(card)
  }

  AIClassWidgetRegistry.register('introGallery', function (el, block, runtime) {
    var root = document.createElement('div')
    root.className = 'lf-intro-gallery'

    var textWrap = document.createElement('div')
    textWrap.className = 'lf-intro-gallery-text'
    if (block.title) appendText(textWrap, 'lf-intro-gallery-title', block.title)
    ;(block.lines || []).forEach(function (line) {
      appendText(textWrap, 'lf-intro-gallery-line', line)
    })
    if (textWrap.childNodes.length) root.appendChild(textWrap)

    var items = Array.isArray(block.items) ? block.items : []
    if (items.length) {
      var grid = document.createElement('div')
      grid.className = 'lf-intro-gallery-grid'
      grid.style.setProperty('--lf-intro-gallery-count', items.length)
      items.forEach(function (item, index) {
        renderItem(grid, item, index, runtime)
      })
      root.appendChild(grid)
    }

    el.appendChild(root)
  })
})()

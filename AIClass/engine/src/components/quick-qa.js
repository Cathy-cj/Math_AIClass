// 快问快答 — 累计气泡模式 + 顶部夹层模式（单题切换）
;(function () {
  var currentRecord = null
  var currentQaEl = null
  var currentQaId = null

  function setLatexText(el, text) {
    if (!el) return
    if (window.AIClassLatex && typeof window.AIClassLatex.setText === 'function') {
      window.AIClassLatex.setText(el, text)
      return
    }
    el.textContent = text == null ? '' : String(text)
  }

  function renderLatex(rootEl) {
    if (window.AIClassLatex) window.AIClassLatex.render(rootEl)
  }

  function mount(containerRecord) {
    destroy()
    var scrollMain = containerRecord.container.getFollowScrollEl()
    if (!scrollMain) return null
    var mainRow = scrollMain.parentNode
    if (!mainRow) return null
    var el = document.createElement('div')
    el.className = 'qa-bubble'
    var badge = document.createElement('div')
    badge.className = 'qa-bubble-badge'
    badge.textContent = '快问快答'
    var itemsEl = document.createElement('div')
    itemsEl.className = 'qa-items'
    el.appendChild(badge)
    el.appendChild(itemsEl)
    mainRow.appendChild(el)
    alignToScrollMain(el, mainRow, scrollMain)
    currentRecord = containerRecord
    currentQaEl = el
    currentQaId = null
    requestAnimationFrame(function () {
      alignToScrollMain(el, mainRow, scrollMain)
      el.classList.add('is-visible')
    })
    return el
  }

  function alignToScrollMain(el, mainRow, scrollMain) {
    var mainRect = mainRow.getBoundingClientRect()
    var sRect = scrollMain.getBoundingClientRect()
    var top = sRect.top - mainRect.top
    var left = sRect.left - mainRect.left
    el.style.top = top + 'px'
    el.style.left = left + 'px'
    el.style.width = sRect.width + 'px'
    el.style.height = sRect.height + 'px'
    el.style.right = 'auto'
  }

  function mountAboveBody(containerRecord) {
    destroy()
    var containerEl = containerRecord.el
    if (!containerEl) return null
    var bodyEl = containerEl.querySelector('.course-body')
    if (!bodyEl) return null

    var el = document.createElement('div')
    el.className = 'qa-layer'
    el.dataset.qaMode = 'above-body'

    var slot = document.createElement('div')
    slot.className = 'qa-layer-slot'

    el.appendChild(slot)
    containerEl.insertBefore(el, bodyEl)

    currentRecord = containerRecord
    currentQaEl = el
    currentQaId = null

    requestAnimationFrame(function () {
      el.classList.add('is-visible')
    })
    // 滚动到容器顶部，确保夹层可见
    requestAnimationFrame(function () {
      containerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return el
  }

  function showQuestion(containerRecord, qaItem) {
    var el = findOrCreateBubble(containerRecord)
    if (!el) return null
    if (el.classList.contains('is-minimized')) {
      el.classList.remove('is-minimized')
      el.classList.add('is-visible')
    }

    // 顶部夹层模式：每次只显示一道题
    if (el.dataset.qaMode === 'above-body') {
      var slot = el.querySelector('.qa-layer-slot')
      if (!slot) return el
      if (slot.querySelector('[data-qa-item-id="' + qaItem.id + '"]')) return el

      slot.innerHTML = ''
      var itemEl = document.createElement('div')
      itemEl.className = 'qa-layer-item'
      itemEl.setAttribute('data-qa-item-id', qaItem.id)

      // 标签（同一行）
      var badgeEl = document.createElement('span')
      badgeEl.className = 'qa-layer-q-badge'
      badgeEl.textContent = '快问快答'

      // 问题文本
      var qEl = document.createElement('span')
      qEl.className = 'qa-layer-question'
      if (qaItem.fillBlank) {
        var parts = qaItem.question.split('＿＿')
        parts.forEach(function (part, i) {
          if (i > 0) {
            var blank = document.createElement('span')
            blank.className = 'qa-layer-blank'
            qEl.appendChild(blank)
          }
          qEl.appendChild(document.createTextNode(part))
        })
      } else {
        setLatexText(qEl, qaItem.question)
      }

      // 答案（右半部分）
      var aEl = document.createElement('span')
      aEl.className = 'qa-layer-answer is-hidden'
      if (qaItem.fillBlank) {
        aEl.dataset.fillBlank = 'true'
      }
      setLatexText(aEl, qaItem.answer || '')

      itemEl.appendChild(badgeEl)
      itemEl.appendChild(qEl)
      itemEl.appendChild(aEl)

      slot.appendChild(itemEl)
      renderLatex(itemEl)
      currentQaId = qaItem.id
      return el
    }

    // 气泡模式：累计追加
    var itemsEl = el.querySelector('.qa-items')
    if (itemsEl.querySelector('[data-qa-item-id="' + qaItem.id + '"]')) return el
    var itemEl = document.createElement('div')
    itemEl.className = 'qa-item'
    itemEl.setAttribute('data-qa-item-id', qaItem.id)

    var qEl = document.createElement('div')
    qEl.className = 'qa-bubble-question'
    if (qaItem.fillBlank) {
      var parts = qaItem.question.split('＿＿')
      parts.forEach(function (part, i) {
        if (i > 0) {
          var blank = document.createElement('span')
          blank.className = 'qa-blank'
          qEl.appendChild(blank)
        }
        qEl.appendChild(document.createTextNode(part))
      })
    } else {
      setLatexText(qEl, qaItem.question)
    }
    itemEl.appendChild(qEl)

    if (!qaItem.fillBlank) {
      var aEl = document.createElement('div')
      aEl.className = 'qa-bubble-answer'
      if (qaItem.answer !== undefined) aEl.classList.add('is-hidden')
      setLatexText(aEl, qaItem.answer || '')
      itemEl.appendChild(aEl)
    }

    itemsEl.appendChild(itemEl)
    renderLatex(itemEl)
    currentQaId = qaItem.id
    return el
  }

  function showAnswer(qaItem) {
    if (!currentQaEl || !qaItem) return

    // 顶部夹层模式
    if (currentQaEl.dataset.qaMode === 'above-body') {
      var itemEl = currentQaEl.querySelector('[data-qa-item-id="' + qaItem.id + '"]')
      if (!itemEl) return
      if (qaItem.fillBlank) {
        fillBlanks(itemEl, '.qa-layer-blank', qaItem.answer)
        return
      }
      var aEl = itemEl.querySelector('.qa-layer-answer')
      if (aEl) aEl.classList.remove('is-hidden')
      return
    }

    // 气泡模式
    var itemEl = currentQaEl.querySelector('[data-qa-item-id="' + qaItem.id + '"]')
    if (!itemEl) return
    if (qaItem.fillBlank) {
      fillBlanks(itemEl, '.qa-blank', qaItem.answer)
      return
    }
    var aEl = itemEl.querySelector('.qa-bubble-answer')
    if (aEl) aEl.classList.remove('is-hidden')
  }

  function fillBlanks(container, sel, answer) {
    var blanks = container.querySelectorAll(sel)
    if (!blanks.length) return
    if (Array.isArray(answer)) {
      blanks.forEach(function (el, i) {
        if (i < answer.length) {
          setLatexText(el, answer[i])
          el.classList.add('is-filled')
        }
      })
    } else {
      blanks.forEach(function (el) {
        setLatexText(el, answer)
        el.classList.add('is-filled')
      })
    }
    renderLatex(container)
  }

  function hide() {
    if (!currentQaEl) return
    currentQaEl.classList.remove('is-visible')
    if (currentQaEl.dataset.qaMode === 'above-body') {
      currentQaEl.classList.add('is-hidden-layer')
      return
    }
    currentQaEl.classList.add('is-minimized')
  }

  function restore(containerRecord) {
    if (currentQaEl && currentQaEl.parentNode) {
      if (currentQaEl.dataset.qaMode === 'above-body') {
        currentQaEl.classList.remove('is-hidden-layer')
        currentQaEl.classList.add('is-visible')
      } else {
        currentQaEl.classList.remove('is-minimized')
        currentQaEl.classList.add('is-visible')
      }
      return currentQaEl
    }
    if (containerRecord && containerRecord.container) {
      return mountAboveBody(containerRecord)
    }
    return mount(containerRecord)
  }

  function destroy() {
    if (currentQaEl && currentQaEl.parentNode) {
      currentQaEl.parentNode.removeChild(currentQaEl)
    }
    currentRecord = null
    currentQaEl = null
    currentQaId = null
  }

  function findOrCreateBubble(containerRecord) {
    if (currentQaEl && currentQaEl.parentNode) {
      // 如果之前是 above-body 但这次 create 没有指定，回退到气泡
      if (currentQaEl.dataset.qaMode === 'above-body') return currentQaEl
      return currentQaEl
    }
    return mount(containerRecord)
  }

  function isOpen() { return !!currentQaEl }
  function isMinimized() {
    return !!(currentQaEl && currentQaEl.classList.contains('is-minimized'))
  }
  function currentId() { return currentQaId }

  window.AIClassQuickQA = {
    mount: mount,
    mountAboveBody: mountAboveBody,
    showQuestion: showQuestion,
    showAnswer: showAnswer,
    hide: hide,
    restore: restore,
    destroy: destroy,
    isOpen: isOpen,
    isMinimized: isMinimized,
    currentId: currentId
  }
})()

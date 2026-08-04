// 轻量 Toast — window.toast.show(message, { duration, icon })
;(function () {
  var timer = null
  var node = null
  var ICON_CHECK =
    '<svg class="aic-toast-icon aic-toast-icon--check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">'
    + '<circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>'
    + '<path d="M4.4 8.2 L6.9 10.6 L11.6 5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>'
  var ICON_ERROR =
    '<svg class="aic-toast-icon aic-toast-icon--error" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">'
    + '<circle cx="8" cy="8" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>'
    + '<path d="M5.2 5.2 L10.8 10.8 M10.8 5.2 L5.2 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>'
  var ICON_SPINNER = '<span class="aic-toast-spinner" aria-hidden="true"></span>'

  function ensureNode() {
    if (node && node.parentNode) return node
    node = document.createElement('div')
    node.className = 'aic-toast'
    node.setAttribute('role', 'status')
    node.setAttribute('aria-live', 'polite')
    node.innerHTML = '<span class="aic-toast-leading" aria-hidden="true"></span>'
      + '<span class="aic-toast-text"></span>'
    document.body.appendChild(node)
    return node
  }

  function clearTone(el) {
    el.classList.remove('aic-toast--success', 'aic-toast--error', 'aic-toast--loading')
  }

  function setIcon(el, icon) {
    var leading = el.querySelector('.aic-toast-leading')
    if (!leading) return
    clearTone(el)
    if (icon === 'check') {
      leading.innerHTML = ICON_CHECK
      el.classList.add('aic-toast--success')
      return
    }
    if (icon === 'error') {
      leading.innerHTML = ICON_ERROR
      el.classList.add('aic-toast--error')
      return
    }
    if (icon === 'none') {
      leading.innerHTML = ''
      return
    }
    leading.innerHTML = ICON_SPINNER
    el.classList.add('aic-toast--loading')
  }

  function hide() {
    if (!node) return
    node.classList.remove('aic-toast--visible')
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function show(message, opts) {
    opts = opts || {}
    message = message != null ? String(message) : '提交中…'
    var el = ensureNode()
    var icon = opts.icon
    if (icon == null) {
      if (/成功/.test(message) && !/未成功/.test(message)) icon = 'check'
      else if (/未成功|失败|错误|无效/.test(message)) icon = 'error'
      else if (/中[…\.]*$|加载|识别中/.test(message)) icon = 'spinner'
      else icon = 'none'
    }
    setIcon(el, icon)
    var text = el.querySelector('.aic-toast-text')
    if (text) text.textContent = message
    el.classList.add('aic-toast--visible')
    if (timer) clearTimeout(timer)
    var duration = opts.duration != null ? opts.duration : 1200
    if (duration > 0) {
      timer = setTimeout(hide, duration)
    }
    return { hide: hide }
  }

  window.toast = {
    show: show,
    hide: hide
  }
})()

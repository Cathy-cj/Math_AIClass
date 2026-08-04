// DOM 工具 — AIClassComponent._dom（create、append 等）
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}

  function append(parent, children) {
    ;(children || []).forEach(function (child) {
      if (child == null) return
      parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
    })
    return parent
  }

  function create(tagName, opts, children) {
    opts = opts || {}
    var el = document.createElement(tagName)
    if (opts.className) el.className = opts.className
    if (opts.text != null) el.textContent = String(opts.text)
    if (opts.type) el.type = opts.type
    if (opts.disabled != null) el.disabled = !!opts.disabled
    if (opts.attributes) {
      Object.keys(opts.attributes).forEach(function (name) {
        var value = opts.attributes[name]
        if (value == null) return
        el.setAttribute(name, String(value))
      })
    }
    if (opts.on) {
      Object.keys(opts.on).forEach(function (type) {
        if (typeof opts.on[type] === 'function') el.addEventListener(type, opts.on[type])
      })
    }
    return append(el, children)
  }

  function toggle(el, className, active) {
    if (!el) return
    el.classList.toggle(className, !!active)
  }

  ns._dom = {
    append: append,
    create: create,
    toggle: toggle
  }
})()

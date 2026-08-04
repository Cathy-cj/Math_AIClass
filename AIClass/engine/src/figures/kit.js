// LEGACY SVG Figure helpers — 仅供未迁移 Figure。新图请用 JXGKit2D / JXGKit3D。
// 不包含课程坐标、颜色或文案。
;(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg'

  function element(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag)
    Object.keys(attrs || {}).forEach(function (key) {
      if (attrs[key] != null) node.setAttribute(key, String(attrs[key]))
    })
    if (text != null) node.textContent = String(text)
    return node
  }

  function append(parent, tag, attrs, text) {
    var node = element(tag, attrs, text)
    parent.appendChild(node)
    return node
  }

  function clear(parent) {
    while (parent && parent.firstChild) parent.removeChild(parent.firstChild)
  }

  function createSvg(target, options) {
    options = options || {}
    var svg = element('svg', {
      viewBox: options.viewBox || '0 0 640 420',
      role: options.role || 'img',
      'aria-label': options.label || ''
    })
    target.appendChild(svg)
    return svg
  }

  function setVisible(node, visible) {
    if (node) node.style.display = visible ? '' : 'none'
  }

  function toggleClass(node, className, active) {
    if (node) node.classList.toggle(className, !!active)
  }

  window.AIClassFigureKit = {
    SVG_NS: SVG_NS,
    element: element,
    append: append,
    clear: clear,
    createSvg: createSvg,
    setVisible: setVisible,
    toggleClass: toggleClass
  }
})()

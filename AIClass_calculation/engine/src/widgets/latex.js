// latex 公式块 widget — push type: latex
;(function () {
  function createLatexEl(block) {
    var wrap = document.createElement('div')
    wrap.className = 'lf-latex'
    if (block.display) wrap.classList.add('lf-latex--display')
    if (block.align === 'center') wrap.classList.add('lf-latex--center')
    if (block.align === 'left') wrap.classList.add('lf-latex--left')
    if (block.variant) wrap.classList.add('lf-latex--' + block.variant)

    var tex = block.tex || block.value || ''
    var rawTex = tex
    if (block.display && tex.indexOf('$$') === -1) {
      tex = '$$' + tex + '$$'
    } else if (!block.display && tex.indexOf('$') === -1) {
      tex = '$' + tex + '$'
    }
    wrap.setAttribute('data-calc-tex', rawTex)
    wrap.textContent = tex
    return wrap
  }

  AIClassWidgetRegistry.register('latex', function (el, block) {
    var wrap = createLatexEl(block)
    el.appendChild(wrap)
    if (window.AIClassLatex) AIClassLatex.render(wrap)
  })
})()

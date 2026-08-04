// LaTeX 渲染服务 — 默认加载本地 vendor，可通过 AICLASS_RUNTIME_CONFIG 覆盖
// 供 widgets/latex.js 与 course-container 批量渲染公式
;(function () {
  if (window.AIClassLatex) return

  var ns = window.AIClassLatex = {}
  var config = window.AICLASS_RUNTIME_CONFIG || {}
  var base = config.katexBase || 'vendor/katex/'
  var pending = []
  var ready = false

  var link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = base + 'katex.min.css'
  document.head.appendChild(link)

  function loadKaTeX() {
    var script = document.createElement('script')
    script.src = base + 'katex.min.js'
    script.onload = function () {
      var auto = document.createElement('script')
      auto.src = base + 'contrib/auto-render.min.js'
      auto.onload = function () {
        ready = true
        pending.forEach(function (el) { renderNow(el) })
        pending.length = 0
      }
      document.head.appendChild(auto)
    }
    script.onerror = function () {
      console.warn('[AIClassLatex] 无法加载 KaTeX，公式将显示为纯文本：' + base)
      ready = true
      pending.length = 0
    }
    document.head.appendChild(script)
  }
  loadKaTeX()

  function renderNow(rootEl) {
    if (!rootEl || !window.renderMathInElement) return
    try {
      renderMathInElement(rootEl, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$',  right: '$',  display: false }
        ],
        throwOnError: false,
        errorColor: '#e53935'
      })
    } catch (e) { /* 已被 throwOnError:false 静默 */ }
  }

  ns.render = function (rootEl) {
    if (!rootEl) return
    if (!ready) { pending.push(rootEl); return }
    renderNow(rootEl)
  }
})()

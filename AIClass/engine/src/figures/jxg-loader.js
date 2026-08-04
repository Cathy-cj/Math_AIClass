// JSXGraph 离线加载 — 默认 vendor/jsxgraph/，可由 AICLASS_RUNTIME_CONFIG 覆盖
;(function () {
  var config = window.AICLASS_RUNTIME_CONFIG || {}
  var base = config.jsxgraphBase || 'vendor/jsxgraph/'
  if (base.slice(-1) !== '/') base += '/'

  var cssHref = config.jsxgraphCss || base + 'jsxgraph.css'
  var scriptSrc = config.jsxgraphSrc || base + 'jsxgraphcore.js'

  function ensureCss() {
    if (document.querySelector('link[data-aiclass-jsxgraph]')) return
    var link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = cssHref
    link.setAttribute('data-aiclass-jsxgraph', '1')
    document.head.appendChild(link)
  }

  var loading = false
  var queue = []

  /** 全局默认关 KaTeX，避免明文点名/△∠ 被误渲染；kit 按需对单个 text 开启 */
  function configureDefaults() {
    if (!window.JXG || !window.JXG.Options) return
    if (!window.JXG.Options.text) window.JXG.Options.text = {}
    window.JXG.Options.text.useKatex = false
  }

  function flush(err) {
    if (!err) configureDefaults()
    var q = queue.slice()
    queue.length = 0
    loading = false
    q.forEach(function (fn) {
      try {
        fn(err)
      } catch (e) {
        /* ignore listener errors */
      }
    })
  }

  function load(callback) {
    if (window.JXG && window.JXG.JSXGraph) {
      configureDefaults()
      if (callback) callback(null)
      return
    }
    if (callback) queue.push(callback)
    if (loading) return
    loading = true
    ensureCss()
    var script = document.createElement('script')
    script.src = scriptSrc
    script.charset = 'UTF-8'
    script.onload = function () {
      flush(window.JXG ? null : new Error('[AIClass] JSXGraph failed to initialize'))
    }
    script.onerror = function () {
      flush(new Error('[AIClass] Failed to load ' + scriptSrc))
    }
    document.head.appendChild(script)
  }

  /** @returns {Promise<void>} */
  function ready() {
    return new Promise(function (resolve, reject) {
      load(function (err) {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  window.AIClassJSXGraph = {
    load: load,
    ready: ready,
    base: base
  }

  // 启动即拉取，保证后续 figure kit / 课模块可用（file:// 友好）
  load()
})()

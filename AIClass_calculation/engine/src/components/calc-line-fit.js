// 计算题公式：先单行缩字；仍溢出再在 = / 除号处断行，逐行缩字
;(function () {
  if (window.AIClassCalcLineFit) return

  var FIT_BLOCK_SELECTOR = [
    '.lf-block.calc-eq',
    '.lf-block.calc-solve-step',
    '.lf-block.calc-answer',
    '.lf-block.calc-key-tex'
  ].join(',')

  var SCALE_MIN = 0.5
  var SCALE_STEP = 0.05
  var WIDTH_PAD = 4
  var observers = typeof WeakMap !== 'undefined' ? new WeakMap() : null

  function getSplit() {
    return window.AIClassCalcTexSplit || null
  }

  function stripDelimiters(tex) {
    tex = tex == null ? '' : String(tex).trim()
    if (tex.indexOf('$$') === 0 && tex.lastIndexOf('$$') === tex.length - 2) {
      return tex.slice(2, -2)
    }
    if (tex.indexOf('$') === 0 && tex.lastIndexOf('$') === tex.length - 1) {
      return tex.slice(1, -1)
    }
    return tex
  }

  function getRawTex(latexEl) {
    if (!latexEl) return ''
    var raw = latexEl.getAttribute('data-calc-tex')
    if (raw != null && raw !== '') return raw
    return stripDelimiters(latexEl.textContent || '')
  }

  function contentWidth(el) {
    if (!el) return 0
    var katex = el.querySelector('.katex')
    if (katex) {
      var html = katex.querySelector('.katex-html')
      if (html) {
        var w = html.scrollWidth || html.getBoundingClientRect().width
        if (w > 0) return w
      }
      return katex.scrollWidth || katex.getBoundingClientRect().width
    }
    return el.scrollWidth || el.getBoundingClientRect().width
  }

  function availableWidth(blockEl) {
    if (!blockEl) return 0
    var style = window.getComputedStyle(blockEl)
    var padL = parseFloat(style.paddingLeft) || 0
    var padR = parseFloat(style.paddingRight) || 0
    return Math.max(0, blockEl.clientWidth - padL - padR - WIDTH_PAD)
  }

  function lineOverflows(lineEl, maxWidth) {
    return contentWidth(lineEl) > maxWidth + 0.5
  }

  function anyLineOverflows(lineEls, maxWidth) {
    for (var i = 0; i < lineEls.length; i++) {
      if (lineOverflows(lineEls[i], maxWidth)) return true
    }
    return false
  }

  function clearLineScale(lineEl) {
    if (!lineEl) return
    lineEl.removeAttribute('data-calc-fit-scale')
    lineEl.style.removeProperty('--calc-fit-scale')
    var katex = lineEl.querySelector('.katex')
    if (katex) katex.style.removeProperty('font-size')
  }

  function scaleOverflowLine(lineEl, maxWidth) {
    var katex = lineEl.querySelector('.katex')
    if (!katex) return false
    clearLineScale(lineEl)
    if (!lineOverflows(lineEl, maxWidth)) return false

    var baseSize = parseFloat(window.getComputedStyle(katex).fontSize) || 16
    var size = baseSize
    var minSize = baseSize * SCALE_MIN
    var scaled = false

    while (size > minSize && lineOverflows(lineEl, maxWidth)) {
      size = Math.max(minSize, size * (1 - SCALE_STEP))
      katex.style.fontSize = size + 'px'
      scaled = true
    }

    if (lineOverflows(lineEl, maxWidth) && katex) {
      var renderedW = contentWidth(lineEl)
      if (renderedW > maxWidth + 0.5) {
        var shrink = Math.max(SCALE_MIN, maxWidth / renderedW)
        katex.style.fontSize = (baseSize * shrink) + 'px'
        lineEl.setAttribute('data-calc-fit-scale', '1')
        lineEl.style.setProperty('--calc-fit-scale', String(shrink))
        scaled = true
      }
    }

    if (scaled && !lineEl.getAttribute('data-calc-fit-scale')) {
      lineEl.setAttribute('data-calc-fit-scale', '1')
      lineEl.style.setProperty('--calc-fit-scale', String(size / baseSize))
    }
    return scaled
  }

  function buildLineDom(latexEl, lines) {
    latexEl.innerHTML = ''
    latexEl.classList.add('lf-latex--display', 'lf-latex--left')
    var lineEls = []
    for (var i = 0; i < lines.length; i++) {
      var row = document.createElement('div')
      row.className = 'calc-fit-line'
      row.textContent = '$$' + lines[i] + '$$'
      latexEl.appendChild(row)
      lineEls.push(row)
    }
    return lineEls
  }

  function renderLines(latexEl, lines) {
    var lineEls = buildLineDom(latexEl, lines)
    if (window.AIClassLatex) {
      for (var r = 0; r < lineEls.length; r++) {
        window.AIClassLatex.render(lineEls[r])
      }
    }
    return lineEls
  }

  function scaleLines(lineEls, avail) {
    var scaledAny = false
    for (var i = 0; i < lineEls.length; i++) {
      if (scaleOverflowLine(lineEls[i], avail)) scaledAny = true
    }
    return scaledAny
  }

  function chooseLineGrouping(rawTex, latexEl, blockEl, segments) {
    var split = getSplit()
    if (!split) return { lines: [rawTex], lineEls: [], breaks: 0, scaledAny: false }
    var maxBreaks = split.maxBreakCount(segments)
    var avail = availableWidth(blockEl)

    // 1) 优先单行 + 缩字（裂项长式等只有开头一个 = 的场景）
    var singleLines = [rawTex]
    var singleEls = renderLines(latexEl, singleLines)
    var scaledSingle = scaleLines(singleEls, avail)
    if (!anyLineOverflows(singleEls, avail)) {
      return { lines: singleLines, lineEls: singleEls, breaks: 0, scaledAny: scaledSingle }
    }

    // 2) 缩到极限仍溢出：再在 = / 除号处递增断行
    for (var breaks = 1; breaks <= maxBreaks; breaks++) {
      var lines = split.groupSegmentsIntoLines(segments, breaks)
      var lineEls = renderLines(latexEl, lines)
      var scaled = scaleLines(lineEls, avail)
      if (!anyLineOverflows(lineEls, avail)) {
        return { lines: lines, lineEls: lineEls, breaks: breaks, scaledAny: scaled || scaledSingle }
      }
    }

    var fallbackLines = split.groupSegmentsIntoLines(segments, maxBreaks)
    var fallbackEls = renderLines(latexEl, fallbackLines)
    var scaledFallback = scaleLines(fallbackEls, avail)
    return {
      lines: fallbackLines,
      lineEls: fallbackEls,
      breaks: maxBreaks,
      scaledAny: scaledFallback || scaledSingle
    }
  }

  function markBlockFit(blockEl, mode) {
    if (!blockEl) return
    if (mode === 'none') blockEl.removeAttribute('data-calc-fit')
    else blockEl.setAttribute('data-calc-fit', mode)
  }

  function resetBlock(blockEl) {
    if (!blockEl) return
    var latexEl = blockEl.querySelector('.lf-latex')
    if (!latexEl) return
    var rawTex = getRawTex(latexEl)
    markBlockFit(blockEl, 'none')
    latexEl.innerHTML = ''
    if (blockEl.classList.contains('calc-eq') ||
        blockEl.classList.contains('calc-solve-step') ||
        blockEl.classList.contains('calc-answer') ||
        blockEl.classList.contains('calc-key-tex')) {
      var tex = rawTex
      if (tex.indexOf('$$') === -1) tex = '$$' + tex + '$$'
      latexEl.textContent = tex
      latexEl.setAttribute('data-calc-tex', rawTex)
      if (window.AIClassLatex) window.AIClassLatex.render(latexEl)
    }
  }

  function blockLineEls(latexEl) {
    var wrapped = latexEl.querySelectorAll('.calc-fit-line')
    if (wrapped.length) return Array.prototype.slice.call(wrapped)
    return [latexEl]
  }

  function fitBlock(blockEl) {
    if (!blockEl || !blockEl.querySelector) return
    var latexEl = blockEl.querySelector('.lf-latex')
    if (!latexEl) return

    var rawTex = getRawTex(latexEl)
    if (!rawTex) return
    latexEl.setAttribute('data-calc-tex', rawTex)

    var split = getSplit()
    if (!split) return

    if (!latexEl.querySelector('.katex')) {
      latexEl.textContent = '$$' + rawTex + '$$'
      if (window.AIClassLatex) window.AIClassLatex.render(latexEl)
    }

    var avail = availableWidth(blockEl)
    if (!anyLineOverflows(blockLineEls(latexEl), avail)) {
      if (!latexEl.querySelector('.calc-fit-line')) markBlockFit(blockEl, 'none')
      return
    }

    var segments = split.splitIntoSegments(rawTex)
    var result = chooseLineGrouping(rawTex, latexEl, blockEl, segments)

    var mode = 'none'
    if (result.breaks > 0) mode = 'wrap'
    if (result.scaledAny) mode = mode === 'wrap' ? 'wrap+scale' : 'scale'
    markBlockFit(blockEl, mode)
  }

  function apply(rootEl) {
    if (!rootEl || !rootEl.querySelectorAll) return
    var blocks = rootEl.querySelectorAll(FIT_BLOCK_SELECTOR)
    for (var i = 0; i < blocks.length; i++) {
      fitBlock(blocks[i])
    }
  }

  function reset(rootEl) {
    if (!rootEl || !rootEl.querySelectorAll) return
    var blocks = rootEl.querySelectorAll(FIT_BLOCK_SELECTOR)
    for (var i = 0; i < blocks.length; i++) {
      resetBlock(blocks[i])
    }
  }

  function ensureObserver(containerEl) {
    if (!observers || typeof ResizeObserver === 'undefined') return
    if (observers.has(containerEl)) return
    var timer = null
    var ro = new ResizeObserver(function () {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(function () {
        apply(containerEl)
      }, 120)
    })
    ro.observe(containerEl)
    observers.set(containerEl, ro)
  }

  function applyAfterRender(containerEl) {
    if (!containerEl) return
    var run = function () {
      apply(containerEl)
      ensureObserver(containerEl)
    }
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(run)
      })
      return
    }
    window.setTimeout(run, 0)
  }

  window.AIClassCalcLineFit = {
    apply: apply,
    reset: reset,
    applyAfterRender: applyAfterRender,
    fitBlock: fitBlock,
    resetBlock: resetBlock
  }
})()

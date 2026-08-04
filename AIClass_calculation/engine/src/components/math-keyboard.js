// 浮层数学键盘 — FAB + 可拖拽面板；AIClassComponent.getFloatingMathKeyboard
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var dom = ns._dom

  if (!dom) throw new Error('[AIClassComponent.MathKeyboard] shared/dom.js is required')

  var LAYOUT = {
    cols: 5,
    rows: 5,
    rowHeight: 36,
    gap: 6,
    gridPadding: 8,
    paddingTop: 12,
    paddingBottom: 10,
    headerGap: 10,
    baseWidth: 340
  }

  var DEFAULT_LAYOUT = [
    [
      { label: '1', value: '1', kind: 'digit' },
      { label: '2', value: '2', kind: 'digit' },
      { label: '3', value: '3', kind: 'digit' },
      { label: '+', value: '+', kind: 'operator' },
      { label: 'x', value: 'x', kind: 'var', ariaLabel: 'x' }
    ],
    [
      { label: '4', value: '4', kind: 'digit' },
      { label: '5', value: '5', kind: 'digit' },
      { label: '6', value: '6', kind: 'digit' },
      { label: '−', value: '−', kind: 'operator', ariaLabel: '减' },
      { label: 'y', value: 'y', kind: 'var', ariaLabel: 'y' }
    ],
    [
      { label: '7', value: '7', kind: 'digit' },
      { label: '8', value: '8', kind: 'digit' },
      { label: '9', value: '9', kind: 'digit' },
      { label: '×', value: '×', kind: 'operator', ariaLabel: '乘' },
      { label: 'π', value: 'π', kind: 'var', ariaLabel: '圆周率' }
    ],
    [
      { isParenPair: true },
      { label: '0', value: '0', kind: 'digit' },
      { label: '.', value: '.', kind: 'digit', ariaLabel: '小数点' },
      { label: '÷', value: '÷', kind: 'operator', ariaLabel: '除' },
      { label: '^', value: '^', kind: 'symbol', ariaLabel: '次方' }
    ],
    [
      { action: 'fraction', kind: 'symbol', ariaLabel: '分数', isFraction: true },
      { label: '%', value: '%', kind: 'operator', ariaLabel: '百分号' },
      { label: '=', value: '=', kind: 'operator', ariaLabel: '等于', isEquals: true },
      { action: 'nextField', kind: 'nav', ariaLabel: '下一个填空', isNextField: true },
      { action: 'backspace', kind: 'action', ariaLabel: '删除', isBackspace: true }
    ]
  ]

  var sharedInstance = null

  function capturePointer(el, event) {
    try {
      if (el.setPointerCapture) el.setPointerCapture(event.pointerId)
    } catch (err) { /* ignore */ }
  }

  function releasePointer(el, event) {
    try {
      if (el.hasPointerCapture && el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId)
      }
    } catch (err) { /* ignore */ }
  }

  /** Mouse + touch press; activates on pointerup to avoid ghost clicks and iOS click suppression. */
  function wirePointerPress(el, handler, canPress) {
    var activeId = null

    function allowed() {
      return canPress ? canPress() : true
    }

    el.addEventListener('pointerdown', function (event) {
      if (!allowed()) return
      activeId = event.pointerId
      capturePointer(el, event)
      event.preventDefault()
    })

    function finish(event) {
      if (activeId == null || event.pointerId !== activeId) return
      activeId = null
      releasePointer(el, event)
      if (allowed()) handler(event)
    }

    el.addEventListener('pointerup', finish)
    el.addEventListener('pointercancel', function (event) {
      if (event.pointerId === activeId) {
        activeId = null
        releasePointer(el, event)
      }
    })
  }

  /** Drag / resize via Pointer Events with capture — works on touch and mouse. */
  function wirePointerDrag(el, options) {
    options = options || {}
    var active = false
    var pointerId = null

    function canStart() {
      return options.canStart ? options.canStart() : true
    }

    el.addEventListener('pointerdown', function (event) {
      if (!canStart()) return
      if (options.onStart && options.onStart(event) === false) return
      active = true
      pointerId = event.pointerId
      capturePointer(el, event)
      event.preventDefault()
    })

    el.addEventListener('pointermove', function (event) {
      if (!active || event.pointerId !== pointerId) return
      event.preventDefault()
      if (options.onMove) options.onMove(event)
    })

    function end(event) {
      if (!active || event.pointerId !== pointerId) return
      active = false
      pointerId = null
      releasePointer(el, event)
      if (options.onEnd) options.onEnd(event)
    }

    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
  }

  function readValue(target, fallback) {
    if (!target) return fallback != null ? String(fallback) : ''
    if (target.isContentEditable) return target.textContent || ''
    return target.value != null ? String(target.value) : ''
  }

  function writeValue(target, value, silent) {
    if (!target) return value
    if (target.isContentEditable) target.textContent = value
    else target.value = value
    if (!silent) {
      try {
        target.dispatchEvent(new Event('input', { bubbles: true }))
      } catch (err) {
        var evt = document.createEvent('Event')
        evt.initEvent('input', true, true)
        target.dispatchEvent(evt)
      }
    }
    return value
  }

  function insertAtCursor(target, text) {
    if (!target || !text) return readValue(target, '')
    if (target.isContentEditable) {
      writeValue(target, (target.textContent || '') + text)
      return readValue(target, '')
    }
    var start = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length
    var end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start
    var value = target.value != null ? String(target.value) : ''
    var next = value.slice(0, start) + text + value.slice(end)
    writeValue(target, next)
    var caret = start + text.length
    if (typeof target.setSelectionRange === 'function') target.setSelectionRange(caret, caret)
    return next
  }

  function backspaceAtCursor(target) {
    if (!target) return ''
    if (target.isContentEditable) {
      var content = target.textContent || ''
      if (!content) return ''
      writeValue(target, content.slice(0, -1))
      return readValue(target, '')
    }
    var start = typeof target.selectionStart === 'number' ? target.selectionStart : target.value.length
    var end = typeof target.selectionEnd === 'number' ? target.selectionEnd : start
    var value = target.value != null ? String(target.value) : ''
    if (start !== end) {
      writeValue(target, value.slice(0, start) + value.slice(end))
      if (typeof target.setSelectionRange === 'function') target.setSelectionRange(start, start)
    } else if (start > 0) {
      writeValue(target, value.slice(0, start - 1) + value.slice(start))
      if (typeof target.setSelectionRange === 'function') target.setSelectionRange(start - 1, start - 1)
    }
    return readValue(target, '')
  }

  function createAllowFromPreset(preset) {
    if (preset === 'numbers') {
      return function (text) { return /^\d$/.test(text) }
    }
    if (preset === 'decimal') {
      return function (text, current) {
        if (/^\d$/.test(text)) return true
        return text === '.' && current.indexOf('.') < 0
      }
    }
    if (preset === 'formula') {
      return function (text) {
        return /^[\d×÷+\-−=＝π.%^()\s]$/.test(text)
      }
    }
    return null
  }

  function normalizeLayout(layout) {
    if (!Array.isArray(layout) || !layout.length) return DEFAULT_LAYOUT
    return layout
  }

  var MIN_PANEL_WIDTH = 260

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n))
  }

  function minPanelHeight(scale) {
    var vs = scale || 1
    var pad = (LAYOUT.paddingTop + LAYOUT.paddingBottom) * vs
    var header = (28 + LAYOUT.headerGap) * vs
    var gridPad = (LAYOUT.gridPadding || 0) * vs
    var rows = LAYOUT.rows * LAYOUT.rowHeight * vs
    var gaps = (LAYOUT.rows - 1) * LAYOUT.gap * vs
    return Math.ceil(pad + header + gridPad + rows + gaps)
  }

  function panelSizeLimits(scale) {
    var vs = scale || 1
    var minH = minPanelHeight(vs)
    return {
      minW: Math.round(MIN_PANEL_WIDTH * vs),
      minH: minH,
      maxW: Math.max(MIN_PANEL_WIDTH, window.innerWidth - 24),
      maxH: Math.max(minH, window.innerHeight - 80)
    }
  }

  function clampPanelSize(width, height, scale) {
    var lim = panelSizeLimits(scale)
    return {
      w: Math.max(lim.minW, Math.min(lim.maxW, Math.round(width))),
      h: Math.max(lim.minH, Math.min(lim.maxH, Math.round(height)))
    }
  }

  function createFloatingMathKeyboard(opts) {
    opts = opts || {}
    var layout = normalizeLayout(opts.layout)
    var disabled = opts.interactive === false || !!opts.disabled
    var target = null
    var targetMeta = null
    var maxLength = null
    var allowInsert = opts.allow || null
    var open = false
    var visible = false
    var panelWidth = Number(opts.width) || 0

    var anchor = opts.anchor || 'bottom-left'
    var root = dom.create('div', {
      className: 'aic-float-kb' + (opts.className ? ' ' + opts.className : ''),
      attributes: { 'aria-label': opts.ariaLabel || '数学键盘' }
    })

    var fab = dom.create('button', {
      type: 'button',
      className: 'aic-float-kb-fab',
      attributes: { 'aria-label': '打开数学键盘', 'aria-expanded': 'false' }
    })
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="6" y="8" width="3" height="2.5" rx="0.6" fill="currentColor"/><rect x="10.5" y="8" width="3" height="2.5" rx="0.6" fill="currentColor"/><rect x="15" y="8" width="3" height="2.5" rx="0.6" fill="currentColor"/><rect x="6" y="12.5" width="3" height="2.5" rx="0.6" fill="currentColor"/><rect x="10.5" y="12.5" width="3" height="2.5" rx="0.6" fill="currentColor"/><rect x="15" y="12.5" width="3" height="2.5" rx="0.6" fill="currentColor"/></svg>'

    var panel = dom.create('div', {
      className: 'aic-float-kb-panel',
      attributes: { role: 'dialog', 'aria-label': '数学键盘', 'aria-hidden': 'true' }
    })

    var header = dom.create('div', { className: 'aic-float-kb-header' })
    var dragHandle = dom.create('button', {
      type: 'button',
      className: 'aic-float-kb-drag',
      attributes: { 'aria-label': '按住拖动' }
    })
    dragHandle.innerHTML =
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v14M1 8h14M4 4l4-3 4 3M4 12l4 3 4-3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>按住拖动</span>'

    var closeBtn = dom.create('button', {
      type: 'button',
      className: 'aic-float-kb-close',
      attributes: { 'aria-label': '关闭键盘' },
      text: '×'
    })

    header.appendChild(dragHandle)
    header.appendChild(closeBtn)

    var grid = dom.create('div', { className: 'aic-float-kb-grid' })
    var nextFieldBtn = null

    function createParenCell() {
      var dualCell = dom.create('div', { className: 'aic-float-kb-dual-cell' })
      ;[
        { label: '(', value: '(', ariaLabel: '左括号' },
        { label: ')', value: ')', ariaLabel: '右括号' }
      ].forEach(function (half) {
        var halfBtn = dom.create('button', {
          type: 'button',
          className: 'aic-float-kb-key aic-float-kb-key--symbol is-paren-half',
          text: half.label,
          disabled: disabled,
          attributes: { 'aria-label': half.ariaLabel }
        })
        wirePointerPress(halfBtn, function () { handleInsert(half.value) }, function () { return !disabled })
        dualCell.appendChild(halfBtn)
      })
      return dualCell
    }

    function createKeyButton(key) {
      var className = 'aic-float-kb-key aic-float-kb-key--' + (key.kind || 'operator')
      if (key.isBackspace) className += ' is-backspace'
      if (key.isNextField) className += ' is-next-field'
      if (key.isFraction) className += ' is-fraction'
      if (key.isEquals) className += ' is-equals'
      if (key.kind === 'var') className += ' is-var'

      var btn = dom.create('button', {
        type: 'button',
        className: className,
        disabled: disabled,
        attributes: {
          'aria-label': key.ariaLabel || key.label || key.action || '按键'
        }
      })

      wirePointerPress(btn, function () { handleKey(key) }, function () { return !disabled })

      if (key.isFraction) {
        btn.innerHTML = '<span class="aic-float-kb-fraction"><span>·</span><span class="bar"></span><span>·</span></span>'
      } else if (key.isBackspace) {
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-4-4V7l4-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 10l4 4m0-4l-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
      } else if (key.isNextField) {
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M13 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        nextFieldBtn = btn
      } else {
        btn.textContent = key.label || ''
      }

      return btn
    }

    layout.forEach(function (row) {
      row.forEach(function (key) {
        if (key.kind === 'gap') {
          grid.appendChild(dom.create('span', { className: 'aic-float-kb-gap' }))
          return
        }
        if (key.isParenPair) {
          grid.appendChild(createParenCell())
          return
        }
        grid.appendChild(createKeyButton(key))
      })
    })

    var resizeHandle = dom.create('div', {
      className: 'aic-float-kb-resize',
      attributes: { 'aria-hidden': 'true' }
    })

    panel.appendChild(header)
    panel.appendChild(grid)
    panel.appendChild(resizeHandle)
    root.appendChild(fab)
    root.appendChild(panel)

    function applyAnchor(nextAnchor) {
      anchor = nextAnchor || 'bottom-left'
      var isRight = anchor === 'bottom-right' || anchor === 'right'
      dom.toggle(root, 'is-anchor-bottom-right', isRight)
      if (!panel.style.left && !panel.style.top) {
        panel.style.left = ''
        panel.style.top = ''
        panel.style.right = ''
        panel.style.bottom = ''
      }
    }

    applyAnchor(anchor)

    var userSized = false
    var panelUserWidth = panelWidth > 0 ? panelWidth : 0
    var panelUserHeight = 0
    if (panelWidth > 0) userSized = true

    if (typeof ns.createViewportScaleController !== 'function') {
      throw new Error('[AIClassComponent.MathKeyboard] viewport-scale.js is required')
    }
    var viewportScale = ns.createViewportScaleController({
      designWidth: opts.designWidth,
      designHeight: opts.designHeight,
      minScale: opts.minViewportScale,
      maxScale: opts.maxViewportScale,
      scaleRoot: opts.scaleRoot
    })

    function applyPanelSize(scale) {
      var vs = scale != null ? scale : viewportScale.getScale()
      root.style.setProperty('--aic-kb-viewport-scale', String(vs))
      root.style.setProperty('--aic-kb-fab-gap', Math.round(64 * vs) + 'px')

      var w = userSized && panelUserWidth > 0
        ? panelUserWidth
        : Math.round(LAYOUT.baseWidth * vs)
      var h = userSized && panelUserHeight > 0
        ? panelUserHeight
        : minPanelHeight(vs)
      var clamped = clampPanelSize(w, h, vs)
      panelUserWidth = clamped.w
      panelUserHeight = clamped.h
      root.style.setProperty('--aic-kb-panel-width', clamped.w + 'px')
      root.style.setProperty('--aic-kb-panel-height', clamped.h + 'px')
    }

    viewportScale.subscribe(applyPanelSize)
    viewportScale.start()

    var boundInputs = []

    function refocusTarget() {
      if (target && typeof target.focus === 'function') target.focus()
    }

    function canInsert(text) {
      if (!text || !target) return false
      var current = readValue(target, '')
      if (allowInsert && !allowInsert(text, current)) return false
      if (maxLength == null || isNaN(maxLength)) return true
      return current.length + text.length <= maxLength
    }

    function handleInsert(text) {
      if (disabled || !target || !text || !canInsert(text)) return
      insertAtCursor(target, text)
      refocusTarget()
      if (typeof opts.onInput === 'function') opts.onInput({ action: 'insert', value: text }, readValue(target, ''))
      if (typeof opts.onChange === 'function') opts.onChange(readValue(target, ''))
      if (targetMeta && typeof targetMeta.onInput === 'function') targetMeta.onInput(readValue(target, ''))
    }

    function isInputUsable(input) {
      if (!input || input.disabled) return false
      if (input.classList.contains('lf-fill-input')) {
        var block = input.closest('.lf-block[data-block-type="fill"]')
        return !!(block && block.getAttribute('data-is-current-step') === 'true')
      }
      return !input.readOnly
    }

    function firstUsableInput() {
      for (var i = 0; i < boundInputs.length; i++) {
        if (isInputUsable(boundInputs[i].el)) return boundInputs[i]
      }
      return null
    }

    function pruneBindings(activeInputs) {
      var keep = {}
      ;(activeInputs || []).forEach(function (input) { keep[input] = true })
      var next = []
      for (var i = 0; i < boundInputs.length; i++) {
        var entry = boundInputs[i]
        if (keep[entry.el]) {
          next.push(entry)
        } else if (target === entry.el) {
          setTarget(null, null)
        }
      }
      boundInputs = next
      updateNextFieldButton()
    }

    function findTargetIndex() {
      for (var i = 0; i < boundInputs.length; i++) {
        if (boundInputs[i].el === target) return i
      }
      return -1
    }

    function updateNextFieldButton() {
      if (!nextFieldBtn) return
      var idx = findTargetIndex()
      var canNext = boundInputs.length > 1 && idx >= 0 && idx < boundInputs.length - 1
      nextFieldBtn.disabled = disabled || !canNext
    }

    function focusNextField() {
      if (disabled || boundInputs.length < 2) return
      var idx = findTargetIndex()
      if (idx < 0 || idx >= boundInputs.length - 1) return
      var next = boundInputs[idx + 1]
      if (!next || !next.el || next.el.disabled) return
      setTarget(next.el, next.meta)
      next.el.focus()
      updateNextFieldButton()
    }

    function handleBackspace() {
      if (disabled || !target) return
      backspaceAtCursor(target)
      refocusTarget()
      if (typeof opts.onChange === 'function') opts.onChange(readValue(target, ''))
      if (targetMeta && typeof targetMeta.onInput === 'function') targetMeta.onInput(readValue(target, ''))
    }

    function handleKey(key) {
      if (!key || disabled) return
      if (key.action === 'backspace') {
        handleBackspace()
        return
      }
      if (key.action === 'nextField') {
        focusNextField()
        return
      }
      if (key.action === 'fraction') {
        handleInsert('/')
        return
      }
      handleInsert(key.value || key.label || '')
    }

    function show() {
      visible = true
      dom.toggle(root, 'is-visible', true)
    }

    function hide() {
      visible = false
      closePanel()
      setTarget(null, null)
      dom.toggle(root, 'is-visible', false)
    }

    function isVisible() {
      return visible
    }

    function setOpen(nextOpen) {
      open = !!nextOpen
      dom.toggle(root, 'is-open', open)
      fab.setAttribute('aria-expanded', open ? 'true' : 'false')
      panel.setAttribute('aria-hidden', open ? 'false' : 'true')
      if (open) refocusTarget()
    }

    function openPanel() {
      setOpen(true)
    }

    function closePanel() {
      setOpen(false)
    }

    wirePointerPress(fab, function () {
      if (!visible) return
      if (open) closePanel()
      else {
        if (!target || !isInputUsable(target)) {
          var first = firstUsableInput()
          if (first) setTarget(first.el, first.meta)
        }
        openPanel()
      }
    }, function () { return !disabled })

    wirePointerPress(closeBtn, function () { closePanel() }, function () { return !disabled })

    function setTarget(nextTarget, meta) {
      if (targetMeta && targetMeta.onDeactivate) targetMeta.onDeactivate()
      target = nextTarget || null
      targetMeta = meta || null
      if (targetMeta && targetMeta.onActivate) targetMeta.onActivate()
      if (meta) {
        maxLength = meta.maxLength != null && !isNaN(meta.maxLength) ? Number(meta.maxLength) : null
        allowInsert = meta.allow || opts.allow || null
      } else {
        maxLength = null
        allowInsert = opts.allow || null
      }
      updateNextFieldButton()
    }

    function bindInput(input, meta) {
      if (!input) return
      meta = meta || {}
      input.readOnly = true
      input.setAttribute('inputmode', 'none')

      var entry = { el: input, meta: meta }
      boundInputs.push(entry)

      function activate() {
        if (!visible || disabled) return
        setTarget(input, meta)
        openPanel()
        updateNextFieldButton()
      }

      input.addEventListener('focus', activate)
      wirePointerPress(input, activate, function () { return visible && !disabled })

      // 失焦自动收起：等一帧让焦点移到键盘或其他输入框，如果都不在则收起面板
      input.addEventListener('blur', function () {
        setTimeout(function () {
          // 焦点在键盘组件内 → 不收起（用户正在按键）
          if (root.contains(document.activeElement)) return
          // 焦点在另一个绑定的输入框上 → 不收起（切换填空）
          for (var i = 0; i < boundInputs.length; i++) {
            if (boundInputs[i].el === document.activeElement) return
          }
          if (!visible) return
          closePanel()
        }, 0)
      })

      meta.onActivate = function () { input.classList.add('is-active') }
      meta.onDeactivate = function () { input.classList.remove('is-active') }
    }

    function bindAsHelper(input, meta) {
      if (!input) return
      meta = meta || {}

      var entry = { el: input, meta: meta }
      boundInputs.push(entry)

      function activate() {
        if (!visible || disabled) return
        setTarget(input, meta)
        updateNextFieldButton()
      }

      input.addEventListener('focus', activate)

      meta.onActivate = function () { input.classList.add('is-active') }
      meta.onDeactivate = function () { input.classList.remove('is-active') }
    }

    // Drag panel
    var panelStartX = 0
    var panelStartY = 0
    var dragOriginX = 0
    var dragOriginY = 0

    wirePointerDrag(dragHandle, {
      canStart: function () { return !disabled },
      onStart: function (event) {
        dragOriginX = event.clientX
        dragOriginY = event.clientY
        var rect = panel.getBoundingClientRect()
        panelStartX = rect.left
        panelStartY = rect.top
        panel.style.left = panelStartX + 'px'
        panel.style.top = panelStartY + 'px'
        panel.style.bottom = 'auto'
        panel.style.right = 'auto'
      },
      onMove: function (event) {
        var dx = event.clientX - dragOriginX
        var dy = event.clientY - dragOriginY
        var nextX = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, panelStartX + dx))
        var nextY = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, panelStartY + dy))
        panel.style.left = nextX + 'px'
        panel.style.top = nextY + 'px'
      }
    })

    // Resize panel (width + height, independent aspect ratio)
    var resizeStartX = 0
    var resizeStartY = 0
    var resizeStartW = 0
    var resizeStartH = 0

    wirePointerDrag(resizeHandle, {
      canStart: function () { return !disabled },
      onStart: function (event) {
        resizeStartX = event.clientX
        resizeStartY = event.clientY
        resizeStartW = panelUserWidth || panel.offsetWidth
        resizeStartH = panelUserHeight || panel.offsetHeight
      },
      onMove: function (event) {
        var clamped = clampPanelSize(
          resizeStartW + (event.clientX - resizeStartX),
          resizeStartH + (event.clientY - resizeStartY),
          viewportScale.getScale()
        )
        userSized = true
        panelUserWidth = clamped.w
        panelUserHeight = clamped.h
        root.style.setProperty('--aic-kb-panel-width', clamped.w + 'px')
        root.style.setProperty('--aic-kb-panel-height', clamped.h + 'px')
      }
    })

    panel.addEventListener('pointerdown', function (event) {
      if (event.target.closest('.aic-float-kb-key')) event.preventDefault()
    })

    function setDisabled(nextDisabled) {
      disabled = !!nextDisabled
      dom.toggle(root, 'is-disabled', disabled)
      fab.disabled = disabled
      panel.querySelectorAll('.aic-float-kb-key').forEach(function (btn) { btn.disabled = disabled })
      updateNextFieldButton()
      if (disabled) closePanel()
    }

    setDisabled(disabled)
    hide()

    return {
      el: root,
      fab: fab,
      panel: panel,
      bindInput: bindInput,
      bindAsHelper: bindAsHelper,
      pruneBindings: pruneBindings,
      show: show,
      hide: hide,
      isVisible: isVisible,
      open: openPanel,
      close: closePanel,
      setOpen: setOpen,
      setTarget: function (nextTarget, meta) { setTarget(nextTarget, meta) },
      getTarget: function () { return target },
      getValue: function () { return target ? readValue(target, '').trim() : '' },
      setValue: function (value) {
        if (!target) return
        writeValue(target, value != null ? String(value) : '')
        if (targetMeta && targetMeta.onInput) targetMeta.onInput(readValue(target, ''))
      },
      insert: function (text) { handleInsert(String(text || '')) },
      backspace: handleBackspace,
      focusNextField: focusNextField,
      setDisabled: setDisabled,
      setAnchor: applyAnchor,
      syncViewportScale: function () { viewportScale.refresh() },
      setDesignSize: function (width, height) { viewportScale.setDesignSize(width, height) },
      destroy: function () { viewportScale.stop() }
    }
  }

  function getFloatingMathKeyboard(opts) {
    opts = opts || {}
    if (!sharedInstance) {
      sharedInstance = createFloatingMathKeyboard(opts)
      if (sharedInstance.el.parentNode !== document.body) document.body.appendChild(sharedInstance.el)
    } else if (opts.designWidth || opts.designHeight) {
      sharedInstance.setDesignSize(opts.designWidth, opts.designHeight)
    }
    return sharedInstance
  }

  function hideFloatingMathKeyboard() {
    if (sharedInstance && typeof sharedInstance.hide === 'function') sharedInstance.hide()
  }

  function syncFloatingMathKeyboard() {
    if (sharedInstance && typeof sharedInstance.syncViewportScale === 'function') {
      sharedInstance.syncViewportScale()
    }
  }

  ns.createFloatingMathKeyboard = createFloatingMathKeyboard
  ns.getFloatingMathKeyboard = getFloatingMathKeyboard
  ns.hideFloatingMathKeyboard = hideFloatingMathKeyboard
  ns.syncFloatingMathKeyboard = syncFloatingMathKeyboard
  ns.createAllowFromPreset = createAllowFromPreset
  ns.FloatingMathKeyboardLayout = DEFAULT_LAYOUT
})()

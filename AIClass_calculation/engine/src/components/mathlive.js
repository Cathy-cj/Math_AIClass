// MathLive 公式编辑器与课件悬浮键盘。
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var activeField = null
  var panel = null
  var fab = null
  var tabIndex = 0
  var BASE_WIDTH = 540
  var BASE_HEIGHT = 270
  var state = { left: 16, top: 16, scale: 0.82 }
  var pageScale = 1
  var scaleController = null

  var hasMathLive = !!window.MathfieldElement
  if (!hasMathLive) {
    console.warn('[MathLive] CDN runtime failed to load; using plain-text LaTeX fallback')
  }
  var config = window.AICLASS_RUNTIME_CONFIG || {}
  var base = config.mathliveBase || 'https://cdn.jsdmirror.com/npm/mathlive@0.110.0/'
  if (base.charAt(base.length - 1) !== '/') base += '/'
  if (hasMathLive) {
    window.MathfieldElement.fontsDirectory = null
    window.MathfieldElement.soundsDirectory = null
  }
  if (hasMathLive && !document.getElementById('aic-mathlive-fonts')) {
    var fontStyle = document.createElement('link')
    fontStyle.id = 'aic-mathlive-fonts'
    fontStyle.rel = 'stylesheet'
    fontStyle.href = base + 'mathlive-fonts.css'
    document.head.appendChild(fontStyle)
  }

  var tabs = [
    { label: '代数', keys: [
      ['<svg class="aic-key-symbol" viewBox="0 0 32 22" aria-hidden="true"><rect x="11" y="1" width="10" height="7" rx="1"/><path d="M5 11h22"/><rect x="11" y="14" width="10" height="7" rx="1"/></svg>', '\\frac{#@}{#?}', 'insert'], ['<svg class="aic-key-symbol" viewBox="0 0 36 24" aria-hidden="true"><path d="M3 15l5 6L13 5h22"/><rect x="17" y="9" width="11" height="9" rx="1"/></svg>', '\\sqrt{#0}', 'insert'], ['<', '<'], ['(', '('], [')', ')'], ['⌫', 'deleteBackward', 'command'], ['÷', '\\div'],
      ['<svg class="aic-key-symbol" viewBox="0 0 32 22" aria-hidden="true"><rect x="5" y="9" width="12" height="10" rx="1"/><rect x="20" y="2" width="8" height="7" rx="1"/></svg>', '#@^{#?}', 'insert'], ['<span class="aic-key-abs">|<i></i>|</span>', '\\left|#0\\right|', 'insert'], ['≤', '\\le'], ['7', '7'], ['8', '8'], ['9', '9'], ['×', '\\times'],
      ['<span class="aic-key-log">log<sub></sub><i></i></span>', '\\log_{#?}\\left(#0\\right)', 'insert'], ['<span class="aic-key-ln">ln<i></i></span>', '\\ln\\left(#0\\right)', 'insert'], ['>', '>'], ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-'],
      ['<span class="aic-key-factorial"><i></i>!</span>', '#@!', 'insert'], ['%', '\\%'], ['≥', '\\ge'], ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'],
      ['x', 'x'], ['y', 'y'], ['=', '='], ['0', '0'], ['.', '.'], ['←', 'moveToPreviousChar', 'command'], ['→', 'moveToNextChar', 'command']
    ] },
    { label: '三角', keys: [
      ['sin', '\\sin\\left(#0\\right)', 'insert'], ['cos', '\\cos\\left(#0\\right)', 'insert'], ['tan', '\\tan\\left(#0\\right)', 'insert'], ['(', '('], [')', ')'], ['⌫', 'deleteBackward', 'command'], ['÷', '\\div'],
      ['csc', '\\csc\\left(#0\\right)', 'insert'], ['sec', '\\sec\\left(#0\\right)', 'insert'], ['cot', '\\cot\\left(#0\\right)', 'insert'], ['7', '7'], ['8', '8'], ['9', '9'], ['×', '\\times'],
      ['arcsin', '\\arcsin\\left(#0\\right)', 'insert'], ['arccos', '\\arccos\\left(#0\\right)', 'insert'], ['arctan', '\\arctan\\left(#0\\right)', 'insert'], ['4', '4'], ['5', '5'], ['6', '6'], ['−', '-'],
      ['<span class="aic-key-square"><i></i><sup>2</sup></span>', '#@^2', 'insert'], ['<span class="aic-key-degree"><i></i>°</span>', '#@^{\\circ}', 'insert'], ['π', '\\pi'], ['1', '1'], ['2', '2'], ['3', '3'], ['+', '+'],
      ['x', 'x'], ['y', 'y'], ['=', '='], ['0', '0'], ['.', '.'], ['←', 'moveToPreviousChar', 'command'], ['→', 'moveToNextChar', 'command']
    ] }
  ]

  function press(key) {
    if (!activeField || activeField.disabled || activeField.readOnly) return
    activeField.focus()
    if (key[2] === 'command') activeField.executeCommand(key[1])
    else activeField.insert(key[1], { focus: true })
  }

  function renderPanel() {
    panel.className = 'aic-math-keyboard' + (tabIndex === 1 ? ' is-trig' : '')
    panel.innerHTML = ''
    var header = document.createElement('div')
    header.className = 'aic-math-keyboard-drag'
    header.setAttribute('aria-label', '按住拖拽键盘')
    header.innerHTML = '<svg class="aic-math-keyboard-drag-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M8 8V3.8a1.25 1.25 0 0 1 2.5 0V8"/><path d="M10.5 8V5.4a1.25 1.25 0 0 1 2.5 0V9"/><path d="M13 9V7a1.25 1.25 0 0 1 2.5 0v4.4c0 3-2 5.1-4.8 5.1H9.3c-1.5 0-2.8-.7-3.7-1.9L3.8 12a1.2 1.2 0 0 1 1.9-1.5L8 13V8Z"/></svg><span>按住拖拽</span>'
    panel.appendChild(header)
    var clear = document.createElement('button')
    clear.type = 'button'
    clear.className = 'aic-math-keyboard-clear'
    clear.textContent = '清空'
    clear.onclick = clearActiveField
    panel.appendChild(clear)
    var close = document.createElement('button')
    close.type = 'button'
    close.className = 'aic-math-keyboard-close'
    close.setAttribute('aria-label', '关闭公式键盘')
    close.innerHTML = '&times;'
    close.onclick = hideKeyboard
    panel.appendChild(close)
    var tabBar = document.createElement('div')
    tabBar.className = 'aic-math-keyboard-tabs'
    tabs.forEach(function (tab, index) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'aic-math-keyboard-tab' + (tabIndex === index ? ' is-active' : '')
      button.textContent = tab.label
      button.onclick = function () { tabIndex = index; renderPanel() }
      tabBar.appendChild(button)
    })
    var grid = document.createElement('div')
    grid.className = 'aic-math-keyboard-grid'
    tabs[tabIndex].keys.forEach(function (key) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'aic-math-key' + (key[2] ? ' is-' + key[2] : '')
      button.innerHTML = key[0]
      button.setAttribute('aria-label', button.textContent || '公式模板')
      button.onclick = function () { press(key) }
      grid.appendChild(button)
    })
    panel.appendChild(tabBar)
    panel.appendChild(grid)
    var resize = document.createElement('div')
    resize.className = 'aic-math-keyboard-resize'
    resize.setAttribute('aria-label', '拖拽缩放键盘')
    panel.appendChild(resize)
    bindPanelPointer(header, resize)
  }

  function clampPanel() {
    if (fab) fab.style.setProperty('--aic-math-page-scale', pageScale)
    if (!panel) return
    var effectiveScale = state.scale * pageScale
    var width = BASE_WIDTH * effectiveScale
    var height = BASE_HEIGHT * effectiveScale
    state.left = Math.max(8, Math.min(state.left, window.innerWidth - width - 8))
    state.top = Math.max(8, Math.min(state.top, window.innerHeight - height - 8))
    panel.style.left = state.left + 'px'
    panel.style.top = state.top + 'px'
    panel.style.setProperty('--aic-math-keyboard-scale', effectiveScale)
  }

  function ensureScaleController() {
    if (scaleController || !ns.createViewportScaleController) return
    scaleController = ns.createViewportScaleController({ minScale: 0.1, maxScale: 10 })
    scaleController.subscribe(function (scale) {
      pageScale = scale
      clampPanel()
    })
    scaleController.start()
  }

  function bindPanelPointer(header, resize) {
    function begin(event, mode) {
      event.preventDefault()
      var startX = event.clientX
      var startY = event.clientY
      var startLeft = state.left
      var startTop = state.top
      var startScale = state.scale
      function move(next) {
        if (mode === 'drag') {
          state.left = startLeft + next.clientX - startX
          state.top = startTop + next.clientY - startY
        } else {
          var delta = Math.max(next.clientX - startX, next.clientY - startY)
          var maxScale = Math.min(1.8, (window.innerWidth - 16) / (BASE_WIDTH * pageScale), (window.innerHeight - 16) / (BASE_HEIGHT * pageScale))
          state.scale = Math.max(0.55, Math.min(maxScale, startScale + delta / (BASE_WIDTH * 0.55)))
        }
        clampPanel()
      }
      function end() {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', end)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', end)
    }
    header.onpointerdown = function (event) { begin(event, 'drag') }
    resize.onpointerdown = function (event) { begin(event, 'resize') }
  }

  function ensurePanel() {
    if (panel) return panel
    panel = document.createElement('section')
    panel.hidden = true
    panel.setAttribute('aria-label', '公式键盘')
    document.body.appendChild(panel)
    ensureScaleController()
    state.top = window.innerHeight - BASE_HEIGHT * state.scale - 16
    renderPanel()
    clampPanel()
    window.addEventListener('resize', clampPanel)
    return panel
  }

  function showKeyboard(field) {
    if (field) activeField = field
    if (!hasMathLive || !activeField || activeField.disabled || activeField.readOnly) return
    ensureFab().hidden = false
    var keyboard = ensurePanel()
    keyboard.hidden = false
    clampPanel()
  }

  function hideKeyboard() {
    if (panel) panel.hidden = true
  }

  function clearActiveField() {
    if (!activeField || activeField.disabled || activeField.readOnly) return
    if (typeof activeField.setValue === 'function') activeField.setValue('')
    else activeField.value = ''
    activeField.focus()
  }

  function ensureFab() {
    if (fab) return fab
    fab = document.createElement('button')
    fab.type = 'button'
    fab.className = 'aic-math-fab'
    fab.hidden = true
    fab.setAttribute('aria-label', '打开公式键盘')
    fab.textContent = '⌨'
    fab.onclick = function () {
      if (panel && !panel.hidden) hideKeyboard()
      else showKeyboard(activeField)
    }
    document.body.appendChild(fab)
    ensureScaleController()
    clampPanel()
    return fab
  }

  ns.createLatexMathfield = function (options) {
    options = options || {}
    var field = document.createElement(hasMathLive ? 'math-field' : 'input')
    field.className = 'lf-fill-input aic-math-field'
    field.id = options.id || ''
    field.setAttribute('aria-label', options.ariaLabel || '公式填空')
    if (hasMathLive) field.setAttribute('smart-fence', '')
    else field.type = 'text'
    if (options.width) field.style.width = typeof options.width === 'number' ? options.width + 'px' : String(options.width)
    if (options.value != null) field.value = String(options.value)
    field.readOnly = !options.enabled
    field.disabled = !options.enabled
    field.addEventListener('focus', function () { showKeyboard(field) })
    field.addEventListener('click', function () { showKeyboard(field) })
    window.requestAnimationFrame(function () {
      if (!field.isConnected) return
      if (hasMathLive) field.menuItems = []
    })
    return field
  }

  ns.getLatexValue = function (field) {
    return String(field && field.getValue ? field.getValue('latex') : field && field.value || '').trim()
  }

  ns.syncMathKeyboard = function () {
    if (!hasMathLive) {
      activeField = null
      if (fab) fab.hidden = true
      hideKeyboard()
      return
    }
    var field = document.querySelector('.aic-math-field:not([disabled])')
    activeField = field || null
    ensureFab().hidden = !field
    if (field) showKeyboard(field)
    else hideKeyboard()
  }
  ns.resetMathKeyboard = function () {
    activeField = null
    if (fab) fab.hidden = true
    hideKeyboard()
  }
})()

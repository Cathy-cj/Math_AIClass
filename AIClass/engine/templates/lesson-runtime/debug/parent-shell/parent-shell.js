// AIClass parent-shell — 通用协议调试壳（无硬编码课纲树）
;(function () {
  var RESET_ACTION = 'course:reset'
  var COLLAPSE_KEY = 'parent-shell-collapse-v2'
  var SIDEBAR_WIDTH_KEY = 'parent-shell-sidebar-width'
  var SIDEBAR_COLLAPSE_KEY = 'parent-shell-sidebar-hidden'
  var SIDEBAR_MIN = 240
  var SIDEBAR_MAX = 520
  var LOG_HEIGHT_KEY = 'parent-shell-log-height'
  var LOG_MIN = 80
  var LOG_MAX = 480

  var params = new URLSearchParams(location.search)
  var iframeSrc = params.get('src') || '../../index.html'
  var editMap = window.AICLASS_DEBUG_EDIT_MAP || null

  var frame = document.getElementById('course')
  var logEl = document.getElementById('log')
  var actionList = document.getElementById('actionList')
  var sidebarHead = document.getElementById('sidebarHead')
  var sidebarEl = document.getElementById('sidebar')
  var resizerEl = document.getElementById('sidebarResizer')
  var logWrapEl = document.getElementById('logWrap')
  var logResizerEl = document.getElementById('logResizer')
  var btnToggleLog = document.getElementById('btnToggleLog')
  var statEl = document.getElementById('stat')
  var stepStatEl = document.getElementById('stepStat')
  var btnNext = document.getElementById('btnNext')
  var btnSidebar = document.getElementById('btnSidebar')
  var btnConnectFolder = document.getElementById('btnConnectFolder')

  var catalog = []
  var lessonTitle = ''
  var iframeReady = false
  var currentModuleId = null
  var currentSession = null
  var collapseState = {}
  var doneKeys = {}
  var currentKey = null
  var pendingKey = null
  var courseRootHandle = null
  var saveMode = 'source'
  var portableBase = ''
  var editByAction = {}
  if (editMap && Array.isArray(editMap.actions)) {
    editMap.actions.forEach(function (entry) { editByAction[entry.action] = entry })
  }

  function editSupported() {
    return !!(editMap && window.showDirectoryPicker && window.indexedDB)
  }

  function openHandleDb() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open('aiclass-debug-editor', 1)
      request.onupgradeneeded = function () {
        request.result.createObjectStore('handles')
      }
      request.onsuccess = function () { resolve(request.result) }
      request.onerror = function () { reject(request.error) }
    })
  }

  function readStoredHandle() {
    return openHandleDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var request = db.transaction('handles', 'readonly').objectStore('handles').get(editMap.courseId)
        request.onsuccess = function () { resolve(request.result || null) }
        request.onerror = function () { reject(request.error) }
      })
    })
  }

  function storeHandle(handle) {
    return openHandleDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var request = db.transaction('handles', 'readwrite').objectStore('handles').put(handle, editMap.courseId)
        request.onsuccess = function () { resolve() }
        request.onerror = function () { reject(request.error) }
      })
    })
  }

  function setCourseRoot(handle) {
    return handle.getDirectoryHandle('course').then(function (courseDir) {
      return courseDir.getFileHandle('course.json')
    }).then(function () {
      saveMode = 'portable'
      portableBase = 'course/'
    }).catch(function () {
      saveMode = 'source'
    }).then(function () {
      courseRootHandle = handle
      btnConnectFolder.textContent = saveMode === 'portable'
        ? '已连接发布课件' : '已连接课程文件夹'
      renderList()
    })
  }

  function requestHandlePermission(handle, writable) {
    var options = writable ? { mode: 'readwrite' } : {}
    return handle.queryPermission(options).then(function (state) {
      return state === 'granted' ? state : handle.requestPermission(options)
    })
  }

  function connectCourseFolder() {
    window.showDirectoryPicker({ mode: 'readwrite' })
      .then(function (handle) {
        return requestHandlePermission(handle, true).then(function (state) {
          if (state !== 'granted') throw new Error('未授予文件夹读写权限')
          return storeHandle(handle).then(function () { return handle })
        })
      })
      .then(function (handle) {
        return setCourseRoot(handle)
      })
      .then(function () {
        setStat(saveMode === 'portable'
          ? '已连接发布课件，修改只保存到此课件包'
          : '已连接课程文件夹，可点击口播稿编辑', 'ok')
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return
        setStat('连接课程文件夹失败：' + (error.message || error), 'err')
      })
  }

  function fileHandle(relativePath) {
    var parts = relativePath.split('/').filter(Boolean)
    var name = parts.pop()
    return parts.reduce(function (parent, part) {
      return parent.then(function (dir) { return dir.getDirectoryHandle(part) })
    }, Promise.resolve(courseRootHandle)).then(function (dir) {
      return dir.getFileHandle(name)
    })
  }

  function readText(relativePath) {
    return fileHandle(relativePath)
      .then(function (handle) { return handle.getFile() })
      .then(function (file) { return file.text() })
  }

  function writeText(relativePath, text) {
    return fileHandle(relativePath).then(function (handle) {
      return handle.createWritable().then(function (writable) {
        return writable.write(text).then(function () { return writable.close() })
      })
    })
  }

  function jsonText(value) {
    return JSON.stringify(value, null, 2) + '\n'
  }

  function scriptJson(value) {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
  }

  function updateCatalogText(text, action, description) {
    var catalog = JSON.parse(text)
    var item = catalog.find(function (entry) { return entry.name === action })
    if (!item) throw new Error('未在动作目录中找到该步骤')
    item.description = description
    return jsonText(catalog)
  }

  function updateModuleText(text, action, description) {
    var prefix = 'window.__lessonRegisterModule('
    var start = text.indexOf(prefix)
    var end = text.lastIndexOf(')\n})()')
    if (start < 0 || end < start) throw new Error('课件模块格式无法识别')
    var jsonStart = start + prefix.length
    var module = JSON.parse(text.slice(jsonStart, end))
    var found = false
    ;(module.containers || []).forEach(function (container) {
      ;(container.steps || []).forEach(function (step) {
        if (step.action === action) {
          step.description = description
          found = true
        }
      })
    })
    ;(module.sideEffects || []).forEach(function (step) {
      if (step.action === action) {
        step.description = description
        found = true
      }
    })
    if (!found) throw new Error('未在课件模块中找到该步骤')
    return text.slice(0, jsonStart) + scriptJson(module) + text.slice(end)
  }

  function updateIndexText(text, action, description) {
    var match = /(<script type="application\/json" id="lesson-action-catalog">)([\s\S]*?)(<\/script>)/.exec(text)
    if (!match) throw new Error('课件首页动作目录无法识别')
    var found = false
    return text.slice(0, match.index + match[1].length) +
      scriptJson(JSON.parse(match[2]).map(function (item) {
        if (item.name !== action) return item
        found = true
        return Object.assign({}, item, { description: description })
      })) +
      (function () {
        if (!found) throw new Error('未在课件首页动作目录中找到该步骤')
        return text.slice(match.index + match[0].length - match[3].length)
      })()
  }

  function updateOutputText(text, action, description) {
    var output = JSON.parse(text)
    var found = false
    var problems = output.problems || [output]
    problems.forEach(function (problem) {
      ;(problem.steps || []).forEach(function (step) {
        if (step.action === action) {
          step.description = description
          found = true
        }
      })
    })
    ;(output.catalog || []).forEach(function (entry) {
      if (entry.name === action) entry.description = description
    })
    if (!found) throw new Error('未在 output.json 中找到该步骤')
    return jsonText(output)
  }

  function portablePath(sourcePath) {
    var marker = 'dist/' + (editMap.grade != null ? editMap.grade + '/' : '') + editMap.courseId + '/'
    var index = sourcePath.indexOf(marker)
    if (index < 0) throw new Error('发布课件路径无法识别')
    return sourcePath.slice(index + marker.length)
  }

  function portableFile(path) {
    return portableBase + path
  }

  function saveDescription(item, description) {
    var mapping = editByAction[item.name]
    if (!courseRootHandle || !mapping || !mapping.editable) return Promise.reject(new Error('该口播稿不可编辑'))
    var clean = description.trim()
    var writes = saveMode === 'portable' ? [
      ['plan.json', function () { return readText(portableFile(mapping.portablePlan)).then(function (text) {
        var plan = JSON.parse(text)
        var step = (plan.steps || []).find(function (entry) { return entry.action === item.name })
        if (!step) throw new Error('未在 plan.json 中找到该步骤')
        step.agent = Object.assign({}, step.agent || {}, { description: clean })
        return writeText(portableFile(mapping.portablePlan), jsonText(plan))
      }) }],
      ['output.json', function () { return readText(portableFile(mapping.portableOutput)).then(function (text) {
        return writeText(portableFile(mapping.portableOutput), updateOutputText(text, item.name, clean))
      }) }],
      ['动作目录', function () { return readText(portableFile('runtime/action-catalog.json')).then(function (text) {
        return writeText(portableFile('runtime/action-catalog.json'), updateCatalogText(text, item.name, clean))
      }) }],
      ['课件模块', function () {
        var file = portableFile(mapping.portableModule || portablePath(mapping.distModule))
        return readText(file).then(function (text) {
          return writeText(file, updateModuleText(text, item.name, clean))
        })
      }],
      ['课件首页', function () { return readText('index.html').then(function (text) {
        return writeText('index.html', updateIndexText(text, item.name, clean))
      }) }]
    ] : [
      ['plan.json', function () { return readText(mapping.planFile).then(function (text) {
        var plan = JSON.parse(text)
        var step = (plan.steps || []).find(function (entry) { return entry.action === item.name })
        if (!step) throw new Error('未在 plan.json 中找到该步骤')
        step.agent = Object.assign({}, step.agent || {}, { description: clean })
        return writeText(mapping.planFile, jsonText(plan))
      }) }],
      ['生成动作目录', function () { return readText(editMap.generatedCatalog).then(function (text) {
        return writeText(editMap.generatedCatalog, updateCatalogText(text, item.name, clean))
      }) }],
      ['运行时动作目录', function () { return readText(editMap.distCatalog).then(function (text) {
        return writeText(editMap.distCatalog, updateCatalogText(text, item.name, clean))
      }) }],
      ['生成模块', function () { return readText(mapping.generatedModule).then(function (text) {
        return writeText(mapping.generatedModule, updateModuleText(text, item.name, clean))
      }) }],
      ['运行时模块', function () { return readText(mapping.distModule).then(function (text) {
        return writeText(mapping.distModule, updateModuleText(text, item.name, clean))
      }) }],
      ['运行时首页', function () { return readText(editMap.distIndex).then(function (text) {
        return writeText(editMap.distIndex, updateIndexText(text, item.name, clean))
      }) }]
    ]
    var completed = []
    return writes.reduce(function (chain, task) {
      return chain.then(function () {
        return task[1]().then(function () { completed.push(task[0]) })
      })
    }, Promise.resolve()).then(function () {
      item.description = clean
      setStat('口播稿已保存并同步，正在刷新课件…', 'ok')
      renderList()
      document.getElementById('btnReload').click()
    }).catch(function (error) {
      var remaining = writes.slice(completed.length).map(function (task) { return task[0] })
      error.message = (error.message || error) +
        (completed.length ? '；已同步：' + completed.join('、') : '；尚未写入任何文件') +
        (remaining.length ? '；未同步：' + remaining.join('、') : '')
      throw error
    })
  }

  try {
    collapseState = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}')
  } catch (e) {
    collapseState = {}
  }

  function itemKey(item) {
    if (!item) return ''
    return item.catalogKey || item.name || ''
  }

  function findByActionName(actionName) {
    if (!actionName) return null
    return catalog.find(function (c) {
      return c.name === actionName || c.dispatchName === actionName
    }) || null
  }

  function playable() {
    return catalog.filter(function (item) {
      return item.zone === 'main' || item.zone === 'topic' || item.zone === 'hub'
    })
  }

  function updateStepStat() {
    var list = playable()
    if (!list.length) {
      stepStatEl.textContent = '—'
      btnNext.disabled = true
      return
    }
    var idx = -1
    if (currentKey) {
      idx = list.findIndex(function (item) { return itemKey(item) === currentKey })
    }
    var i = idx >= 0 ? idx + 1 : 0
    var label = idx >= 0
      ? (list[idx].label || list[idx].name)
      : '未开始'
    stepStatEl.textContent = '第 ' + i + ' / ' + list.length + ' · ' + label
    btnNext.disabled = idx >= list.length - 1 && idx >= 0
  }

  function markProgress(actionName) {
    var item = findByActionName(actionName)
    var key = item ? itemKey(item) : (pendingKey || actionName)
    if (!key) return
    doneKeys[key] = true
    currentKey = key
    pendingKey = null
    if (item && item.moduleTitle) {
      var zoneKey = 'zone:main:' + (item.moduleTitle || item.moduleId || 'main')
      if (item.zone === 'topic') zoneKey = 'zone:topic:' + (item.moduleTitle || 'topic')
      if (item.zone === 'hub') zoneKey = 'zone:hub'
      setCollapsed(zoneKey, false)
    }
    renderList()
    updateStepStat()
    scrollCurrentIntoView()
  }

  function clearProgress() {
    doneKeys = {}
    currentKey = null
    pendingKey = null
    updateStepStat()
  }

  function scrollCurrentIntoView() {
    var el = actionList.querySelector('.action-btn.is-current')
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }

  function goNext() {
    var list = playable()
    if (!list.length) return
    var idx = currentKey
      ? list.findIndex(function (item) { return itemKey(item) === currentKey })
      : -1
    var next = list[idx + 1]
    if (!next) {
      setStat('已到最后一步', 'ok')
      updateStepStat()
      return
    }
    send(next)
  }

  function applySidebarWidth(px) {
    var w = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Math.round(px)))
    document.documentElement.style.setProperty('--sidebar-width', w + 'px')
    try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w)) } catch (e) { /* ignore */ }
    return w
  }

  function applyLogHeight(px) {
    var maxByViewport = Math.max(LOG_MIN, Math.floor(window.innerHeight * 0.55))
    var h = Math.max(LOG_MIN, Math.min(Math.min(LOG_MAX, maxByViewport), Math.round(px)))
    document.documentElement.style.setProperty('--log-height', h + 'px')
    try { localStorage.setItem(LOG_HEIGHT_KEY, String(h)) } catch (e) { /* ignore */ }
    return h
  }

  function setLogCollapsed(collapsed) {
    logWrapEl.classList.toggle('collapsed', collapsed)
    document.body.classList.toggle('log-collapsed', collapsed)
    if (logResizerEl) logResizerEl.hidden = collapsed
    if (btnToggleLog) btnToggleLog.textContent = collapsed ? '展开' : '收起'
  }

  function initSidebarChrome() {
    var savedW = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) || '', 10)
    if (savedW) applySidebarWidth(savedW)

    var hidden = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'
    document.body.classList.toggle('sidebar-collapsed', hidden)

    btnSidebar.onclick = function () {
      var next = !document.body.classList.contains('sidebar-collapsed')
      document.body.classList.toggle('sidebar-collapsed', next)
      try { localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0') } catch (e) { /* ignore */ }
    }

    var dragging = false
    resizerEl.addEventListener('mousedown', function (e) {
      if (document.body.classList.contains('sidebar-collapsed')) return
      dragging = true
      document.body.classList.add('is-resizing-sidebar')
      e.preventDefault()
    })
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return
      var left = sidebarEl.getBoundingClientRect().left
      applySidebarWidth(e.clientX - left)
    })
    window.addEventListener('mouseup', function () {
      if (!dragging) return
      dragging = false
      document.body.classList.remove('is-resizing-sidebar')
    })
  }

  function initLogChrome() {
    var savedH = parseInt(localStorage.getItem(LOG_HEIGHT_KEY) || '', 10)
    if (savedH) applyLogHeight(savedH)
    setLogCollapsed(logWrapEl.classList.contains('collapsed'))

    var dragging = false
    var startY = 0
    var startH = 0
    logResizerEl.addEventListener('mousedown', function (e) {
      if (logWrapEl.classList.contains('collapsed')) return
      dragging = true
      startY = e.clientY
      startH = logEl.getBoundingClientRect().height
      document.body.classList.add('is-resizing-log')
      e.preventDefault()
    })
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return
      // 向上拖 = 增高
      applyLogHeight(startH + (startY - e.clientY))
    })
    window.addEventListener('mouseup', function () {
      if (!dragging) return
      dragging = false
      document.body.classList.remove('is-resizing-log')
    })
  }

  frame.src = iframeSrc

  function isCollapsed(key, defaultCollapsed) {
    if (Object.prototype.hasOwnProperty.call(collapseState, key)) {
      return !!collapseState[key]
    }
    return !!defaultCollapsed
  }

  function setCollapsed(key, collapsed) {
    collapseState[key] = collapsed
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapseState))
    } catch (e) { /* ignore */ }
  }

  function applyCollapseUi(wrap, collapsed) {
    wrap.classList.toggle('is-collapsed', collapsed)
    var chev = wrap.querySelector('.collapsible-head .collapse-chevron')
    if (chev) chev.textContent = collapsed ? '▸' : '▾'
  }

  function makeCollapsibleWrap(key, labelEl, buildBody, options) {
    options = options || {}
    var wrap = document.createElement('div')
    wrap.className = options.subsection
      ? 'zone-subsection collapsible-block'
      : 'zone-block collapsible-block'
    var collapsed = options.forceExpand ? false : isCollapsed(key, options.defaultCollapsed)
    if (collapsed) wrap.classList.add('is-collapsed')

    var head = document.createElement('button')
    head.type = 'button'
    head.className = 'collapsible-head'
    var chev = document.createElement('span')
    chev.className = 'collapse-chevron'
    chev.textContent = collapsed ? '▸' : '▾'
    head.appendChild(chev)
    head.appendChild(labelEl)
    if (options.count != null) {
      var cnt = document.createElement('span')
      cnt.className = 'collapse-count'
      cnt.textContent = String(options.count)
      head.appendChild(cnt)
    }

    var body = document.createElement('div')
    body.className = 'zone-body'
    buildBody(body)

    head.addEventListener('click', function () {
      var next = !wrap.classList.contains('is-collapsed')
      applyCollapseUi(wrap, next)
      setCollapsed(key, next)
    })

    wrap.appendChild(head)
    wrap.appendChild(body)
    return wrap
  }

  function makeZoneTitle(text, cls) {
    var h = document.createElement('div')
    h.className = 'zone-title ' + cls
    h.textContent = text
    return h
  }

  function helpEntryMap(data) {
    var map = {}
    if (!data) return map
    if (Array.isArray(data)) {
      data.forEach(function (a) {
        if (a && a.name) map[a.name] = a
      })
      return map
    }
    if (data.actions) {
      data.actions.forEach(function (a) {
        if (a && a.name) map[a.name] = a
      })
    }
    return map
  }

  function tagForAction(action) {
    if (action.handwritingRuntime) return 'hw'
    if (action.conceptSheet) return 'concept-close'
    if (action.sideEffect) return 'fx'
    if (action.conceptInterrupt) return 'concept'
    return 'main'
  }

  function buildCatalogItem(options) {
    return {
      name: options.name,
      catalogKey: options.catalogKey || options.name,
      dispatchName: options.dispatchName || options.name,
      dispatchParams: options.dispatchParams || {},
      zone: options.zone || 'main',
      tag: options.tag || 'main',
      moduleTitle: options.moduleTitle || null,
      moduleId: options.moduleId || null,
      sideEffect: !!options.sideEffect,
      stepId: options.stepId || '',
      description: options.description || '',
      label: options.label || null,
      params: options.params || []
    }
  }

  function buildCatalogFromHelp(helpData) {
    if (!helpData) return []
    if (Array.isArray(helpData)) {
      return flattenCatalogLegacy(helpData)
    }

    var helpMap = helpEntryMap(helpData)
    var items = []
    var used = {}
    var moduleTitleById = {}

    function rememberModule(mod) {
      if (mod && mod.moduleId) {
        moduleTitleById[mod.moduleId] = mod.title || mod.moduleId
      }
    }

    ;(helpData.modules || []).forEach(rememberModule)
    if (helpData.zones) {
      ;(helpData.zones.topic || []).forEach(rememberModule)
      ;(helpData.zones.main || []).forEach(rememberModule)
    }

    function add(item) {
      if (!item || !item.name) return
      var key = item.catalogKey || item.name
      if (used[key]) return
      used[key] = true
      if (item.dispatchName) used[item.dispatchName] = true
      items.push(item)
    }

    function addStep(step, zone, moduleTitle, moduleId, index) {
      if (!step || !step.action) return
      var help = helpMap[step.action] || {}
      add(buildCatalogItem({
        name: step.action,
        zone: zone,
        tag: tagForAction(Object.assign({}, step, help)),
        moduleTitle: moduleTitle,
        moduleId: moduleId || step.moduleId || help.moduleId || null,
        sideEffect: !!(step.sideEffect || help.sideEffect),
        stepId: step.stepId || String(index + 1),
        description: step.description || help.description || '',
        params: (help.params || []).slice()
      }))
    }

    if (helpData.enterAction) {
      var enterHelp = helpMap[helpData.enterAction] || {}
      add(buildCatalogItem({
        name: helpData.enterAction,
        zone: 'hub',
        tag: 'hub',
        stepId: '进入',
        description: enterHelp.description || '显示选课屏'
      }))
    }

    if (helpData.zones) {
      ;(helpData.zones.topic || []).forEach(function (mod) {
        ;(mod.steps || []).forEach(function (step, index) {
          addStep(step, 'topic', mod.title, mod.moduleId, index)
        })
      })
      ;(helpData.zones.main || []).forEach(function (mod) {
        ;(mod.steps || []).forEach(function (step, index) {
          addStep(step, 'main', mod.title, mod.moduleId, index)
        })
      })
    } else if (helpData.modules && helpData.modules.length) {
      helpData.modules.forEach(function (mod) {
        ;(mod.steps || []).forEach(function (step, index) {
          addStep(step, 'main', mod.title, mod.moduleId, index)
        })
      })
    }

    ;(helpData.actions || []).forEach(function (action, index) {
      if (!action || !action.name || used[action.name]) return
      var zone = 'flat'
      if (action.moduleId) zone = 'main'
      else if (action.handwritingRuntime || action.conceptSheet) zone = 'sys'
      add(buildCatalogItem({
        name: action.name,
        zone: zone,
        tag: tagForAction(action),
        moduleTitle: moduleTitleById[action.moduleId] || null,
        moduleId: action.moduleId || null,
        sideEffect: !!action.sideEffect,
        stepId: action.stepId || String(index + 1),
        description: action.description || '',
        params: (action.params || []).slice()
      }))
    })

    add(buildCatalogItem({
      name: '清空课件',
      dispatchName: RESET_ACTION,
      zone: 'sys',
      tag: 'sys',
      description: '重置课件到初始状态'
    }))

    return items
  }

  function flattenCatalogLegacy(data) {
    var items = []
    data.forEach(function (a) {
      if (!a || !a.name) return
      items.push(buildCatalogItem({
        name: a.name,
        zone: 'flat',
        tag: 'action',
        stepId: (a.params && a.params.length) ? a.params.join(',') : '',
        description: a.description || ''
      }))
    })
    items.push(buildCatalogItem({
      name: '清空课件',
      dispatchName: RESET_ACTION,
      zone: 'sys',
      tag: 'sys',
      description: '重置课件'
    }))
    return items
  }

  function flattenCatalog(data) {
    if (!data) return []
    if (Array.isArray(data)) return flattenCatalogLegacy(data)
    return buildCatalogFromHelp(data)
  }

  function appendLog(msg, kind) {
    kind = kind || 'info'
    var line = document.createElement('div')
    line.className = 'log-line ' + kind
    var text = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)
    line.innerHTML = '<span class="ts">[' + new Date().toLocaleTimeString() + ']</span> ' +
      escapeHtml(text)
    logEl.appendChild(line)
    logEl.scrollTop = logEl.scrollHeight
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function setStat(text, kind) {
    statEl.textContent = text
    statEl.className = 'stat' + (kind ? ' ' + kind : '')
  }

  function dispatchOutbound(action, params) {
    params = params || {}
    if (!iframeReady) {
      appendLog('iframe 未 ready: ' + action, 'err')
      return false
    }
    var payload = { action: action, params: params }
    appendLog(payload, 'send')
    try {
      frame.contentWindow.postMessage(payload, '*')
      return true
    } catch (err) {
      appendLog('postMessage 失败: ' + err.message, 'err')
      return false
    }
  }

  function send(nameOrItem) {
    var item = (nameOrItem && typeof nameOrItem === 'object')
      ? nameOrItem
      : catalog.find(function (c) { return c.name === nameOrItem })
    var name = item
      ? (item.dispatchName || item.name)
      : String(nameOrItem || '').trim()
    if (!name) return
    if (!item) item = catalog.find(function (c) { return c.name === name || c.dispatchName === name })

    if (name === '清空课件') name = RESET_ACTION

    var params = (item && item.dispatchParams) ? item.dispatchParams : {}
    var needSwitch = item && item.moduleId && currentModuleId !== item.moduleId
    if (needSwitch) {
      if (!dispatchOutbound('_switchModule', { moduleId: item.moduleId })) return
      currentModuleId = item.moduleId
    }
    if (!dispatchOutbound(name, params)) return

    if (name === RESET_ACTION) {
      clearProgress()
      renderList()
      return
    }

    if (item && (item.zone === 'main' || item.zone === 'topic' || item.zone === 'hub')) {
      pendingKey = itemKey(item)
    }
  }

  function pullHelp() {
    dispatchOutbound('help', {})
  }

  function makeActionBtn(item) {
    var btn = document.createElement('div')
    btn.setAttribute('role', 'button')
    btn.tabIndex = 0
    btn.className = 'action-btn'
    var key = itemKey(item)
    if (doneKeys[key]) btn.classList.add('is-done')
    if (currentKey && key === currentKey) btn.classList.add('is-current')

    var tag = document.createElement('span')
    tag.className = 'tag ' + item.tag
    tag.textContent = item.sideEffect
      ? (item.stepId || item.tag)
      : (item.stepId || item.tag)

    var body = document.createElement('div')
    body.className = 'body'
    var nameEl = document.createElement('div')
    nameEl.className = 'name'
    nameEl.textContent = item.label || item.name
    body.appendChild(nameEl)
    if (item.description || (courseRootHandle && editByAction[item.name] && editByAction[item.name].editable)) {
      var descEl = document.createElement('div')
      descEl.className = 'desc'
      var editable = !!(courseRootHandle && editByAction[item.name] && editByAction[item.name].editable)
      if (editable) {
        descEl.classList.add('is-editable')
        descEl.title = '点击编辑口播稿'
      }
      descEl.textContent = item.description || '（暂无口播稿，点击补充）'
      if (editable) {
        descEl.addEventListener('click', function (event) {
          event.stopPropagation()
          if (descEl.classList.contains('is-editing')) return
          descEl.classList.add('is-editing')
          descEl.textContent = ''
          var input = document.createElement('textarea')
          input.className = 'desc-editor'
          input.value = item.description || ''
          input.setAttribute('aria-label', '编辑口播稿')
          var hint = document.createElement('div')
          hint.className = 'desc-editor-hint'
          hint.textContent = '口播稿建议使用纯中文，不写数字、字母或公式符号。'
          var actions = document.createElement('div')
          actions.className = 'desc-editor-actions'
          var save = document.createElement('button')
          save.type = 'button'
          save.className = 'btn btn-primary'
          save.textContent = '保存'
          var cancel = document.createElement('button')
          cancel.type = 'button'
          cancel.className = 'btn'
          cancel.textContent = '取消'
          actions.appendChild(save)
          actions.appendChild(cancel)
          descEl.appendChild(input)
          descEl.appendChild(hint)
          descEl.appendChild(actions)
          input.focus()
          input.addEventListener('input', function () {
            var hasNotation = /[A-Za-z0-9+\-*/=<>[\]{}^_\\]/.test(input.value)
            hint.classList.toggle('is-warning', hasNotation)
            hint.textContent = hasNotation
              ? '提示：口播稿建议改为中文读法，不写数字或字母。'
              : '口播稿建议使用纯中文，不写数字、字母或公式符号。'
          })
          cancel.onclick = function (e) {
            e.stopPropagation()
            descEl.classList.remove('is-editing')
            descEl.textContent = item.description || '（暂无口播稿，点击补充）'
          }
          save.onclick = function (e) {
            e.stopPropagation()
            save.disabled = true
            saveDescription(item, input.value).catch(function (error) {
              setStat('口播稿保存失败：' + (error.message || error), 'err')
              save.disabled = false
            })
          }
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') cancel.click()
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save.click()
          })
        })
      }
      body.appendChild(descEl)
    }

    btn.appendChild(tag)
    btn.appendChild(body)
    btn.onclick = function () { send(item) }
    btn.onkeydown = function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        send(item)
      }
    }
    return btn
  }

  function renderGrouped(list) {
    actionList.innerHTML = ''
    var byZone = {
      hub: [],
      topic: {},
      main: {},
      concept: [],
      flat: [],
      sys: []
    }

    list.forEach(function (item) {
      if (item.zone === 'sys') byZone.sys.push(item)
      else if (item.zone === 'hub') byZone.hub.push(item)
      else if (item.zone === 'concept') byZone.concept.push(item)
      else if (item.zone === 'flat') byZone.flat.push(item)
      else if (item.zone === 'topic') {
        var tkey = item.moduleTitle || 'topic'
        if (!byZone.topic[tkey]) byZone.topic[tkey] = []
        byZone.topic[tkey].push(item)
      } else {
        var mkey = item.moduleTitle || item.moduleId || 'main'
        if (!byZone.main[mkey]) byZone.main[mkey] = []
        byZone.main[mkey].push(item)
      }
    })

    function addZone(title, cls, items, zoneKey) {
      if (!items.length) return
      var key = zoneKey || ('zone:' + cls + ':' + title)
      var forceExpand = !!(currentKey && items.some(function (it) {
        return itemKey(it) === currentKey
      }))
      var block = makeCollapsibleWrap(key, makeZoneTitle(title, cls), function (body) {
        items.forEach(function (item) { body.appendChild(makeActionBtn(item)) })
      }, { forceExpand: forceExpand, count: items.length })
      actionList.appendChild(block)
    }

    addZone('枢纽', 'hub', byZone.hub, 'zone:hub')
    Object.keys(byZone.topic).forEach(function (title) {
      addZone('知识点 · ' + title, 'topic', byZone.topic[title], 'zone:topic:' + title)
    })
    Object.keys(byZone.main).forEach(function (title) {
      addZone('正文 · ' + title, 'main', byZone.main[title], 'zone:main:' + title)
    })
    addZone('概念插播', 'concept', byZone.concept, 'zone:concept')
    addZone('未分组', 'sys', byZone.flat, 'zone:flat')
    addZone('系统', 'sys', byZone.sys, 'zone:sys')
  }

  function renderFlat(list) {
    actionList.innerHTML = ''
    list.forEach(function (item) {
      actionList.appendChild(makeActionBtn(item))
    })
  }

  function renderList() {
    var list = catalog.slice()
    if (!list.length) {
      actionList.innerHTML = '<div class="empty-hint">无 action</div>'
      updateStepStat()
      return
    }

    if (catalog.some(function (c) {
      return c.zone === 'main' || c.zone === 'topic' || c.zone === 'hub'
    })) {
      renderGrouped(list)
    } else {
      renderFlat(list)
    }
    updateStepStat()
  }

  function applyHelp(data) {
    if (data == null) return
    lessonTitle = (data.lesson && data.lesson.title) || ''
    if (data.currentModuleId) currentModuleId = data.currentModuleId
    if (data.session) currentSession = data.session
    catalog = flattenCatalog(data)
    sidebarHead.textContent = lessonTitle ? '课纲 · ' + lessonTitle : '课纲'
    renderList()
  }

  function handleInbound(d) {
    if (d.type === 'ready') {
      iframeReady = true
      appendLog(d, 'info')
      setStat('ready — 拉取 help…')
      setTimeout(pullHelp, 100)
      return
    }

    if (d.type === 'help') {
      if (d.data != null) applyHelp(d.data)
      appendLog(d, 'info')
      setStat('help 已加载 · ' + catalog.length + ' actions')
      updateStepStat()
      return
    }

    if (d.type === 'step_ok' || d.type === 'side_effect_ok') {
      appendLog(d, 'ok')
      setStat(d.type + ' · ' + d.action + ' → ' + (d.nextAction || d.nextStepId || '—'), 'ok')
      if (d.moduleId) currentModuleId = d.moduleId
      else {
        var stepItem = findByActionName(d.action)
        if (stepItem && stepItem.moduleId) currentModuleId = stepItem.moduleId
      }
      if (d.session) currentSession = d.session
      markProgress(d.action)
      return
    }

    if (d.type === 'module_switched') {
      appendLog(d, 'info')
      if (d.moduleId) currentModuleId = d.moduleId
      setStat('已切换模块 · ' + (d.moduleId || '—'))
      return
    }

    if (d.type === 'scheduler_error') {
      appendLog(d, 'err')
      setStat(d.code + ' · 期待步骤：' + (d.expectedAction || '—'), 'err')
      pendingKey = null
      return
    }

    if (d.type === 'quick_qa_opened' || d.type === 'quick_qa_question_shown' ||
        d.type === 'quick_qa_answer_shown' || d.type === 'quick_qa_hidden') {
      // 快问快答回包不带 action 字段，靠 pendingKey 推进进度，
      // 否则“下一步”永远重发同一个快问快答动作而卡死。
      appendLog(d, 'ok')
      setStat(d.type + (d.qaId ? ' · ' + d.qaId : ''), 'ok')
      if (pendingKey) {
        doneKeys[pendingKey] = true
        currentKey = pendingKey
        pendingKey = null
        var qaItem = catalog.find(function (c) { return itemKey(c) === currentKey })
        if (qaItem && qaItem.moduleId) currentModuleId = qaItem.moduleId
        renderList()
        updateStepStat()
        scrollCurrentIntoView()
      }
      return
    }

    if (d.type === 'handwriting_shown') {
      appendLog(d, 'ok')
      setStat('handwriting_shown · logAction=' + (d.logAction || '—'), 'ok')
      return
    }

    if (d.type === 'handwriting_dismissed') {
      appendLog(d, 'ok')
      setStat('handwriting_dismissed · logAction=' + (d.logAction || '—'), 'ok')
      return
    }

    if (d.type === 'course_reset') {
      appendLog(d, 'info')
      currentModuleId = null
      currentSession = null
      clearProgress()
      setStat('course_reset')
      renderList()
      setTimeout(pullHelp, 200)
      return
    }

    if (d.type === 'user_submitted') {
      appendLog(d, 'ok')
      var stat = 'user_submitted · ' + (d.kind || '') + ' · ' + (d.value || '')
      setStat(stat, 'ok')
      return
    }

    appendLog(d, 'info')
    if (d.type) setStat(d.type)
  }

  window.addEventListener('message', function (e) {
    var d = e.data
    if (!d) return
    handleInbound(d)
  })

  initSidebarChrome()
  initLogChrome()
  if (editSupported()) {
    btnConnectFolder.hidden = false
    btnConnectFolder.onclick = connectCourseFolder
    readStoredHandle().then(function (handle) {
      if (!handle) return
      return handle.queryPermission({ mode: 'readwrite' }).then(function (state) {
        if (state === 'granted') {
          return setCourseRoot(handle).then(function () {
            setStat(saveMode === 'portable'
              ? '已恢复发布课件连接，修改只保存到此课件包'
              : '已恢复课程文件夹连接，可点击口播稿编辑', 'ok')
          })
        }
      })
    }).catch(function () {
      // 句柄存储不可用时仍可通过按钮重新连接。
    })
  }
  btnNext.onclick = goNext
  document.getElementById('btnReset').onclick = function () { send('清空课件') }
  document.getElementById('btnHelp').onclick = pullHelp
  document.getElementById('btnReload').onclick = function () {
    iframeReady = false
    catalog = []
    clearProgress()
    actionList.innerHTML = '<div class="empty-hint">重载中…</div>'
    updateStepStat()
    var url = new URL(iframeSrc, location.href)
    url.searchParams.set('_', String(Date.now()))
    frame.src = url.pathname + url.search
  }

  document.getElementById('btnCopyLog').onclick = function () {
    var text = logEl.innerText.trim()
    if (!text) {
      setStat('日志为空，无可复制内容', 'err')
      return
    }
    var btn = this
    function copied() {
      var orig = btn.textContent
      btn.textContent = '已复制'
      setTimeout(function () { btn.textContent = orig }, 1200)
    }
    function fallback() {
      var ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;left:-9999px;top:0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        copied()
      } catch (err) {
        setStat('复制失败', 'err')
      }
      document.body.removeChild(ta)
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(copied).catch(fallback)
    } else {
      fallback()
    }
  }

  document.getElementById('btnClearLog').onclick = function () { logEl.innerHTML = '' }
  btnToggleLog.onclick = function () {
    setLogCollapsed(!logWrapEl.classList.contains('collapsed'))
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' && (e.altKey || e.metaKey)) {
      e.preventDefault()
      goNext()
    }
  })

  var autoAction = params.get('action')
  frame.onload = function () {
    if (!iframeReady) setStat('iframe 已加载，等待 ready…')
    if (autoAction) {
      var tries = 0
      var timer = setInterval(function () {
        tries += 1
        if (iframeReady) {
          clearInterval(timer)
          setTimeout(function () { send(autoAction) }, 300)
        } else if (tries > 40) {
          clearInterval(timer)
        }
      }, 100)
    }
  }

  updateStepStat()
})()

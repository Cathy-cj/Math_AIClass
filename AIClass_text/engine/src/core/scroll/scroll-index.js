// 运行时滚动索引 + scrollTo
;(function () {
  var counter = 0
  var entries = []

  function parseIndex(value) {
    if (value === 'latest') {
      for (var i = entries.length - 1; i >= 0; i--) {
        if (entries[i].isLatest) return entries[i].index
      }
      return entries.length ? entries[entries.length - 1].index : null
    }
    var n = Number(value)
    return isNaN(n) ? null : n
  }

  function setLatest(index) {
    entries.forEach(function (e) { e.isLatest = e.index === index })
  }

  function findEntry(index) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].index === index) return entries[i]
    }
    return null
  }

  function register(meta) {
    counter += 1
    var entry = {
      index: counter,
      instanceId: meta.instanceId,
      moduleId: meta.moduleId,
      moduleTitle: meta.moduleTitle,
      containerId: meta.containerId,
      description: meta.description,
      stepIds: meta.stepIds.slice(),
      completedStepIds: [],
      status: 'in_progress',
      domSelector: '#' + meta.instanceId,
      isLatest: false
    }
    entries.push(entry)
    setLatest(entry.index)
    return entry
  }

  function markStepComplete(index, stepId) {
    var entry = findEntry(index)
    if (!entry) return
    if (entry.completedStepIds.indexOf(stepId) === -1) {
      entry.completedStepIds.push(stepId)
    }
    var allDone = entry.stepIds.every(function (id) {
      return entry.completedStepIds.indexOf(id) !== -1
    })
    if (allDone) entry.status = 'complete'
  }

  function markAbandonedForModule(moduleId) {
    entries.forEach(function (e) {
      if (e.moduleId === moduleId && e.status === 'in_progress') {
        e.status = 'abandoned'
      }
    })
  }

  function scrollTo(indexOrLatest, options) {
    options = options || {}
    var index = parseIndex(indexOrLatest)
    if (index == null) return { ok: false, reason: 'INVALID_INDEX' }

    var entry = findEntry(index)
    if (!entry) return { ok: false, reason: 'INDEX_NOT_FOUND', index: index }

    var el = document.querySelector(entry.domSelector)
    if (!el) return { ok: false, reason: 'DOM_NOT_FOUND', index: index }

    var stage = document.querySelector('.lf-stage')
    if (stage) {
      var stageRect = stage.getBoundingClientRect()
      var elRect = el.getBoundingClientRect()
      var scale = Number(getComputedStyle(document.documentElement).getPropertyValue('--lf-board-scale')) || 1
      if (!scale) scale = 1
      var align = options.align || 'start'
      var relTop = (elRect.top - stageRect.top) / scale + stage.scrollTop
      if (align === 'center') {
        relTop -= (stage.clientHeight / scale - el.offsetHeight) / 2
      }
      stage.scrollTop = Math.max(0, relTop)
    } else {
      el.scrollIntoView({ behavior: options.behavior || 'auto', block: options.align === 'center' ? 'center' : 'start' })
    }

    return { ok: true, index: index }
  }

  function getManifest() {
    return entries.map(function (e) {
      return {
        index: e.index,
        instanceId: e.instanceId,
        moduleId: e.moduleId,
        moduleTitle: e.moduleTitle,
        containerId: e.containerId,
        description: e.description,
        stepIds: e.stepIds.slice(),
        completedStepIds: e.completedStepIds.slice(),
        status: e.status,
        domSelector: e.domSelector,
        isLatest: e.isLatest
      }
    })
  }

  function reset() {
    counter = 0
    entries = []
  }

  window.AIClassScrollIndex = {
    register: register,
    markStepComplete: markStepComplete,
    markAbandonedForModule: markAbandonedForModule,
    scrollTo: scrollTo,
    getManifest: getManifest,
    reset: reset,
    setLatest: setLatest
  }
})()

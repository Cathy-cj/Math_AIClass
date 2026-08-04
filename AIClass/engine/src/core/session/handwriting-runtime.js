// 手写板 runtime — Agent 按需挂载/收起，支持按 logAction 多实例并存
;(function () {
  var instances = {}
  var lastLogAction = null

  function runtimeStepId(logAction) {
    return 'runtime:' + logAction
  }

  function lessonRenderConfig() {
    var reg = window.AIClassModuleRegistry
    var handlers = window.LESSON_HANDLERS || {}
    if (reg && reg.handlers && Object.keys(reg.handlers).length) {
      handlers = reg.handlers
    }
    return {
      meta: (reg && reg.meta) || {},
      handlers: handlers
    }
  }

  function buildBlock(opts) {
    opts = opts || {}
    var hw = {
      height: opts.height != null ? opts.height : 420,
      toolbar: opts.toolbar || ['pen', 'eraser', 'undo', 'redo', 'clear', 'upload', 'demo', 'submit'],
      maxContentHeight: opts.maxContentHeight,
      demoVideo: opts.demoVideo || 'src/assets/handwriting-demo/handwriting-demo.mp4',
      demoPreview: opts.demoPreview
    }
    if (opts.ocr === false) {
      hw.ocr = false
    } else if (opts.ocrApiKey) {
      hw.ocr = { apiKey: opts.ocrApiKey }
    } else {
      hw.ocr = true
    }
    if (opts.pretendSubmit) {
      hw.pretendSubmit = true
    }
    if (opts.draftOnly) {
      hw.draftOnly = true
      if (opts.zoneMaskText) hw.zoneMaskText = opts.zoneMaskText
      if (opts.draftNote) hw.draftNote = opts.draftNote
      hw.toolbar = opts.toolbar || ['pen', 'eraser', 'undo', 'redo', 'clear', 'demo']
    }
    return {
      type: 'handwriting',
      region: opts.region || 'right',
      interactive: true,
      onSubmit: (opts.pretendSubmit || opts.draftOnly) ? null : 'reportHandwriting',
      logAction: opts.logAction,
      __stepId: runtimeStepId(opts.logAction),
      __isCurrentStep: true,
      handwriting: hw
    }
  }

  function findHandwritingByStepId(containerRecord, stepId) {
    if (!containerRecord || !containerRecord.el || stepId == null) return null
    var nodes = containerRecord.el.querySelectorAll('.lf-block-handwriting')
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-step-id') === String(stepId)) return nodes[i]
    }
    return null
  }

  function findHandwritingInContainer(containerRecord) {
    if (!containerRecord || !containerRecord.el) return null
    return containerRecord.el.querySelector('.lf-block-handwriting')
  }

  function hasStaticHandwriting(containerRecord) {
    if (!containerRecord || !containerRecord.el) return false
    var nodes = containerRecord.el.querySelectorAll('.lf-block-handwriting')
    for (var i = 0; i < nodes.length; i++) {
      var stepId = nodes[i].getAttribute('data-step-id') || ''
      if (stepId.indexOf('runtime:') !== 0) return true
    }
    return false
  }

  function recordFromKey(containerKey) {
    if (!containerKey || !window.AIClassContainerHost) return null
    var parts = String(containerKey).split('::')
    if (parts.length < 2) return null
    return AIClassContainerHost.get(parts[0], parseInt(parts[1], 10))
  }

  function unmountDom(containerRecord, stepId) {
    if (!containerRecord || !containerRecord.container) return
    if (stepId != null) {
      containerRecord.container.clearStepBlocks([stepId])
    }
    if (containerRecord.container.layout === 'left-right') {
      containerRecord.container.placeGuidanceInStack()
    }
  }

  function teardownInstance(inst, clearDraft) {
    if (!inst) return null
    var record = recordFromKey(inst.containerKey)
    if (record) {
      var hw = findHandwritingByStepId(record, inst.stepId)
      if (hw && typeof hw._hwCloseDemoUi === 'function') {
        hw._hwCloseDemoUi()
      }
      if (hw && typeof hw._hwTeardown === 'function') {
        hw._hwTeardown()
      } else if (hw && typeof hw._hwAbortSubmit === 'function') {
        hw._hwAbortSubmit()
      }
      if (clearDraft && window.AIClassComponent &&
          typeof AIClassComponent.clearHandwritingStorage === 'function') {
        AIClassComponent.clearHandwritingStorage(inst.stepId)
      }
      unmountDom(record, inst.stepId)
    }
    return {
      logAction: inst.logAction,
      stepId: inst.stepId,
      containerKey: inst.containerKey
    }
  }

  function mount(containerRecord, opts) {
    opts = opts || {}
    if (!opts.logAction) {
      return { ok: false, code: 'INVALID_PARAMS', message: 'logAction is required' }
    }
    if (!containerRecord || !containerRecord.container) {
      return { ok: false, code: 'CONTAINER_NOT_READY', message: 'container not ready' }
    }
    if (hasStaticHandwriting(containerRecord)) {
      return {
        ok: false,
        code: 'HANDWRITING_ALREADY_OPEN',
        message: '容器已有静态手写板块'
      }
    }

    var existing = instances[opts.logAction]
    if (existing) {
      lastLogAction = opts.logAction
      var existingRecord = recordFromKey(existing.containerKey)
      var existingEl = existingRecord
        ? findHandwritingByStepId(existingRecord, existing.stepId)
        : null
      return {
        ok: true,
        logAction: existing.logAction,
        stepId: existing.stepId,
        el: existingEl,
        reused: true
      }
    }

    var stepId = runtimeStepId(opts.logAction)
    var block = buildBlock(opts)
    var appended = containerRecord.container.appendBlocks([block], {
      stepId: stepId,
      isCurrentStep: true,
      instant: false,
      config: lessonRenderConfig()
    })
    containerRecord.container.finalizeInteractions(stepId)

    if (containerRecord.container.layout === 'left-right') {
      containerRecord.container.placeGuidanceInStack()
    }

    var inst = {
      logAction: opts.logAction,
      containerKey: containerRecord.key,
      stepId: stepId,
      runtime: true
    }
    instances[opts.logAction] = inst
    lastLogAction = opts.logAction

    return {
      ok: true,
      logAction: opts.logAction,
      stepId: stepId,
      el: appended.length ? appended[appended.length - 1] : null
    }
  }

  function dismiss(clearDraft, logAction) {
    var shouldClear = !!clearDraft
    if (logAction) {
      var inst = instances[logAction]
      if (!inst) {
        return { ok: true, wasOpen: false, closed: [] }
      }
      var closedOne = teardownInstance(inst, shouldClear)
      delete instances[logAction]
      if (lastLogAction === logAction) {
        var remaining = Object.keys(instances)
        lastLogAction = remaining.length ? remaining[remaining.length - 1] : null
      }
      return {
        ok: true,
        wasOpen: true,
        logAction: closedOne.logAction,
        stepId: closedOne.stepId,
        closed: [closedOne]
      }
    }

    var keys = Object.keys(instances)
    if (!keys.length) {
      return { ok: true, wasOpen: false, closed: [] }
    }
    var closed = []
    keys.forEach(function (key) {
      var removed = teardownInstance(instances[key], shouldClear)
      if (removed) closed.push(removed)
      delete instances[key]
    })
    lastLogAction = null
    return {
      ok: true,
      wasOpen: true,
      closed: closed,
      logAction: closed.length === 1 ? closed[0].logAction : null,
      stepId: closed.length === 1 ? closed[0].stepId : null
    }
  }

  function isOpen() {
    return Object.keys(instances).length > 0
  }

  function currentLogAction() {
    return lastLogAction
  }

  function currentState() {
    if (!lastLogAction || !instances[lastLogAction]) return null
    var inst = instances[lastLogAction]
    return {
      logAction: inst.logAction,
      containerKey: inst.containerKey,
      stepId: inst.stepId,
      runtime: true
    }
  }

  function listOpen() {
    return Object.keys(instances).map(function (key) {
      var inst = instances[key]
      return {
        logAction: inst.logAction,
        containerKey: inst.containerKey,
        stepId: inst.stepId,
        runtime: true
      }
    })
  }

  function teardownAll() {
    return dismiss(false)
  }

  window.AIClassHandwritingRuntime = {
    mount: mount,
    dismiss: dismiss,
    isOpen: isOpen,
    currentLogAction: currentLogAction,
    currentState: currentState,
    listOpen: listOpen,
    teardownAll: teardownAll,
    runtimeStepId: runtimeStepId,
    findHandwritingInContainer: findHandwritingInContainer,
    findHandwritingByStepId: findHandwritingByStepId,
    hasStaticHandwriting: hasStaticHandwriting
  }
})()

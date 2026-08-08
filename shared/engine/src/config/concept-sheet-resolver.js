// 从 topic 模块步骤（legacyId）解析概念插播内容 — 供底部抽屉复用 kn_ 同源配置
;(function () {
  function getRegistry() {
    return window.AIClassModuleRegistry || null
  }

  function extractPushMeta(push) {
    var title = ''
    var lines = []
    ;(push || []).forEach(function (block) {
      if (block.type === 'section' && block.title) title = block.title
      if (block.type === 'text') {
        ;(block.lines || []).forEach(function (line) {
          if (typeof line === 'string') lines.push(line)
          else if (line && line.text) lines.push(String(line.text))
        })
      }
    })
    return { title: title, lines: lines }
  }

  function findStepByLegacyId(legacyId) {
    var reg = getRegistry()
    if (!reg || !legacyId) return null
    var modules = reg.modules || []
    for (var m = 0; m < modules.length; m++) {
      var mod = modules[m]
      var containers = mod.containers || []
      for (var c = 0; c < containers.length; c++) {
        var container = containers[c]
        var steps = container.steps || []
        for (var s = 0; s < steps.length; s++) {
          var step = steps[s]
          if (step.legacyId === legacyId) {
            return { module: mod, container: container, step: step }
          }
        }
      }
    }
    return null
  }

  function stepToPayload(hit) {
    if (!hit) return null
    var step = hit.step
    var container = hit.container
    var figure = container.figure || null
    var figureState = null
    if (step.figure) {
      figureState = typeof step.figure === 'string' ? step.figure : step.figure.state
    }
    var meta = extractPushMeta(step.push)
    return {
      id: step.legacyId || step.id,
      moduleId: hit.module.id,
      moduleTitle: hit.module.title,
      action: step.action,
      description: step.description || '',
      figure: figure,
      figureState: figureState,
      title: meta.title || hit.module.title,
      lines: meta.lines,
      sequenceStates: figureState ? [figureState] : []
    }
  }

  function resolveLegacyId(legacyId) {
    return stepToPayload(findStepByLegacyId(legacyId))
  }

  function findStepByAction(actionName) {
    var reg = getRegistry()
    if (!reg || !actionName) return null
    var modules = reg.modules || []
    for (var m = 0; m < modules.length; m++) {
      var mod = modules[m]
      var containers = mod.containers || []
      for (var c = 0; c < containers.length; c++) {
        var container = containers[c]
        var steps = container.steps || []
        for (var s = 0; s < steps.length; s++) {
          var step = steps[s]
          if (step.action === actionName) {
            return { module: mod, container: container, step: step }
          }
        }
      }
    }
    return null
  }

  function resolveTopicAction(actionName) {
    return stepToPayload(findStepByAction(actionName))
  }

  function resolveSheetEntry(entry) {
    if (!entry) return null
    if (entry.figure && entry.figureState) {
      return {
        id: entry.id || entry.action,
        action: entry.action,
        description: entry.description || '',
        figure: entry.figure,
        figureState: entry.figureState,
        title: entry.title || '概念补充',
        lines: entry.lines || [],
        sequenceStates: entry.sequenceStates || (entry.figureState ? [entry.figureState] : [])
      }
    }

    var ids = []
    if (Array.isArray(entry.sequenceLegacyIds) && entry.sequenceLegacyIds.length) {
      ids = entry.sequenceLegacyIds.slice()
    } else if (entry.sourceLegacyId) {
      ids = [entry.sourceLegacyId]
    }
    if (!ids.length) return null

    var payloads = ids.map(function (id) { return resolveLegacyId(id) }).filter(Boolean)
    if (!payloads.length) return null

    var last = payloads[payloads.length - 1]
    var sequenceStates = []
    payloads.forEach(function (p) {
      ;(p.sequenceStates || []).forEach(function (st) {
        if (st && sequenceStates.indexOf(st) < 0) sequenceStates.push(st)
      })
      if (p.figureState && sequenceStates.indexOf(p.figureState) < 0) {
        sequenceStates.push(p.figureState)
      }
    })

    return {
      id: entry.id || entry.action,
      action: entry.action,
      description: entry.description || last.description || '',
      figure: last.figure,
      figureState: last.figureState,
      title: entry.title || last.title || '概念补充',
      lines: entry.lines && entry.lines.length ? entry.lines : last.lines,
      sequenceStates: sequenceStates,
      sourceLegacyIds: ids
    }
  }

  window.AIClassConceptSheetResolver = {
    findStepByLegacyId: findStepByLegacyId,
    findStepByAction: findStepByAction,
    resolveLegacyId: resolveLegacyId,
    resolveTopicAction: resolveTopicAction,
    resolveSheetEntry: resolveSheetEntry
  }
})()

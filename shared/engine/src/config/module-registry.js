// 模块注册表（引擎 API；内容由 lesson/bootstrap.js 注入）
;(function () {
  var registry = {
    meta: {},
    modules: [],
    handlers: {}
  }

  function getModule(moduleId) {
    for (var i = 0; i < registry.modules.length; i++) {
      if (registry.modules[i].id === moduleId) return registry.modules[i]
    }
    return null
  }

  function scrollPlan() {
    return registry.modules.map(function (mod) {
      return {
        moduleId: mod.id,
        moduleTitle: mod.title,
        containers: mod.containers.map(function (c) {
          return {
            containerId: c.id,
            description: c.description || c.title,
            steps: c.steps.map(function (s) { return s.id })
          }
        })
      }
    })
  }

  function flattenSideEffects(modules) {
    var list = []
    ;(modules || []).forEach(function (mod) {
      ;(mod.sideEffects || []).forEach(function (fx) {
        list.push(Object.assign({
          moduleId: mod.id,
          moduleTitle: mod.title
        }, fx))
      })
    })
    return list
  }

  function init(payload) {
    payload = payload || {}
    registry.meta = payload.meta || {}
    registry.modules = payload.modules || []
    registry.handlers = (payload.handlers && Object.keys(payload.handlers).length)
      ? payload.handlers
      : (window.LESSON_HANDLERS || {})
    registry.sideEffects = flattenSideEffects(registry.modules)
    registry.conceptSheets = payload.conceptSheets || []
    registry.conceptSheetCloseAction = payload.conceptSheetCloseAction || '插播_关闭'
  }

  function conceptSheetByAction(actionName) {
    var list = registry.conceptSheets || []
    for (var i = 0; i < list.length; i++) {
      if (list[i].action === actionName) return list[i]
    }
    return null
  }

  function resolveConceptSheetConfig(entry) {
    if (!entry) return null
    if (window.AIClassConceptSheetResolver && AIClassConceptSheetResolver.resolveSheetEntry) {
      return AIClassConceptSheetResolver.resolveSheetEntry(entry)
    }
    return null
  }

  window.AIClassModuleRegistry = {
    data: registry,
    get modules() { return registry.modules },
    get meta() { return registry.meta },
    get handlers() { return registry.handlers },
    get sideEffects() { return registry.sideEffects || [] },
    init: init,
    getModule: getModule,
    scrollPlan: scrollPlan,
    conceptSheetByAction: conceptSheetByAction,
    resolveConceptSheetConfig: resolveConceptSheetConfig,
    get conceptSheetCloseAction() { return registry.conceptSheetCloseAction || '插播_关闭' },
    get conceptSheets() { return registry.conceptSheets || [] }
  }
})()

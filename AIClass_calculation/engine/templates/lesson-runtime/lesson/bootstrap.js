// 通用课程 bootstrap：收集模块并注入引擎注册表。
;(function () {
  window.__lessonModules = window.__lessonModules || []

  window.__lessonRegisterModule = function (module) {
    window.__lessonModules.push(module)
  }

  function mergeDefaults(module, meta) {
    var defs = (meta && meta.defaults) || {}
    ;(module.containers || []).forEach(function (container) {
      container.layoutParams = Object.assign({}, defs.layoutParams, container.layoutParams || {})
      container.style = Object.assign({}, defs.style, container.style || {})
    })
    return module
  }

  function bootLesson() {
    var meta = window.LESSON_META || {}
    var modules = (window.__lessonModules || []).map(function (module) {
      return mergeDefaults(module, meta)
    })

    window.AIClassModuleRegistry.init({
      meta: meta,
      modules: modules,
      handlers: window.LESSON_HANDLERS || {},
      conceptSheets: window.CONCEPT_SHEETS || [],
      conceptSheetCloseAction: window.CONCEPT_SHEET_CLOSE_ACTION || 'concept-sheet:close'
    })
  }

  window.AIClassLessonBootstrap = { boot: bootLesson }
})()

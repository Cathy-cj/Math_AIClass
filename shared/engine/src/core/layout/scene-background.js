// 课程场景背景 — 由调度/课前流程切换，figure 不得直接改 body
;(function () {
  var ATTR = 'data-lesson-scene'
  var TOPIC_WARM = 'topic-warm'

  function isTopicModule(moduleId) {
    if (window.AIClassHubConfig) return AIClassHubConfig.isTopicModuleId(moduleId)
    return false
  }

  function set(scene) {
    if (!scene) {
      clear()
      return
    }
    document.body.setAttribute(ATTR, scene)
  }

  function clear() {
    document.body.removeAttribute(ATTR)
  }

  function get() {
    return document.body.getAttribute(ATTR) || null
  }

  function applyForModule(moduleId) {
    if (isTopicModule(moduleId)) {
      set(TOPIC_WARM)
    } else {
      clear()
    }
  }

  window.AIClassSceneBackground = {
    TOPIC_WARM: TOPIC_WARM,
    set: set,
    clear: clear,
    get: get,
    applyForModule: applyForModule,
    isTopicModule: isTopicModule
  }
})()

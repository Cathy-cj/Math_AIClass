// postMessage 入口 — 接收父页面 action，驱动 CourseScheduler；DOMContentLoaded 后 boot
;(function () {
  var scheduler = null

  function mountStackFlow() {
    AIClassBackgroundBoard.ensureViewportBackground('course')
    var boardStage = AIClassBackgroundBoard.mountBoardStage({
      boardId: 'course-stack-board',
      stageId: 'course-stack-stage',
      layout: { mode: 'stack', designWidth: 1200 },
      background: document.getElementById('course-bg')
    })

    var wrap = document.createElement('div')
    wrap.className = 'course-flow'
    wrap.id = 'course-flow'
    boardStage.stage.appendChild(wrap)
    AIClassContainerHost.setFlowEl(wrap)

    return boardStage
  }

  function initScheduler() {
    var router = AIClassActionRouter.init(AIClassModuleRegistry)
    scheduler = new AIClassCourseScheduler({
      router: router,
      registry: AIClassModuleRegistry,
      host: AIClassContainerHost,
      index: AIClassScrollIndex,
      log: AIClassExecutionLog
    })
    window.__courseScheduler = scheduler
    return scheduler
  }

  function handleMessage(event) {
    var data = event.data
    if (!data || !scheduler) return

    if (data.action === 'help') {
      scheduler.dispatch('help', data.params || {})
      return
    }

    var actionName = data.action
    if (!actionName) return

    scheduler.dispatch(actionName, data.params || {})
  }

  function notifyReady() {
    AIClassExecutionLog.post({ type: 'ready', status: 'ok' })
  }

  function boot() {
    if (window.AIClassLessonBootstrap) {
      AIClassLessonBootstrap.boot()
    }
    mountStackFlow()
    initScheduler()
    if (scheduler && typeof scheduler._validateActionCatalog === 'function') {
      scheduler._validateActionCatalog()
    }
    var stageEl = document.getElementById('course-stack-stage')
    if (window.AIClassPreLessonFlow) {
      AIClassPreLessonFlow.init({ stage: stageEl, scheduler: scheduler })
    }
    window.addEventListener('message', handleMessage)
    notifyReady()
  }

  window.AIClassMessageBridge = {
    boot: boot,
    getScheduler: function () { return scheduler },
    handleMessage: handleMessage
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()

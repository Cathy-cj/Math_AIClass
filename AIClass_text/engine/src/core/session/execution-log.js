// 向父页面 postMessage 回传（step_ok / help / feynman_shown / scheduler_error 等）
;(function () {
  function post(payload) {
    var boot = window.__COURSE_BOOT || {}
    var envelope = payload && payload.type === 'user_submitted'
      ? payload
      : Object.assign({
        source: boot.messageSource || 'aiclass-page'
      }, payload)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(envelope, boot.targetOrigin || '*')
    }
    if (typeof window.__onCourseMessage === 'function') {
      window.__onCourseMessage(envelope)
    }
  }

  function stepOk(data) {
    var payload = {
      type: 'step_ok',
      status: 'ok',
      action: data.action || null,
      stepId: data.stepId,
      moduleId: data.moduleId || null,
      session: data.session || null,
      nextAction: data.nextAction != null ? data.nextAction : null,
      nextStepId: data.nextStepId != null ? data.nextStepId : null,
      scrollIndex: data.scrollIndex != null ? data.scrollIndex : null,
      schedulerState: data.schedulerState
    }
    if (data.checkpoint) payload.checkpoint = data.checkpoint
    post(payload)
  }

  function scrollOk(index) {
    post({
      type: 'scroll_ok',
      status: 'ok',
      index: index
    })
  }

  function schedulerError(err) {
    err = err || {}
    var payload = {
      type: 'scheduler_error',
      status: 'error',
      code: err.code,
      message: err.message,
      context: err.context || {},
      hint: err.hint || ''
    }
    if (err.expectedAction) payload.expectedAction = err.expectedAction
    post(payload)
  }

  window.AIClassExecutionLog = {
    post: post,
    stepOk: stepOk,
    scrollOk: scrollOk,
    schedulerError: schedulerError
  }
})()

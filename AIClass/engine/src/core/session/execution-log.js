// 向父页面 postMessage 回传（step_ok / help / feynman_shown / scheduler_error 等）
;(function () {
  function post(payload) {
    var boot = window.__COURSE_BOOT || {}
    var envelope = payload
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
      status: 'ok'
    }
    post(payload)
  }

  function scrollOk(index) {
    post({
      type: 'scroll_ok',
      status: 'ok'
    })
  }

  function schedulerError(err) {
    err = err || {}
    var payload = {
      type: 'scheduler_error',
      status: 'error',
      code: err.code,
      message: err.message || ''
    }
    post(payload)
  }

  window.AIClassExecutionLog = {
    post: post,
    stepOk: stepOk,
    scrollOk: scrollOk,
    schedulerError: schedulerError
  }
})()

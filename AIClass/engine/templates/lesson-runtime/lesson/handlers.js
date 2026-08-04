// 通用互动提交处理器；课程可在 extensions 中增加自定义 handler。
;(function () {
  function submitApi() { return window.AIClassCoursewareSubmit }
  function snapshotApi() { return window.AIClassInteractionSnapshot }

  window.LESSON_HANDLERS = {
    reportFillBlank: function (value, block) {
      var snapshot = snapshotApi()
      var api = submitApi()
      var payload = snapshot && snapshot.buildFillPayload
        ? snapshot.buildFillPayload(value, block)
        : {}
      if (api && api.submitFillBlank) api.submitFillBlank(payload, value, block)
    },
    reportSingleChoice: function (value, block) {
      var snapshot = snapshotApi()
      var api = submitApi()
      var payload = snapshot && snapshot.buildChoicePayload
        ? snapshot.buildChoicePayload(value, block)
        : {}
      if (!api) return
      if (block && block.multiple && api.submitMultipleChoice) {
        api.submitMultipleChoice(payload, value, block)
      } else if (api.submitSingleChoice) {
        api.submitSingleChoice(payload, value, block)
      }
    }
  }
})()

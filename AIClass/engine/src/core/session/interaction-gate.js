// 互动块提交网关 — choice/fill/dragSlots/lineMatch 等统一提交与 handler 分发
;(function () {
  function showSubmittingToast() {
    if (window.toast && typeof window.toast.show === 'function') {
      window.toast.show('提交中…', { duration: 1200 })
    }
  }

  function applyGuidanceReveal(block) {
    var reveal = block && block.guidanceReveal
    if (!reveal || reveal.group == null) return
    var host = window.AIClassContainerHost
    var bridge = window.AIClassMessageBridge
    if (!host || !bridge || typeof bridge.getScheduler !== 'function') return
    var sched = bridge.getScheduler()
    if (!sched || !sched.currentModuleId) return
    var idx = reveal.containerIdx != null ? reveal.containerIdx : 0
    var record = host.get(sched.currentModuleId, idx)
    if (record && record.container) {
      record.container.setGuidanceGroup(reveal.group, { desc: reveal.desc })
    }
  }

  function resolveHandlers(config) {
    var fromConfig = config && config.handlers
    if (fromConfig && Object.keys(fromConfig).length) return fromConfig
    return window.LESSON_HANDLERS || {}
  }

  function defaultSubmit(type, value, block, config) {
    showSubmittingToast()
    var kind = type === 'dragSlots' ? 'fill' : (type === 'lineMatch' ? 'matching' : type)

    if (block && block.onSubmit) {
      var handlers = resolveHandlers(config)
      if (typeof handlers[block.onSubmit] === 'function') {
        handlers[block.onSubmit](value, block, config)
        applyGuidanceReveal(block)
        return
      }
      console.warn(
        '[AIClassInteractionGate] handler.' + block.onSubmit + ' is missing or not a function'
      )
    }

    var submit = window.AIClassCoursewareSubmit
    var snap = window.AIClassInteractionSnapshot

    if (submit && typeof submit.submitInteraction === 'function') {
      var envelope = {}
      if (snap) {
        if (kind === 'choice' && typeof snap.buildChoicePayload === 'function') {
          envelope = snap.buildChoicePayload(value, block)
        } else if (kind === 'fill' && typeof snap.buildFillPayload === 'function') {
          envelope = snap.buildFillPayload(value, block)
        } else if (typeof snap.submitContext === 'function') {
          envelope.context = snap.submitContext(block)
        }
      }
      submit.submitInteraction(kind, envelope, value, block)
      applyGuidanceReveal(block)
      return
    }

    if (window.AIClassSubmitText && typeof AIClassSubmitText.report === 'function') {
      AIClassSubmitText.report(kind, value, block)
    }
    applyGuidanceReveal(block)
  }

  function isInteractive(block, runtime) {
    return !!(
      runtime &&
      runtime.isCurrentStep &&
      block &&
      block.interactive !== false &&
      !block.readonly &&
      !block.revealed &&
      block.value == null
    )
  }

  window.AIClassInteractionGate = {
    submit: defaultSubmit,
    isInteractive: isInteractive
  }
})()

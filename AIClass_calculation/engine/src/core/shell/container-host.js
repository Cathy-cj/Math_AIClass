// ContainerHost — 委托 CourseContainer，维护 module 映射
;(function () {
  var flowEl = null
  var openContainers = {}
  var splitLayoutStageLocked = false

  function setFlowEl(el) {
    flowEl = el
  }

  function isSplitLayout(layout) {
    return layout === 'left-right' || layout === 'top-split'
  }

  function lockStageForSplitLayout() {
    if (splitLayoutStageLocked) return
    var stage = document.querySelector('.lf-stage')
    if (!stage || !window.AIClassStageScrollLock) return
    AIClassStageScrollLock.lock(stage)
    splitLayoutStageLocked = true
  }

  function unlockStageForSplitLayout() {
    var stage = document.querySelector('.lf-stage')
    if (stage && window.AIClassStageScrollLock) {
      while (AIClassStageScrollLock.isLocked(stage)) {
        AIClassStageScrollLock.unlock(stage)
      }
    }
    splitLayoutStageLocked = false
  }

  function syncStackMode() {
    if (!flowEl) return
    var count = flowEl.querySelectorAll('.course-container').length
    var stage = document.querySelector('.lf-stage') ||
      document.getElementById('course-stack-stage')
    if (count >= 2) {
      flowEl.classList.add('course-flow--stack')
      if (stage && stage.clientHeight) {
        flowEl.style.setProperty('--cc-stack-panel-min', stage.clientHeight + 'px')
      }
      unlockStageForSplitLayout()
      return
    }
    flowEl.classList.remove('course-flow--stack')
    flowEl.style.removeProperty('--cc-stack-panel-min')
  }

  function isStackMode() {
    return !!(flowEl && flowEl.classList.contains('course-flow--stack'))
  }

  function containerKey(moduleId, containerIdx) {
    return moduleId + '::' + containerIdx
  }

  function resolveFigure(figure) {
    if (!figure) return null
    if (window.AIClassFigureRegistry && typeof window.AIClassFigureRegistry.resolve === 'function') {
      return window.AIClassFigureRegistry.resolve(figure)
    }
    return figure
  }

  function create(meta) {
    if (!flowEl) throw new Error('[ContainerHost] flow element not set')
    if (!window.AIClassCourseContainer) throw new Error('[ContainerHost] AIClassCourseContainer not loaded')

    var key = containerKey(meta.moduleId, meta.containerIdx)
    if (openContainers[key]) return openContainers[key]

    var instanceId = meta.instanceId || ('course-container-' + Date.now())
    var container = AIClassCourseContainer.create({
      mount: flowEl,
      layout: meta.layout || 'text-only',
      layoutParams: meta.layoutParams || {},
      style: meta.style || {},
      figure: resolveFigure(meta.figure),
      head: meta.head != null ? meta.head : null,
      difficulty: meta.difficulty != null ? meta.difficulty : null,
      difficultyMax: meta.difficultyMax != null ? meta.difficultyMax : null,
      textAccumulate: meta.textAccumulate === true,
      guidanceLayout: meta.guidanceLayout || 'stacked',
      guidanceChain: meta.guidanceChain || null,
      instanceId: instanceId,
      meta: {
        moduleId: meta.moduleId,
        containerId: meta.containerId,
        containerIdx: meta.containerIdx
      }
    })

    var record = {
      key: key,
      instanceId: instanceId,
      el: container.getElement(),
      container: container,
      scrollEl: container.getScrollEl(),
      scrollIndex: null
    }
    openContainers[key] = record
    if (isSplitLayout(meta.layout) && Object.keys(openContainers).length === 1) {
      lockStageForSplitLayout()
    }
    syncStackMode()
    return record
  }

  function get(moduleId, containerIdx) {
    return openContainers[containerKey(moduleId, containerIdx)] || null
  }

  function lessonHandlers() {
    var reg = window.AIClassModuleRegistry
    var fromReg = reg && reg.handlers
    if (fromReg && Object.keys(fromReg).length) return fromReg
    return window.LESSON_HANDLERS || {}
  }

  function lessonRenderConfig() {
    var reg = window.AIClassModuleRegistry
    if (!reg) return {}
    return {
      meta: reg.meta || {},
      handlers: lessonHandlers()
    }
  }

  function interleavedGuideAnchor(container, group) {
    if (!container || container.guidanceLayout !== 'interleaved' || group == null) return null
    var panel = container.guidePanelEl
    if (!panel || !panel.querySelector) return null
    return panel.querySelector(
      '.cc-guide-section[data-guide-group="' + String(group) + '"]:not(.is-hidden)'
    )
  }

  function isInterleavedAccumulate(container) {
    if (!container) return false
    if (container.layout === 'top-split' || container.layout === 'left-right') return false
    return container.guidanceLayout === 'interleaved' && container.textAccumulate === true
  }

  function isRightPinStart(push, retainPush) {
    if (!push || !push.length || retainPush) return false
    return push.every(function (block) {
      var region = block.region || block.zone || 'top'
      return region === 'right'
    })
  }

  function clearTopSplitSideEffects(container, stepIds, retainPush, push) {
    if (!container || container.layout !== 'top-split') {
      container.clearStepBlocks(stepIds, retainPush)
      return
    }
    if (isRightPinStart(push, retainPush)) {
      container.clearStepBlocks(stepIds, retainPush, { scrollEl: container.scrollLeftEl })
      container.clearStepBlocks(stepIds, retainPush, { scrollEl: container.scrollRightEl })
      if (container.scrollLeftEl) container.scrollLeftEl.scrollTop = 0
      if (container.scrollRightEl) container.scrollRightEl.scrollTop = 0
      return
    }
    if (retainPush && retainPush.length) {
      container.clearStepBlocks(stepIds, retainPush, { scrollEl: container.scrollLeftEl })
      return
    }
    container.clearStepBlocks(stepIds, retainPush)
  }

  function renderStepContent(containerRecord, stepMeta, push, stepDef) {
    var container = containerRecord.container
    if (!container) return null

    if (stepMeta.sideEffect && stepDef) {
      if (isInterleavedAccumulate(container)) {
        if (stepMeta.stepId != null) {
          container.clearStepBlocks([stepMeta.stepId], stepDef.retainPush)
        }
      } else if (stepDef.sideEffectStepIds && stepDef.sideEffectStepIds.length) {
        clearTopSplitSideEffects(
          container,
          stepDef.sideEffectStepIds,
          stepDef.retainPush,
          push
        )
      } else if (stepMeta.stepId != null) {
        container.clearStepBlocks([stepMeta.stepId], stepDef.retainPush)
      }
    }

    // 每步独立：有 figure 则切换状态，无 figure 则保持当前状态不变（避免清掉上一步的动画）
    if (stepMeta.sideEffect && stepDef && stepDef.figure) {
      var figureState = stepDef.figure
      var figureAnimate = figureState.animate === true
      container.setFigureState(figureState, {
        stepId: stepMeta.stepId,
        action: stepMeta.action,
        instant: !figureAnimate
      })
    } else if (stepDef && stepDef.figure) {
      container.setFigureState(stepDef.figure, {
        stepId: stepMeta.stepId,
        action: stepMeta.action,
        instant: false
      })
    }

    if (stepDef && stepDef.group != null) {
      container.setGuidanceGroup(stepDef.group, {
        sub: stepDef.guidanceSub
      })
    }

    if (stepDef && stepDef.stemClass) {
      var stemSpecs = Array.isArray(stepDef.stemClass) ? stepDef.stemClass : [stepDef.stemClass]
      stemSpecs.forEach(function (spec) {
        container.applyStemClass(spec)
      })
    }

    if (push && push.length) {
      var appended = container.appendBlocks(push, {
        stepId: stepMeta.stepId,
        group: stepDef && stepDef.group,
        isCurrentStep: true,
        instant: false,
        config: lessonRenderConfig()
      })
      container.finalizeInteractions(stepMeta.stepId)
      return appended.length ? appended[appended.length - 1] : null
    }

    if (stepDef && stepDef.figure) {
      /* 仅有 figure 的知识步：不插入占位文字 */
      container.finalizeInteractions(stepMeta.stepId)
      return interleavedGuideAnchor(container, stepDef.group)
    }

    if (stepDef && stepDef.guidanceSub) {
      /* guidanceSub 已由 setGuidanceGroup 渲染，不需要占位文字 */
      container.finalizeInteractions(stepMeta.stepId)
      return interleavedGuideAnchor(container, stepDef.group)
    }

    /* 空 push / 口播-only：不插入 action 名占位文字 */
    container.finalizeInteractions(stepMeta.stepId)
    return interleavedGuideAnchor(container, stepDef && stepDef.group)
  }

  function renderStepPlaceholder(containerRecord, stepMeta) {
    var container = containerRecord.container
    if (!container) return null

    var appended = container.appendBlocks([
      {
        type: 'text',
        lines: [stepMeta.action || stepMeta.stepId]
      }
    ], {
      stepId: stepMeta.stepId,
      isCurrentStep: true,
      instant: true
    })
    return appended.length ? appended[appended.length - 1] : null
  }

  function reset() {
    Object.keys(openContainers).forEach(function (key) {
      var record = openContainers[key]
      if (record && record.container && record.container.figureHost &&
          typeof record.container.figureHost.teardown === 'function') {
        record.container.figureHost.teardown()
      }
      if (record && record.container && record.container.el) {
        var el = record.container.el
        if (typeof el._stemExpandTeardown === 'function') {
          el._stemExpandTeardown()
        }
        var scrollRight = record.container.scrollRightEl
        if (scrollRight && typeof scrollRight._overlayScrollbarTeardown === 'function') {
          scrollRight._overlayScrollbarTeardown()
        }
      }
    })
    if (flowEl) flowEl.innerHTML = ''
    openContainers = {}
    if (window.AIClassComponent && typeof window.AIClassComponent.resetMathKeyboard === 'function') {
      window.AIClassComponent.resetMathKeyboard()
    }
    unlockStageForSplitLayout()
    syncStackMode()
  }

  window.AIClassContainerHost = {
    setFlowEl: setFlowEl,
    create: create,
    get: get,
    isStackMode: isStackMode,
    renderStepContent: renderStepContent,
    renderStepPlaceholder: renderStepPlaceholder,
    reset: reset
  }
})()

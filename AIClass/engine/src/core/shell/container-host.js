// ContainerHost — 委托 CourseContainer，维护 module 映射
;(function () {
  var flowEl = null
  var openContainers = {}
  var splitLayoutStageLocked = false

  function setFlowEl(el) {
    flowEl = el
  }

  // 题干固定 + 正文内滚：单题时锁 stage，多题叠放时解锁 stage 仅用于换题翻页
  function isInnerBodyScrollLayout(layout) {
    return layout === 'left-right' || layout === 'top-split' || layout === 'text-only'
  }

  function lockStageForInnerBodyScroll() {
    if (splitLayoutStageLocked) return
    var stage = document.querySelector('.lf-stage')
    if (!stage || !window.AIClassStageScrollLock) return
    AIClassStageScrollLock.lock(stage)
    splitLayoutStageLocked = true
  }

  function unlockStageForInnerBodyScroll() {
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
      unlockStageForInnerBodyScroll()
      return
    }
    flowEl.classList.remove('course-flow--stack')
    flowEl.style.removeProperty('--cc-stack-panel-min')
    var only = flowEl.querySelector('.course-container')
    if (only && isInnerBodyScrollLayout(only.getAttribute('data-layout'))) {
      lockStageForInnerBodyScroll()
    }
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
      source: meta.source != null ? meta.source : null,
      difficulty: meta.difficulty != null ? meta.difficulty : null,
      difficultyMax: meta.difficultyMax != null ? meta.difficultyMax : null,
      problemBrief: meta.problemBrief || null,
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
    if (isInnerBodyScrollLayout(meta.layout) && Object.keys(openContainers).length === 1) {
      lockStageForInnerBodyScroll()
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
      } else if (container.layout === 'top-split' &&
                 stepDef.sideEffectStepIds && stepDef.sideEffectStepIds.length) {
        // 仅 top-split（计算讲解）使用全量 sideEffect ids + retainPush 清左侧；
        // 其他布局（left-right / text-only / figure-text…）只清当前步，保证讲解链向下累加。
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
        desc: stepDef.guidanceDesc,
        sub: stepDef.guidanceSub
      })
    }
    if (stepDef && stepDef.problemBrief &&
        typeof container.setProblemBriefState === 'function') {
      container.setProblemBriefState(stepDef.problemBrief)
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
      if (window.AIClassCalcLineFit && typeof window.AIClassCalcLineFit.applyAfterRender === 'function') {
        window.AIClassCalcLineFit.applyAfterRender(container.getElement())
      }
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

    if (stepDef && stepDef.problemBrief) {
      /* problemBrief 已在审题环节内更新，不插入 action 占位文字 */
      container.finalizeInteractions(stepMeta.stepId)
      return interleavedGuideAnchor(container, stepDef.group)
    }

    if (stepDef && stepDef.guidanceDesc != null) {
      /* 仅更新大纲 desc 的步骤：不插入正文占位文字 */
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
        } else if (typeof el._stemZoomTeardown === 'function') {
          el._stemZoomTeardown()
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
    unlockStageForInnerBodyScroll()
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

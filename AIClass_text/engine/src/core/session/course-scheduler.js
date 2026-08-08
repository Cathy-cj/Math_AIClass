// 模块调度器：线性讲课 session（boot）+ 步骤顺序校验 + 容器编排
// help / _getScrollIndex → getActionCatalog()（index.html 目录）
;(function () {
  var STATE_IDLE = 'idle'
  var STATE_ACTIVE = 'active'
  var STATE_PAUSED = 'paused'

  function hintExpectedStep(action) {
    return action ? '期待步骤：' + action : ''
  }

  function clonePointer(ptr) {
    return ptr ? {
      moduleId: ptr.moduleId,
      containerIdx: ptr.containerIdx,
      stepIdx: ptr.stepIdx,
      stepId: ptr.stepId
    } : null
  }

  // sideEffect 重定向：某模块的 sideEffect 步骤可重定向到另一个 retry 模块渲染。
  // 配置来自 LESSON_META.sideEffectRetarget（数组），每项：
  //   { fromModule, matchAction(RegExp|str)|matchActionPrefix(str), retryModule, retryContainerId,
  //     defaultScroll, actionScroll({ actionName: scrollCfg }) }
  function lessonMeta() { return window.LESSON_META || null }

  function matchesRetargetAction(cfg, actionName) {
    if (typeof actionName !== 'string') return false
    if (cfg.matchAction instanceof RegExp) return cfg.matchAction.test(actionName)
    if (typeof cfg.matchAction === 'string') return actionName === cfg.matchAction
    if (typeof cfg.matchActionPrefix === 'string') return actionName.indexOf(cfg.matchActionPrefix) === 0
    return false
  }

  function resolveRetargetScroll(cfg, actionName, scrollCfg) {
    if (scrollCfg) return scrollCfg
    var perAction = cfg.actionScroll || {}
    if (perAction[actionName]) return perAction[actionName]
    return cfg.defaultScroll || null
  }

  function resolveRetargetTarget(scheduler, meta) {
    if (!meta || !meta.sideEffect || !scheduler) return null
    var cfgs = (lessonMeta() || {}).sideEffectRetarget
    if (!cfgs || !cfgs.length) return null
    for (var i = 0; i < cfgs.length; i++) {
      var cfg = cfgs[i]
      if (!cfg || cfg.fromModule !== meta.moduleId) continue
      if (!matchesRetargetAction(cfg, meta.action)) continue
      var containerRecord = scheduler.host.get(cfg.retryModule, 0)
      if (!containerRecord || !containerRecord.container) return null
      return {
        renderMeta: Object.assign({}, meta, {
          moduleId: cfg.retryModule,
          containerIdx: 0,
          containerId: cfg.retryContainerId,
          scroll: resolveRetargetScroll(cfg, meta.action, meta.scroll)
        }),
        containerRecord: containerRecord,
        fxModuleId: cfg.fromModule
      }
    }
    return null
  }

  function isInterleavedContainer(containerRecord) {
    var container = containerRecord && containerRecord.container
    return !!(container && container.guidanceLayout === 'interleaved')
  }

  function applyDefaultScrollOpts(containerRecord, scrollOpts, meta) {
    if (meta && meta.scroll) return scrollOpts
    scrollOpts = scrollOpts || {}
    if (isInterleavedContainer(containerRecord)) {
      scrollOpts.preserveScroll = false
      if (scrollOpts.topPadding == null) scrollOpts.topPadding = 20
      return scrollOpts
    }
    var hasPush = meta && meta.push && meta.push.length
    if (!hasPush && meta && meta.sideEffect && meta.retainPush) {
      hasPush = true
    }
    scrollOpts.preserveScroll = !hasPush
    return scrollOpts
  }

  function resolveScrollOpts(containerRecord, scrollCfg) {
    if (!scrollCfg || !containerRecord) return {}
    var opts = {}
    if (scrollCfg.alignStart) opts.alignStart = true
    if (scrollCfg.past) {
      var root = containerRecord.el
      if (scrollCfg.within && root && root.querySelector) {
        var scope = root.querySelector(scrollCfg.within)
        if (scope) root = scope
      }
      if (root && root.querySelector) {
        var pastEl = root.querySelector(scrollCfg.past)
        if (pastEl) opts.scrollPastEl = pastEl
      }
    }
    if (scrollCfg.gap != null) opts.scrollPastGap = scrollCfg.gap
    if (scrollCfg.topPadding != null) opts.topPadding = scrollCfg.topPadding
    if (scrollCfg.resetPast) opts.resetPast = true
    if (scrollCfg.preserve) opts.preserveScroll = true
    return opts
  }

  function followContent(containerRecord, anchorEl, opts) {
    if (!window.AIClassScrollFollow || !containerRecord) return
    opts = opts || {}
    if (opts.preserveScroll) {
      if (window.AIClassScrollFollow && typeof AIClassScrollFollow.stop === 'function') {
        AIClassScrollFollow.stop()
      }
      return
    }
    opts.stage = opts.stage ||
      document.getElementById('course-stack-stage') ||
      document.querySelector('.lf-stage')
    opts.pageEl = containerRecord.el
    var container = containerRecord.container
    if (container && typeof container.getFollowScrollEl === 'function') {
      var inner = container.getFollowScrollEl()
      // top-split：跟滚落在实际新增内容所在分栏（左算式 / 右要点）
      if (anchorEl && anchorEl.closest) {
        if (container.scrollLeftEl && container.scrollLeftEl.contains(anchorEl)) {
          inner = container.scrollLeftEl
        } else if (container.scrollRightEl && container.scrollRightEl.contains(anchorEl)) {
          inner = container.scrollRightEl
        }
      }
      if (inner) {
        opts.scrollEl = inner
        opts.layoutScrollEl = inner
      }
    }
    // 两层跟滚由 AIClassScrollFollow 自行判断：外层先把目标页滚进视窗，再内层跟到最新
    AIClassScrollFollow.follow(anchorEl || containerRecord.el, opts)
  }

  function CourseScheduler(deps) {
    this.router = deps.router
    this.registry = deps.registry
    this.host = deps.host
    this.index = deps.index
    this.log = deps.log

    this.session = 'boot'
    this.schedulerState = STATE_IDLE
    this.currentModuleId = null
    this.abandonedModules = {}
    this.executedStepIds = {}
    this.checkpoint = null
    this.pointer = null
    this.instanceCounter = 0
    this.conceptSheetOpenId = null
    this.photoAnswerTarget = null
  }

  CourseScheduler.prototype._moduleState = function (moduleId) {
    if (this.abandonedModules[moduleId]) return 'abandoned'
    if (this.currentModuleId === moduleId && this.pointer && this._isModuleComplete(moduleId)) {
      return 'complete'
    }
    if (this.currentModuleId === moduleId) return 'active'
    return 'idle'
  }

  CourseScheduler.prototype._getModule = function (moduleId) {
    return this.registry.getModule(moduleId)
  }

  CourseScheduler.prototype._findQaItem = function (mod, qaId) {
    var qaItems = mod.quickQA || []
    for (var i = 0; i < qaItems.length; i++) {
      if (qaItems[i].id === qaId) return qaItems[i]
    }
    return null
  }

  CourseScheduler.prototype._pointerFromMeta = function (meta) {
    return {
      moduleId: meta.moduleId,
      containerIdx: meta.containerIdx,
      stepIdx: meta.stepIdx,
      stepId: meta.stepId
    }
  }

  CourseScheduler.prototype._expectedMeta = function () {
    if (!this.pointer) return null
    var mod = this._getModule(this.pointer.moduleId)
    if (!mod) return null
    var container = mod.containers[this.pointer.containerIdx]
    if (!container) return null
    var step = container.steps[this.pointer.stepIdx]
    if (!step) return null
    return this.router.resolveStepId(step.id)
  }

  CourseScheduler.prototype._advancePointer = function () {
    var mod = this._getModule(this.pointer.moduleId)
    var container = mod.containers[this.pointer.containerIdx]
    var nextStepIdx = this.pointer.stepIdx + 1

    if (nextStepIdx < container.steps.length) {
      this.pointer.stepIdx = nextStepIdx
      this.pointer.stepId = container.steps[nextStepIdx].id
      return
    }

    var nextContainerIdx = this.pointer.containerIdx + 1
    if (nextContainerIdx < mod.containers.length) {
      this.pointer.containerIdx = nextContainerIdx
      this.pointer.stepIdx = 0
      this.pointer.stepId = mod.containers[nextContainerIdx].steps[0].id
      return
    }

    this.pointer = null
  }

  CourseScheduler.prototype._isModuleComplete = function (moduleId) {
    if (this.currentModuleId !== moduleId) return false
    return this.pointer === null && this.schedulerState === STATE_ACTIVE
  }

  CourseScheduler.prototype._moduleOrder = function () {
    return (this.router && this.router.moduleOrder) ? this.router.moduleOrder.slice() : []
  }

  CourseScheduler.prototype.getSession = function () {
    return this.session
  }

  CourseScheduler.prototype._firstModuleIdInOrder = function () {
    var order = this._moduleOrder()
    return order.length ? order[0] : null
  }

  CourseScheduler.prototype._nextModuleIdInOrder = function (moduleId) {
    var order = this._moduleOrder()
    var idx = order.indexOf(moduleId)
    if (idx < 0 || idx >= order.length - 1) return null
    return order[idx + 1]
  }

  CourseScheduler.prototype._firstStepIdOfModule = function (moduleId) {
    var mod = this._getModule(moduleId)
    if (!mod || !mod.containers.length) return null
    var container = mod.containers[0]
    if (!container.steps.length) return null
    return container.steps[0].id
  }

  CourseScheduler.prototype._nextStepIdAfter = function (meta) {
    var ptr = this._pointerFromMeta(meta)
    var mod = this._getModule(ptr.moduleId)
    var container = mod.containers[ptr.containerIdx]
    var nextStepIdx = ptr.stepIdx + 1

    if (nextStepIdx < container.steps.length) return container.steps[nextStepIdx].id

    var nextContainerIdx = ptr.containerIdx + 1
    if (nextContainerIdx < mod.containers.length) {
      return mod.containers[nextContainerIdx].steps[0].id
    }

    return this._firstStepIdOfModule(this._nextModuleIdInOrder(ptr.moduleId))
  }

  CourseScheduler.prototype._actionForStepId = function (stepId) {
    if (!stepId || !this.router || typeof this.router.resolveStepId !== 'function') return null
    var resolved = this.router.resolveStepId(stepId)
    return resolved && resolved.action ? resolved.action : null
  }

  CourseScheduler.prototype._isModuleOptional = function (moduleId) {
    var mod = this._getModule(moduleId)
    return !!(mod && mod.optional === true)
  }

  CourseScheduler.prototype._tryActivateNextModule = function (meta) {
    if (!this._isModuleComplete(this.currentModuleId)) return false

    var order = this._moduleOrder()
    var curIdx = order.indexOf(this.currentModuleId)
    var targetIdx = order.indexOf(meta.moduleId)
    if (curIdx < 0 || targetIdx < 0 || targetIdx <= curIdx) return false

    var i
    for (i = curIdx + 1; i < targetIdx; i++) {
      var midId = order[i]
      if (!this._isModuleOptional(midId)) return false
      if (!this.abandonedModules[midId]) {
        this.abandonedModules[midId] = true
        this.index.markAbandonedForModule(midId)
      }
    }

    this._activateModule(meta.moduleId)
    return true
  }

  CourseScheduler.prototype._getStepDef = function (moduleId, containerIdx, stepId) {
    var mod = this._getModule(moduleId)
    if (!mod) return null
    var container = mod.containers[containerIdx]
    if (!container) return null
    for (var i = 0; i < container.steps.length; i++) {
      if (container.steps[i].id === stepId) return container.steps[i]
    }
    return null
  }

  CourseScheduler.prototype._clonePush = function (push) {
    if (!push || !push.length) return []
    return JSON.parse(JSON.stringify(push))
  }

  CourseScheduler.prototype._ensureContainer = function (meta) {
    var existing = this.host.get(meta.moduleId, meta.containerIdx)
    if (existing) return existing

    this.instanceCounter += 1
    var instanceId = 'course-container-' + this.instanceCounter
    var mod = this._getModule(meta.moduleId)
    var containerDef = mod.containers[meta.containerIdx]

    var record = this.host.create({
      moduleId: meta.moduleId,
      containerId: meta.containerId,
      containerIdx: meta.containerIdx,
      instanceId: instanceId,
      layout: containerDef.layout || 'text-only',
      layoutParams: containerDef.layoutParams || {},
      style: containerDef.style || {},
      figure: containerDef.figure || null,
      textAccumulate: containerDef.textAccumulate === true,
      guidanceLayout: containerDef.guidanceLayout || 'interleaved',
      description: containerDef.description || containerDef.title,
      guidanceChain: containerDef.guidanceChain || null,
      head: containerDef.label || containerDef.head || null,
      difficulty: containerDef.difficulty != null ? containerDef.difficulty : null,
      difficultyMax: containerDef.difficultyMax != null ? containerDef.difficultyMax : null
    })

    var indexEntry = this.index.register({
      instanceId: instanceId,
      moduleId: meta.moduleId,
      moduleTitle: mod.title,
      containerId: meta.containerId,
      description: containerDef.description || containerDef.title,
      stepIds: containerDef.steps.map(function (s) { return s.id })
    })

    record.scrollIndex = indexEntry.index
    return record
  }

  CourseScheduler.prototype._activateModule = function (moduleId) {
    var mod = this._getModule(moduleId)
    if (!mod) return false
    this.currentModuleId = moduleId
    this.schedulerState = STATE_ACTIVE
    this.pointer = {
      moduleId: moduleId,
      containerIdx: 0,
      stepIdx: 0,
      stepId: mod.containers[0].steps[0].id
    }
    return true
  }

  CourseScheduler.prototype._fail = function (code, message, context, hint) {
    var ctx = Object.assign({
      schedulerState: this.schedulerState,
      moduleId: this.currentModuleId
    }, context || {})
    var expectedAction = ctx.expectedAction || null
    if (expectedAction) delete ctx.expectedAction
    if (ctx.nextAction) delete ctx.nextAction

    var err = {
      code: code,
      message: message,
      context: ctx,
      hint: hint || ''
    }
    if (expectedAction) err.expectedAction = expectedAction
    this.log.schedulerError(err)
    return { ok: false, code: code }
  }

  CourseScheduler.prototype._allowsConceptSheet = function () {
    return this.session === 'boot' && !!this.currentModuleId
  }

  function hideTitleScreen() {
    if (window.AIClassPreLessonFlow) {
      AIClassPreLessonFlow.onEnterBody()
    }
  }

  CourseScheduler.prototype._teardownConceptSheet = function (opts) {
    opts = opts || {}
    if (!window.AIClassConceptSheetFlow || !AIClassConceptSheetFlow.isOpen()) {
      this.conceptSheetOpenId = null
      return false
    }
    var id = this.conceptSheetOpenId
    var self = this
    var logPayload = {
      type: 'concept_sheet_dismissed',
      status: 'ok'
    }
    AIClassConceptSheetFlow.teardown(function () {
      self.conceptSheetOpenId = null
      self.log.post(logPayload)
    }, { immediate: opts.immediate === true })
    return true
  }

  CourseScheduler.prototype._autoDismissConceptSheetForMainStep = function (actionName, meta) {
    if (!this.conceptSheetOpenId) return
    if (!this._allowsConceptSheet()) return
    if (!meta || !meta.moduleId) return
    if (!this._getModule(meta.moduleId)) return
    this._teardownConceptSheet({
      autoDismiss: true,
      immediate: true,
      reason: 'main_step',
      triggerAction: actionName
    })
  }

  CourseScheduler.prototype.runSideEffect = function (actionName) {
    var meta = this.router.resolveAction(actionName)
    if (!meta || !meta.sideEffect) {
      return this._fail('INVALID_SIDE_ACTION', '非 sideEffect action: ' + actionName, {
        receivedAction: actionName
      })
    }

    var retryTarget = resolveRetargetTarget(this, meta)
    var renderMeta = retryTarget ? retryTarget.renderMeta : meta

    if (this.schedulerState === STATE_PAUSED) {
      return this._fail('PAUSED_NO_STEP', 'paused 状态下不能执行 sideEffect', {
        receivedAction: actionName
      })
    }

    if (renderMeta.anchorStepId && !this.executedStepIds[renderMeta.anchorStepId]) {
      var anchorAction = this._actionForStepId(renderMeta.anchorStepId)
      return this._fail('ANCHOR_NOT_READY', '前置步骤尚未完成', {
        receivedAction: actionName,
        expectedAction: anchorAction
      }, anchorAction
        ? hintExpectedStep(anchorAction)
        : '请先完成前置步骤')
    }

    if (this.currentModuleId && this.currentModuleId !== renderMeta.moduleId) {
      if (!retryTarget) {
        return this._fail('WRONG_MODULE', 'sideEffect 与当前模块不一致', {
          receivedAction: actionName,
          currentModuleId: this.currentModuleId,
          moduleId: renderMeta.moduleId
        })
      }
    }

    var containerRecord = retryTarget
      ? retryTarget.containerRecord
      : this.host.get(renderMeta.moduleId, renderMeta.containerIdx)
    if (!containerRecord) {
      return this._fail('CONTAINER_NOT_READY', 'sideEffect 目标容器尚未创建', {
        receivedAction: actionName,
        moduleId: renderMeta.moduleId,
        containerIdx: renderMeta.containerIdx
      }, '请先完成该模块入口及前序步骤')
    }

    var push = renderMeta.push && renderMeta.push.length ? this._clonePush(renderMeta.push) : null
    var fxModuleId = retryTarget ? retryTarget.fxModuleId : renderMeta.moduleId
    var mod = this._getModule(fxModuleId)
    var sideEffectStepIds = (mod && mod.sideEffects)
      ? mod.sideEffects.map(function (fx) { return fx.id || fx.action })
      : []
    hideTitleScreen()
    var anchorEl = this.host.renderStepContent(containerRecord, renderMeta, push, {
      push: push,
      figure: renderMeta.figure,
      group: renderMeta.group,
      guidanceSub: renderMeta.guidanceSub,
      retainPush: renderMeta.retainPush,
      stemClass: renderMeta.stemClass || null,
      sideEffectStepIds: sideEffectStepIds
    })

    var scrollOpts = resolveScrollOpts(containerRecord, renderMeta.scroll)
    scrollOpts = applyDefaultScrollOpts(containerRecord, scrollOpts, renderMeta)
    followContent(containerRecord, anchorEl, scrollOpts)

    if (retryTarget) {
      this.currentModuleId = retryTarget.renderMeta.moduleId
    }

    this.log.post({
      type: 'side_effect_ok',
      status: 'ok'
    })

    return { ok: true, sideEffect: true, action: actionName, retargeted: !!retryTarget }
  }

  CourseScheduler.prototype.runStep = function (actionName, params) {
    if (this.schedulerState === STATE_PAUSED) {
      return this._fail('PAUSED_NO_STEP', 'paused 状态下不能执行步骤，请先 resume 或仅 scrollTo', {
        receivedAction: actionName
      }, '调用 _resume 后再执行步骤')
    }

    var meta = this.router.resolveAction(actionName)
    if (!meta) {
      return this._fail('INVALID_ACTION', '未知 action: ' + actionName, {
        receivedAction: actionName
      }, '请发送 action help 核对名称')
    }

    this._autoDismissConceptSheetForMainStep(actionName, meta)

    if (meta.sideEffect) {
      return this.runSideEffect(actionName)
    }

    if (this.abandonedModules[meta.moduleId]) {
      return this._fail('MODULE_ABANDONED', '模块已放弃，不能再执行步骤', {
        receivedAction: actionName,
        moduleId: meta.moduleId
      })
    }

    if (this.executedStepIds[meta.stepId]) {
      var dupExpected = this._expectedMeta()
      var dupNextAction = dupExpected ? dupExpected.action : null
      return this._fail('DUPLICATE', '步骤已执行，不能重复调用', {
        receivedAction: actionName,
        expectedAction: dupNextAction
      }, dupNextAction
        ? '请勿重复。' + hintExpectedStep(dupNextAction)
        : '该步骤已完成；复习请用 _pause + _scrollTo，不要重跑步骤')
    }

    if (this.schedulerState === STATE_IDLE || this.currentModuleId === null) {
      // 独立课件/调试模式允许从任意模块入口直接开始，不强制经过全课第一个模块。
      // 模块内部仍由下方 expected 校验保证必须从该模块首步开始。
      this._activateModule(meta.moduleId)
    } else if (this.currentModuleId !== meta.moduleId) {
      var targetFirstStepId = this._firstStepIdOfModule(meta.moduleId)
      if (meta.stepId === targetFirstStepId) {
        // 点击另一模块的入口 action 即显式切课，不要求先完成当前模块。
        this.switchModule(meta.moduleId)
      } else if (!this._tryActivateNextModule(meta)) {
        var stayExpected = this._expectedMeta()
        var stayAction = stayExpected ? stayExpected.action : null
        return this._fail('WRONG_MODULE', '当前模块与 action 所属模块不一致', {
          receivedAction: actionName,
          currentModuleId: this.currentModuleId,
          moduleId: meta.moduleId,
          expectedAction: stayAction
        }, stayAction
          ? hintExpectedStep(stayAction)
          : '请先完成当前模块，或改发其他模块的入口 action')
      }
    }

    var expected = this._expectedMeta()
    if (!expected) {
      return this._fail('MODULE_COMPLETE', '当前模块已全部完成', {
        receivedAction: actionName,
        moduleId: meta.moduleId
      }, '请进入下一教学模块，或发送下一模块的入口 action')
    }

    if (expected.stepId !== meta.stepId) {
      return this._fail('SKIP_STEP', '步骤顺序有误', {
        receivedAction: actionName,
        expectedAction: expected.action,
        moduleId: meta.moduleId
      }, hintExpectedStep(expected.action))
    }

    if (this.pointer.containerIdx !== meta.containerIdx) {
      return this._fail('CONTAINER_NOT_READY', '当前容器尚未完成', {
        receivedAction: actionName,
        expectedAction: expected.action,
        containerIdx: this.pointer.containerIdx
      }, hintExpectedStep(expected.action) || '请先完成当前容器的前序步骤')
    }

    var isNewContainer = !this.host.get(meta.moduleId, meta.containerIdx)
    hideTitleScreen()
    var containerRecord = this._ensureContainer(meta)
    var stepDef = this._getStepDef(meta.moduleId, meta.containerIdx, meta.stepId)
    var push = stepDef && stepDef.push && stepDef.push.length ? this._clonePush(stepDef.push) : null
    var anchorEl = this.host.renderStepContent(containerRecord, meta, push, stepDef)
    this.executedStepIds[meta.stepId] = true
    this.index.markStepComplete(containerRecord.scrollIndex, meta.stepId)
    this.index.setLatest(containerRecord.scrollIndex)

    var scrollOpts = resolveScrollOpts(containerRecord, stepDef && stepDef.scroll)
    if (isNewContainer) {
      var inStack = this.host && typeof this.host.isStackMode === 'function' && this.host.isStackMode()
      scrollOpts.alignStart = scrollOpts.alignStart || !scrollOpts.resetPast || inStack
    }
    followContent(containerRecord, anchorEl, scrollOpts)

    var nextStepId = this._nextStepIdAfter(meta)
    var nextAction = this._actionForStepId(nextStepId)
    this.log.stepOk({
      action: actionName,
      stepId: meta.stepId,
      moduleId: meta.moduleId,
      session: this.session,
      nextAction: nextAction,
      nextStepId: nextStepId,
      scrollIndex: containerRecord.scrollIndex,
      schedulerState: this.schedulerState
    })

    this._advancePointer()
    return { ok: true, stepId: meta.stepId, nextStepId: nextStepId }
  }

  CourseScheduler.prototype.pause = function () {
    if (this.schedulerState !== STATE_ACTIVE || !this.pointer) {
      return this._fail('NOT_ACTIVE', '没有进行中的模块，无法 pause', {})
    }

    var containerRecord = this.host.get(this.pointer.moduleId, this.pointer.containerIdx)
    this.checkpoint = {
      moduleId: this.pointer.moduleId,
      containerIdx: this.pointer.containerIdx,
      nextStepId: this.pointer.stepId,
      scrollIndex: containerRecord ? containerRecord.scrollIndex : null
    }
    this.schedulerState = STATE_PAUSED
    this.log.post({
      type: 'scheduler_paused',
      status: 'ok'
    })
    return { ok: true, checkpoint: this.checkpoint }
  }

  CourseScheduler.prototype.resume = function () {
    if (this.schedulerState !== STATE_PAUSED || !this.checkpoint) {
      return this._fail('NOT_PAUSED', '当前不在 paused 状态', {
        schedulerState: this.schedulerState
      })
    }

    this.schedulerState = STATE_ACTIVE
    this.log.post({
      type: 'scheduler_resumed',
      status: 'ok'
    })
    this.checkpoint = null
    return { ok: true }
  }

  CourseScheduler.prototype.scrollTo = function (index, options) {
    var result = this.index.scrollTo(index, options)
    if (!result.ok) {
      return this._fail('INVALID_INDEX', 'scrollTo 失败: ' + result.reason, {
        index: index
      })
    }
    this.log.scrollOk(result.index)
    return { ok: true, index: result.index }
  }

  CourseScheduler.prototype.switchModule = function (targetModuleId) {
    var mod = this._getModule(targetModuleId)
    if (!mod) {
      return this._fail('INVALID_MODULE', '未知模块: ' + targetModuleId, {})
    }

    if (this.currentModuleId && !this.abandonedModules[this.currentModuleId]) {
      this.abandonedModules[this.currentModuleId] = true
      this.index.markAbandonedForModule(this.currentModuleId)
    }

    this.schedulerState = STATE_ACTIVE
    this.checkpoint = null
    this._activateModule(targetModuleId)

    this.log.post({
      type: 'module_switched',
      status: 'ok'
    })
    return { ok: true, moduleId: targetModuleId, nextStepId: this.pointer.stepId }
  }

  CourseScheduler.prototype.getActionCatalog = function () {
    // 优先 index.html#lesson-action-catalog；无则由注册表生成扁平列表
    var catalog = window.LESSON_ACTION_CATALOG
    if (Array.isArray(catalog) && catalog.length) {
      return catalog.map(function (entry) {
        var item = {
          name: String(entry.name),
          params: Array.isArray(entry.params) ? entry.params.slice() : []
        }
        if (entry.description != null && entry.description !== '') {
          item.description = String(entry.description)
        }
        return item
      })
    }
    return this._actionCatalogFromRegistry()
  }

  CourseScheduler.prototype._registryActionMeta = function () {
    var actions = []

    this.registry.modules.forEach(function (mod) {
      mod.containers.forEach(function (c) {
        c.steps.forEach(function (s) {
          actions.push({
            name: s.action,
            description: s.description || ''
          })
        })
      })
      ;(mod.sideEffects || []).forEach(function (fx) {
        actions.push({
          name: fx.action,
          description: fx.description || ''
        })
      })
      ;(mod.quickQA || []).forEach(function (qa) {
        if (qa.showAction) actions.push({ name: qa.showAction, description: qa.question || '' })
        if (qa.answerAction) actions.push({ name: qa.answerAction, description: (qa.question || '') + ' → 答案' })
      })
    })

    if (this.registry && this.registry.conceptSheetCloseAction) {
      var closeAct = this.registry.conceptSheetCloseAction
      actions.push({
        name: closeAct,
        description: '收起底部概念插播抽屉'
      })
    }

    ;([{ name: '快问快答_关闭', description: '收起当前快问快答气泡' }]).forEach(function (item) {
      actions.push({ name: item.name, description: item.description || '' })
    })

    return {
      actions: actions
    }
  }

  CourseScheduler.prototype._actionCatalogFromRegistry = function () {
    var meta = this._registryActionMeta()
    var seen = {}
    var list = []

    function add(name, params, description) {
      if (!name || seen[name]) return
      seen[name] = true
      var item = { name: name, params: params || [] }
      if (description) item.description = description
      list.push(item)
    }

    meta.actions.forEach(function (a) {
      add(a.name, [], a.description || '')
    })
    return list
  }

  CourseScheduler.prototype._validateActionCatalog = function () {
    var catalog = window.LESSON_ACTION_CATALOG
    if (!Array.isArray(catalog) || !catalog.length) return

    var meta = this._registryActionMeta()
    var registryNames = {}
    meta.actions.forEach(function (a) { registryNames[a.name] = true })

    // 系统动作：运行时内部、不进作者目录，只要求可分发，不要求出现在目录里
    var systemNames = {}
    if (this.registry && this.registry.conceptSheetCloseAction) {
      systemNames[this.registry.conceptSheetCloseAction] = true
    }
    systemNames['快问快答_关闭'] = true

    // quickQA 打开/显示由 action-router 分发，但 _registryActionMeta 不枚举，视为合法目录项
    var knownNames = {}
    Object.keys(registryNames).forEach(function (n) { knownNames[n] = true })
    Object.keys(systemNames).forEach(function (n) { knownNames[n] = true })
    ;(this.registry.modules || []).forEach(function (mod) {
      ;(mod.quickQA || []).forEach(function (qa) {
        if (qa.openAction) knownNames[qa.openAction] = true
        if (qa.questionAction) knownNames[qa.questionAction] = true
      })
    })

    catalog.forEach(function (entry) {
      if (!knownNames[entry.name]) {
        console.warn('[lesson] action-catalog 含未注册 action:', entry.name)
      }
    })
    Object.keys(registryNames).forEach(function (name) {
      if (systemNames[name]) return
      var found = catalog.some(function (entry) { return entry.name === name })
      if (!found) {
        console.warn('[lesson] action-catalog 缺少 action:', name)
      }
    })
  }

  CourseScheduler.prototype.getHelpPayload = function () {
    var actions = []
    var allModules = []
    var qaCloseSeen = false

    this.registry.modules.forEach(function (mod) {
      var steps = []
      mod.containers.forEach(function (c) {
        c.steps.forEach(function (s) {
          var entry = {
            name: s.action,
            stepId: s.id,
            kind: s.kind,
            moduleId: mod.id,
            description: s.description || ''
          }
          actions.push(entry)
          steps.push({
            stepId: s.id,
            action: s.action,
            description: s.description || '',
            kind: s.kind
          })
        })
      })
      ;(mod.sideEffects || []).forEach(function (fx) {
        var fxEntry = {
          name: fx.action,
          stepId: fx.id || fx.action,
          kind: fx.kind || 'exercise',
          moduleId: mod.id,
          description: fx.description || '',
          sideEffect: true
        }
        actions.push(fxEntry)
        steps.push({
          stepId: fx.id || fx.action,
          action: fx.action,
          description: fx.description || '',
          kind: fx.kind || 'exercise',
          sideEffect: true
        })
      })

      var quickActions = {}
      ;(mod.quickQA || []).forEach(function (qa, index) {
        ;[
          {
            name: qa.openAction,
            stepId: '快问快答·打开',
            description: '打开快问快答'
          },
          {
            name: qa.questionAction,
            stepId: '快问快答·第' + (index + 1) + '题',
            description: qa.question || ''
          },
          {
            name: qa.answerAction,
            stepId: '快问快答·第' + (index + 1) + '题答案',
            description: qa.answer || ''
          }
        ].forEach(function (entry) {
          if (!entry.name || quickActions[entry.name]) return
          quickActions[entry.name] = true
          var qaEntry = {
            name: entry.name,
            stepId: entry.stepId,
            kind: 'quickQA',
            moduleId: mod.id,
            description: entry.description,
            quickQA: true
          }
          actions.push(qaEntry)
          steps.push({
            stepId: entry.stepId,
            action: entry.name,
            description: entry.description,
            kind: 'quickQA',
            quickQA: true
          })
        })
      })

      if ((mod.quickQA || []).length) {
        steps.push({
          stepId: '快问快答·关闭',
          action: '快问快答_关闭',
          description: '收起当前快问快答气泡',
          kind: 'quickQA'
        })
        if (!qaCloseSeen) {
          qaCloseSeen = true
          actions.push({
            name: '快问快答_关闭',
            stepId: '快问快答·关闭',
            kind: 'quickQA',
            moduleId: mod.id,
            description: '收起当前快问快答气泡'
          })
        }
      }

      allModules.push({
        moduleId: mod.id,
        title: mod.title,
        description: (mod.containers[0] && mod.containers[0].description) || mod.title,
        steps: steps
      })
    })

    if (this.registry && this.registry.conceptSheetCloseAction) {
      var closeAct = this.registry.conceptSheetCloseAction
      actions.push({
        name: closeAct,
        description: '收起底部概念插播抽屉',
        conceptSheet: true
      })
    }

    ;([{ name: '快问快答_关闭', description: '收起当前快问快答气泡' }]).forEach(function (item) {
      actions.push({
        name: item.name,
        description: item.description || '',
        quickQA: true
      })
    })

    var meta = window.LESSON_META || {}
    return {
      lesson: { id: meta.id, title: meta.title, tag: meta.tag },
      modules: allModules,
      actions: actions,
      scrollManifest: this.index.getManifest(),
      scrollPlan: this.registry.scrollPlan(),
      checkpoint: this.checkpoint ? clonePointer(this.checkpoint) : null,
      schedulerState: this.schedulerState,
      session: this.session,
      currentModuleId: this.currentModuleId,
      nextStepId: this.pointer ? this.pointer.stepId : null
    }
  }

  CourseScheduler.prototype._clearBody = function () {
    this.schedulerState = STATE_IDLE
    this.currentModuleId = null
    this.abandonedModules = {}
    this.executedStepIds = {}
    this.checkpoint = null
    this.pointer = null
    this.instanceCounter = 0
    this.photoAnswerTarget = null
    this.host.reset()
    this.index.reset()
    if (window.AIClassSceneBackground) {
      AIClassSceneBackground.clear()
    }
    if (window.AIClassScrollFollow) {
      AIClassScrollFollow.stop()
      if (typeof AIClassScrollFollow.resetScrollPast === 'function') {
        AIClassScrollFollow.resetScrollPast()
      }
    }
    var stage = document.querySelector('.lf-stage')
    if (stage) stage.scrollTop = 0
    return stage
  }

  CourseScheduler.prototype.reset = function () {
    if (this.conceptSheetOpenId && window.AIClassConceptSheetFlow && AIClassConceptSheetFlow.isOpen()) {
      AIClassConceptSheetFlow.teardown(null, { immediate: true })
    }
    this.conceptSheetOpenId = null
    var stage = this._clearBody()
    this.session = 'boot'
    if (window.AIClassPreLessonFlow) {
      AIClassPreLessonFlow.onReset(stage)
    }
  }

  CourseScheduler.prototype._resolveConceptSheetAction = function (actionName) {
    var reg = this.registry
    if (!reg) return null
    var closeAction = reg.conceptSheetCloseAction || '插播_关闭'
    if (actionName === closeAction) {
      return { type: 'close' }
    }

    if (!this._allowsConceptSheet()) return null

    var sheetEntry = reg.conceptSheetByAction(actionName)
    if (sheetEntry) {
      var sheetConfig = reg.resolveConceptSheetConfig(sheetEntry)
      if (sheetConfig) return { type: 'open', config: sheetConfig }
    }

    return null
  }

  CourseScheduler.prototype.showConceptSheet = function (config) {
    if (!this._allowsConceptSheet()) {
      return this._fail('NOT_IN_LINEAR_SESSION', '概念插播仅能在讲课过程中开启', {
        receivedAction: config.action,
        session: this.session
      }, '请先发送当前模块的入口 action')
    }
    if (!window.AIClassConceptSheetFlow) {
      return this._fail('CONCEPT_SHEET_NOT_LOADED', '概念插播组件未加载', {})
    }
    var mountConfig = {
      id: config.id || config.action,
      action: config.action,
      title: config.title,
      lines: config.lines || [],
      figure: config.figure,
      figureState: config.figureState,
      sequenceStates: config.sequenceStates || []
    }
    var mountResult
    try {
      mountResult = AIClassConceptSheetFlow.mount(mountConfig, {})
    } catch (err) {
      return this._fail('CONCEPT_SHEET_MOUNT_FAILED', err.message || String(err), {
        conceptId: mountConfig.id
      })
    }
    this.conceptSheetOpenId = String(mountConfig.id)
    this.log.post({
      type: mountResult && mountResult.updated ? 'concept_sheet_updated' : 'concept_sheet_shown',
      status: 'ok'
    })
    return {
      ok: true,
      conceptId: mountConfig.id,
      action: config.action,
      updated: !!(mountResult && mountResult.updated)
    }
  }

  CourseScheduler.prototype.dismissConceptSheet = function (actionName) {
    var id = this.conceptSheetOpenId
    if (!this._teardownConceptSheet({ triggerAction: actionName })) {
      return this._fail('CONCEPT_SHEET_NOT_OPEN', '概念插播未开启', {
        receivedAction: actionName
      })
    }
    return { ok: true, conceptId: id }
  }

  CourseScheduler.prototype.openQuickQA = function (meta) {
    if (!window.AIClassQuickQA) {
      return this._fail('QA_NOT_LOADED', '快问快答组件未加载', {})
    }
    var containerRecord = this.host.get(meta.moduleId, 0)
    if (!containerRecord) {
      return this._fail('CONTAINER_NOT_READY', '快问快答目标容器尚未创建', {
        moduleId: meta.moduleId
      }, '请先完成该模块入口步骤')
    }
    // 检查容器是否配置了顶部夹层模式
    var mod = this._getModule(meta.moduleId)
    var containerDef = mod && mod.containers && mod.containers[0]
    var useAboveBody = containerDef && containerDef.quickQALayout === 'above-body'

    var el
    if (useAboveBody) {
      el = window.AIClassQuickQA.mountAboveBody(containerRecord)
    } else {
      el = window.AIClassQuickQA.isMinimized()
        ? window.AIClassQuickQA.restore(containerRecord)
        : window.AIClassQuickQA.mount(containerRecord)
    }
    if (!el) {
      return this._fail('QA_MOUNT_FAILED', '快问快答挂载失败', {})
    }
    this.log.post({
      type: 'quick_qa_opened',
      status: 'ok'
    })
    return { ok: true }
  }

  CourseScheduler.prototype.showQuickQAQuestion = function (meta) {
    if (!window.AIClassQuickQA) {
      return this._fail('QA_NOT_LOADED', '快问快答组件未加载', {})
    }
    var mod = this._getModule(meta.moduleId)
    if (!mod) return this._fail('INVALID_MODULE', '未知模块: ' + meta.moduleId, {})
    var qaItem = this._findQaItem(mod, meta.qaId)
    if (!qaItem) return this._fail('INVALID_QA', '未找到快问快答: ' + meta.qaId, {})
    var containerRecord = this.host.get(meta.moduleId, 0)
    var el = window.AIClassQuickQA.showQuestion(containerRecord, qaItem)
    if (!el) {
      return this._fail('QA_MOUNT_FAILED', '快问快答问题挂载失败', {})
    }
    this.log.post({
      type: 'quick_qa_question_shown',
      status: 'ok'
    })
    return { ok: true, qaId: qaItem.id }
  }

  CourseScheduler.prototype.showQuickQAAnswer = function (meta) {
    if (!window.AIClassQuickQA || !window.AIClassQuickQA.isOpen()) {
      return this._fail('QA_NOT_OPEN', '快问快答未开启，无法显示答案', {})
    }
    var mod = this._getModule(meta.moduleId)
    if (!mod) return this._fail('INVALID_MODULE', '未知模块: ' + meta.moduleId, {})
    var qaItem = this._findQaItem(mod, meta.qaId)
    if (!qaItem) return this._fail('INVALID_QA', '未找到快问快答: ' + meta.qaId, {})
    window.AIClassQuickQA.showAnswer(qaItem)
    this.log.post({
      type: 'quick_qa_answer_shown',
      status: 'ok'
    })
    return { ok: true, qaId: qaItem.id }
  }

  CourseScheduler.prototype.dismissQuickQA = function () {
    if (!window.AIClassQuickQA || !window.AIClassQuickQA.isOpen()) {
      return this._fail('QA_NOT_OPEN', '快问快答未开启', {})
    }
    window.AIClassQuickQA.hide()
    this.log.post({
      type: 'quick_qa_hidden',
      status: 'ok'
    })
    return { ok: true }
  }

  CourseScheduler.prototype.showPhotoAnswer = function (actionName) {
    var meta = this.router.resolveAction(actionName)
    if (!meta || !meta.photoAnswer) {
      return this._fail('INVALID_PHOTO_ACTION', '非拍照作答 action: ' + actionName, {
        receivedAction: actionName
      })
    }
    if (this.currentModuleId !== meta.moduleId) {
      return this._fail('WRONG_MODULE', '拍照作答与当前练习题不一致', {
        receivedAction: actionName,
        currentModuleId: this.currentModuleId,
        moduleId: meta.moduleId
      })
    }
    if (meta.anchorStepId && !this.executedStepIds[meta.anchorStepId]) {
      return this._fail('ANCHOR_NOT_READY', '练习题尚未显示，不能拍照作答', {
        receivedAction: actionName,
        expectedAction: this._actionForStepId(meta.anchorStepId)
      })
    }
    var record = this.host.get(meta.moduleId, meta.containerIdx)
    if (!record) {
      return this._fail('CONTAINER_NOT_READY', '练习题容器尚未创建', {
        receivedAction: actionName,
        moduleId: meta.moduleId,
        containerIdx: meta.containerIdx
      })
    }
    var card = record.container.showPhotoAnswer(function () {
      if (window.AIClassCoursewareSubmit) {
        AIClassCoursewareSubmit.requestPhoto()
      }
    })
    if (!card) {
      return this._fail('PHOTO_ANSWER_MOUNT_FAILED', '拍照作答区域无法挂载', {
        receivedAction: actionName
      })
    }
    this.photoAnswerTarget = {
      action: actionName,
      moduleId: meta.moduleId,
      containerIdx: meta.containerIdx
    }
    this.log.post({
      type: 'side_effect_ok',
      status: 'ok'
    })
    return { ok: true, action: actionName }
  }

  CourseScheduler.prototype.showPhotoResult = function (value) {
    if (value == null) {
      return this._fail('INVALID_PARAMS', 'photo_result 需要 value', {
        receivedType: 'photo_result'
      })
    }
    var target = this.photoAnswerTarget
    var record = target && this.host.get(target.moduleId, target.containerIdx)
    if (!record) {
      return this._fail('CONTAINER_NOT_READY', '当前没有可回显拍照结果的练习题容器', {
        receivedType: 'photo_result'
      })
    }
    if (!record.container.showPhotoResult(String(value))) {
      return this._fail('PHOTO_RESULT_MOUNT_FAILED', '作答结果区域尚未显示', {
        receivedType: 'photo_result',
        action: target.action
      })
    }
    this.log.post({
      type: 'answer_result_shown',
      status: 'ok'
    })
    return { ok: true, action: target.action }
  }

  CourseScheduler.prototype.dispatch = function (actionName, params) {
    params = params || {}

    if (actionName === '_pause') return this.pause()
    if (actionName === '_resume') return this.resume()
    if (actionName === '_scrollTo') return this.scrollTo(params.index, params)
    if (actionName === '_switchModule') {
      return this.switchModule(params.moduleId)
    }
    if (actionName === '_getScrollIndex' || actionName === 'help') {
      var payload = this.getHelpPayload()
      this.log.post({
        type: 'help',
        status: 'ok',
        data: payload
      })
      return { ok: true, data: payload }
    }
    if (actionName === 'course:reset' || actionName === '清空课件') {
      this.reset()
      this.log.post({ type: 'course_reset', status: 'ok' })
      return { ok: true }
    }
    var conceptResolved = this._resolveConceptSheetAction(actionName)
    if (conceptResolved) {
      if (conceptResolved.type === 'close') {
        return this.dismissConceptSheet(actionName)
      }
      return this.showConceptSheet(conceptResolved.config)
    }

    // Q&A 动作拦截
    var qaMeta = this.router.resolveAction(actionName)
    if (qaMeta && qaMeta.qa) {
      if (qaMeta.qaType === 'open') return this.openQuickQA(qaMeta)
      if (qaMeta.qaType === 'question') return this.showQuickQAQuestion(qaMeta)
      if (qaMeta.qaType === 'answer') return this.showQuickQAAnswer(qaMeta)
      if (qaMeta.qaType === 'close') return this.dismissQuickQA()
    }
    if (qaMeta && qaMeta.photoAnswer) return this.showPhotoAnswer(actionName)

    return this.runStep(actionName, params)
  }

  window.AIClassCourseScheduler = CourseScheduler
})()

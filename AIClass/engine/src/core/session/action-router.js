// action 中文名 ↔ stepId 路由索引
;(function () {
  function buildIndexes(modules) {
    var byAction = {}
    var byStepId = {}
    var moduleOrder = []

    modules.forEach(function (mod) {
      moduleOrder.push(mod.id)
      mod.containers.forEach(function (container, containerIdx) {
        container.steps.forEach(function (step, stepIdx) {
          var meta = {
            moduleId: mod.id,
            moduleTitle: mod.title,
            containerId: container.id,
            containerIdx: containerIdx,
            containerTitle: container.title,
            containerDescription: container.description || container.title,
            stepId: step.id,
            stepIdx: stepIdx,
            kind: step.kind,
            action: step.action,
            sideEffect: false
          }
          byAction[step.action] = meta
          byStepId[step.id] = meta
        })
      })
      ;(mod.sideEffects || []).forEach(function (fx) {
        var containerIdx = fx.containerIdx != null ? fx.containerIdx : 0
        var container = mod.containers[containerIdx] || {}
        var meta = {
          moduleId: mod.id,
          moduleTitle: mod.title,
          containerId: fx.containerId || container.id,
          containerIdx: containerIdx,
          containerTitle: container.title,
          containerDescription: container.description || container.title,
          stepId: fx.id || fx.action,
          stepIdx: -1,
          kind: fx.kind || 'exercise',
          action: fx.action,
          sideEffect: true,
          anchorStepId: fx.anchorStepId || null,
          push: fx.push || [],
          figure: fx.figure || null,
          group: fx.group != null ? fx.group : null,
          guidanceDesc: fx.guidanceDesc != null ? fx.guidanceDesc : null,
          guidanceSub: fx.guidanceSub != null ? fx.guidanceSub : null,
          problemBrief: fx.problemBrief || null,
          retainPush: fx.retainPush || null,
          scroll: fx.scroll || null,
          stemClass: fx.stemClass || null
        }
        byAction[fx.action] = meta
      })
    })

    // Q&A 动作注册（在 sideEffects 之后）
    var hasQuickQA = false
    modules.forEach(function (mod) {
      ;(mod.quickQA || []).forEach(function (qa) {
        hasQuickQA = true
        if (qa.openAction) {
          byAction[qa.openAction] = {
            moduleId: mod.id,
            containerIdx: 0,
            action: qa.openAction,
            qa: true,
            qaType: 'open',
            qaId: qa.id
          }
        }
        if (qa.questionAction) {
          byAction[qa.questionAction] = {
            moduleId: mod.id,
            containerIdx: 0,
            action: qa.questionAction,
            qa: true,
            qaType: 'question',
            qaId: qa.id
          }
        }
        if (qa.answerAction) {
          byAction[qa.answerAction] = {
            moduleId: mod.id,
            containerIdx: 0,
            action: qa.answerAction,
            qa: true,
            qaType: 'answer',
            qaId: qa.id
          }
        }
      })
    })
    if (hasQuickQA) {
      byAction['快问快答_关闭'] = { qa: true, qaType: 'close' }
    }

    return { byAction: byAction, byStepId: byStepId, moduleOrder: moduleOrder }
  }

  function init(registry) {
    var modules = registry && registry.modules ? registry.modules : []
    var indexes = buildIndexes(modules)
    return {
      byAction: indexes.byAction,
      byStepId: indexes.byStepId,
      moduleOrder: indexes.moduleOrder,

      resolveAction: function (actionName) {
        return indexes.byAction[actionName] || null
      },

      resolveStepId: function (stepId) {
        return indexes.byStepId[stepId] || null
      },

      isSystemAction: function (actionName) {
        return typeof actionName === 'string' && actionName.charAt(0) === '_'
      }
    }
  }

  window.AIClassActionRouter = {
    init: init,
    buildIndexes: buildIndexes
  }
})()

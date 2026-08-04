// 互动提交快照 — 从 push 块组装 question / response / context 供父容器与 Agent 读取
;(function () {
  function submitContext(block) {
    var ctx = { action: null, moduleId: null, stepId: null }
    var sched = window.__courseScheduler
    if (sched && sched.currentModuleId) ctx.moduleId = sched.currentModuleId
    if (block && block.logAction) {
      ctx.action = block.logAction
    } else if (block && block.__stepId && sched && typeof sched._actionForStepId === 'function') {
      ctx.action = sched._actionForStepId(block.__stepId)
    }
    if (block && block.__stepId) ctx.stepId = block.__stepId
    return ctx
  }

  function normalizeChoiceResponse(value, multiple) {
    if (value == null) {
      return { value: multiple ? [] : null }
    }
    if (typeof value === 'object' && !Array.isArray(value) && value.option != null) {
      var out = { value: value.option }
      if (value.option_id != null) out.optionId = value.option_id
      return out
    }
    if (typeof value === 'string' && !multiple && window.AIClassSubmitText) {
      var fmt = window.AIClassSubmitText
      if (value.indexOf(fmt.SEP_PAIR) >= 0 && typeof fmt.parseChoice === 'function') {
        return { value: fmt.parseChoice(value).option }
      }
    }
    if (multiple) {
      var list = Array.isArray(value) ? value : [value]
      return { value: list.map(function (item) { return String(item) }) }
    }
    return { value: value != null ? String(value) : null }
  }

  function buildChoiceQuestion(block) {
    block = block || {}
    var question = {
      blockType: 'choice',
      prompt: block.prompt || block.question || null,
      options: (block.options || []).slice(),
      multiple: !!block.multiple
    }
    if (block.id) question.blockId = block.id
    if (block.answer != null) question.answer = block.answer
    return question
  }

  function buildFillQuestion(block) {
    block = block || {}
    var question = {
      blockType: 'fill',
      prompt: block.prompt || block.question || null,
      parts: (block.parts || []).map(function (part) {
        part = part || {}
        if (part.kind === 'blank' || part.type === 'blank') {
          var blank = { kind: 'blank' }
          if (part.id) blank.id = part.id
          if (part.placeholder) blank.placeholder = part.placeholder
          if (part.label) blank.label = part.label
          if (part.formula) blank.formula = part.formula
          if (part.hint) blank.hint = part.hint
          if (part.answer != null) blank.answer = part.answer
          return blank
        }
        return {
          kind: 'text',
          value: part.value != null ? String(part.value) : ''
        }
      })
    }
    if (block.id) question.blockId = block.id
    if (block.answer != null) question.answer = block.answer
    return question
  }

  function buildFillResponse(value) {
    var values = Array.isArray(value) ? value : [value]
    return {
      values: values.map(function (item) {
        return item != null ? String(item).trim() : ''
      })
    }
  }

  function legacyFillAnswer(value) {
    var values = Array.isArray(value) ? value : [value]
    return {
      answer: values.map(function (item) {
        return { value: String(item), input_type: 'TEXT' }
      })
    }
  }

  function buildChoicePayload(value, block) {
    var question = buildChoiceQuestion(block)
    return {
      context: submitContext(block),
      question: question,
      response: normalizeChoiceResponse(value, question.multiple)
    }
  }

  function buildFillPayload(value, block) {
    var legacy = legacyFillAnswer(value)
    return {
      context: submitContext(block),
      question: buildFillQuestion(block),
      response: buildFillResponse(value),
      answer: legacy.answer
    }
  }

  window.AIClassInteractionSnapshot = {
    submitContext: submitContext,
    buildChoicePayload: buildChoicePayload,
    buildFillPayload: buildFillPayload
  }
})()

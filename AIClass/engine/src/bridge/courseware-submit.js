// 互动提交默认桥 — 统一上行 user_submitted；父容器可预先注入覆盖
;(function () {
  if (window.AIClassCoursewareSubmit) return

  function postUserSubmitted(body) {
    if (!body || body.value == null) return
    if (window.AIClassExecutionLog && typeof AIClassExecutionLog.post === 'function') {
      AIClassExecutionLog.post(Object.assign({ type: 'user_submitted', status: 'ok' }, body))
    }
  }

  function resolveAction(envelope, block) {
    if (block && block.logAction) return block.logAction
    if (envelope && envelope.context && envelope.context.action) return envelope.context.action
    if (block && block.id) return block.id
    return null
  }

  function formatValue(kind, envelope, rawValue, block) {
    var fmt = window.AIClassSubmitText
    if (!fmt) return rawValue == null ? '' : String(rawValue)

    if (kind === 'choice') {
      // value 只上报学生所选选项值，不再拼「值｜文案」
      var selected = rawValue
      if (envelope && envelope.response && envelope.response.value != null) {
        selected = envelope.response.value
      }
      if (typeof selected === 'string' && fmt.parseChoice && selected.indexOf(fmt.SEP_PAIR) >= 0) {
        selected = fmt.parseChoice(selected).option
      }
      if (typeof selected === 'object' && selected != null && selected.option != null) {
        selected = selected.option
      }
      if (Array.isArray(selected)) selected = selected.length ? selected[0] : ''
      return selected == null ? '' : String(selected)
    }
    if (kind === 'fill') return fmt.formatFill(rawValue)
    if (kind === 'handwriting') return fmt.formatHandwriting(rawValue)
    if (kind === 'matching') {
      var pair = (rawValue && rawValue.pair) || rawValue || []
      return Array.isArray(pair)
        ? pair.map(function (item) { return fmt.ensureString(item) }).join(fmt.SEP_ITEM)
        : fmt.ensureString(pair)
    }
    return fmt.ensureString(rawValue)
  }

  function buildUserSubmitted(kind, envelope, rawValue, block) {
    envelope = envelope || {}
    var body = {
      kind: kind,
      action: resolveAction(envelope, block),
      value: formatValue(kind, envelope, rawValue, block)
    }
    if (envelope.context && Object.keys(envelope.context).length) {
      body.context = envelope.context
    }
    if (envelope.question) body.question = envelope.question
    if (envelope.response) body.response = envelope.response
    return body
  }

  function submit(kind, envelope, rawValue, block) {
    postUserSubmitted(buildUserSubmitted(kind, envelope, rawValue, block))
  }

  function fromFillValue(value) {
    var answers = Array.isArray(value) ? value : [value]
    return {
      answer: answers.map(function (item) {
        return { value: String(item), input_type: 'TEXT' }
      })
    }
  }

  window.AIClassCoursewareSubmit = {
    postUserSubmitted: postUserSubmitted,
    buildUserSubmitted: buildUserSubmitted,
    submitInteraction: submit,
    fromFillValue: fromFillValue,
    fromHandwritingValue: function (value) {
      return window.AIClassSubmitText
        ? AIClassSubmitText.formatHandwriting(value)
        : String(value == null ? '' : value)
    },
    submitHandwriting: function (payload, rawValue, block) {
      if (typeof payload === 'string' || payload == null) {
        rawValue = payload
        payload = {}
      }
      submit('handwriting', payload, rawValue, block)
    },
    submitSingleChoice: function (payload, rawValue, block) {
      submit('choice', payload, rawValue, block)
    },
    submitMultipleChoice: function (payload, rawValue, block) {
      submit('choice', payload, rawValue, block)
    },
    submitFillBlank: function (payload, rawValue, block) {
      submit('fill', payload || {}, rawValue, block)
    },
    submitMatching: function (payload, block) {
      submit('matching', {}, payload, block)
    }
  }
})()

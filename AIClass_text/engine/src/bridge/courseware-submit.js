// 互动提交默认桥 — 统一上行 user_submitted；父容器可预先注入覆盖
;(function () {
  if (window.AIClassCoursewareSubmit) return

  function postUserSubmitted(body) {
    if (!body || !body.kind) return
    if (body.kind !== 'course_photo' && body.value == null) return
    if (window.AIClassExecutionLog && typeof AIClassExecutionLog.post === 'function') {
      AIClassExecutionLog.post(Object.assign({ type: 'user_submitted' }, body))
    }
  }

  function protocolKind(kind) {
    var map = {
      choice: 'course_choice',
      fill: 'course_fill',
      matching: 'course_fill',
      oral: 'voice',
      photo: 'course_photo'
    }
    return map[kind] || kind
  }

  function formatValue(kind, envelope, rawValue, block) {
    var fmt = window.AIClassSubmitText
    if (!fmt) return rawValue == null ? '' : String(rawValue)

    if (kind === 'choice') {
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
    return {
      kind: protocolKind(kind),
      value: formatValue(kind, envelope, rawValue, block)
    }
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
    requestPhoto: function () {
      postUserSubmitted({ kind: 'course_photo' })
    },
    fromFillValue: fromFillValue,
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

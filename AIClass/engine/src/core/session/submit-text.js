// 互动提交文本化 — 选择题含「选项值｜选项文案」，全部上报为单一字符串
;(function () {
  var SEP_ITEM = '；'
  var SEP_PAIR = '｜'

  function normalizeOptions(options) {
    if (window.AIClassComponent && window.AIClassComponent._option) {
      return window.AIClassComponent._option.normalizeAll(options || [])
    }
    return (options || []).map(function (opt, index) {
      var label = typeof opt === 'string' ? opt : (opt && (opt.label || opt.text)) || ''
      return { value: String(index + 1), label: label, id: String(index + 1) }
    })
  }

  function findItem(items, value) {
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].value) === String(value)) return items[i]
    }
    return null
  }

  function formatChoiceItem(value, items) {
    var item = findItem(items, value)
    var opt = String(value == null ? '' : value)
    var label = item ? String(item.label != null ? item.label : item.value != null ? item.value : opt) : opt
    return opt + SEP_PAIR + label
  }

  function formatChoice(selected, options, multiple) {
    var items = normalizeOptions(options)
    if (multiple) {
      var list = Array.isArray(selected) ? selected : (selected == null ? [] : [selected])
      return list
        .filter(function (v) { return v != null && v !== '' })
        .map(function (v) { return formatChoiceItem(v, items) })
        .join(SEP_ITEM)
    }
    if (selected == null || selected === '') return ''
    return formatChoiceItem(selected, items)
  }

  function parseChoice(text) {
    text = String(text == null ? '' : text)
    if (!text) return { option: '', label: '', items: [] }
    var parts = text.split(SEP_ITEM)
    var items = parts.map(function (part) {
      var idx = part.indexOf(SEP_PAIR)
      if (idx < 0) return { option: part, label: part }
      return { option: part.slice(0, idx), label: part.slice(idx + SEP_PAIR.length) }
    })
    if (items.length === 1) {
      return { option: items[0].option, label: items[0].label, items: items }
    }
    return {
      option: items.map(function (item) { return item.option }).join(SEP_ITEM),
      label: text,
      items: items
    }
  }

  function formatFill(value) {
    if (Array.isArray(value)) {
      return value.map(function (v) { return String(v == null ? '' : v).trim() }).join(SEP_ITEM)
    }
    return String(value == null ? '' : value).trim()
  }

  function ensureString(value) {
    if (value == null) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'object' && value.option != null) {
      if (Array.isArray(value.option)) {
        return value.option.map(function (opt, index) {
          var id = value.option_id && value.option_id[index] != null ? value.option_id[index] : opt
          return String(opt) + SEP_PAIR + String(id)
        }).join(SEP_ITEM)
      }
      var option = String(value.option)
      var optionId = value.option_id != null ? String(value.option_id) : option
      return option + SEP_PAIR + optionId
    }
    return String(value).trim()
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

  function report(kind, value, block) {
    var api = window.AIClassCoursewareSubmit
    if (api && typeof api.submitInteraction === 'function') {
      api.submitInteraction(kind, {}, value, block)
      return formatValueForKind(kind, value, block)
    }
    var text = formatValueForKind(kind, value, block)
    if (window.AIClassExecutionLog && typeof AIClassExecutionLog.post === 'function') {
      AIClassExecutionLog.post({
        type: 'user_submitted',
        kind: protocolKind(kind) || null,
        value: text
      })
    }
    return text
  }

  function formatValueForKind(kind, value, block) {
    if (kind === 'choice') {
      var selected = value
      if (typeof selected === 'object' && selected != null && selected.option != null) {
        selected = selected.option
      }
      if (typeof selected === 'string' && selected.indexOf(SEP_PAIR) >= 0) {
        selected = parseChoice(selected).option
      }
      if (Array.isArray(selected)) selected = selected.length ? selected[0] : ''
      return selected == null ? '' : String(selected)
    }
    if (kind === 'fill') return formatFill(value)
    return ensureString(value)
  }

  window.AIClassSubmitText = {
    SEP_ITEM: SEP_ITEM,
    SEP_PAIR: SEP_PAIR,
    normalizeOptions: normalizeOptions,
    findItem: findItem,
    formatChoice: formatChoice,
    parseChoice: parseChoice,
    formatFill: formatFill,
    ensureString: ensureString,
    report: report
  }
})()

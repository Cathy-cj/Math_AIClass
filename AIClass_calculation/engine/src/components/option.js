// 选项数据模型 — 规范化 choice 的 label/value/id
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}

  function optionLabel(opt) {
    if (typeof opt === 'string') return opt
    if (!opt) return ''
    return opt.label || opt.text || ''
  }

  function optionValue(opt, index) {
    // 与 plan 契约 / course:check 一致：纯字符串选项的 value 就是字符串本身
    if (typeof opt === 'string') return opt
    if (opt && opt.value != null) return opt.value
    if (opt && (opt.label != null || opt.text != null)) {
      return opt.label != null ? opt.label : opt.text
    }
    return String(index + 1)
  }

  function optionId(opt, index) {
    if (opt && typeof opt === 'object') {
      if (opt.id != null) return String(opt.id)
      if (opt.option_id != null) return String(opt.option_id)
    }
    return String(index + 1)
  }

  function normalizeOption(opt, index) {
    return {
      raw: opt,
      label: optionLabel(opt),
      value: optionValue(opt, index),
      id: optionId(opt, index)
    }
  }

  function normalizeOptions(options) {
    return (options || []).map(normalizeOption)
  }

  ns._option = {
    label: optionLabel,
    value: optionValue,
    normalize: normalizeOption,
    normalizeAll: normalizeOptions
  }
})()

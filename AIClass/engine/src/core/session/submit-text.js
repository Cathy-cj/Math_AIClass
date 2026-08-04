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

  var HANDWRITING_OCR_INVALID = '学生书写内容无法正确识别'
  var LAYOUT_BBOX_IMAGE = /^!\[\]\(page=\d+,bbox=\[[^\]]+\]\)$/i

  function isLayoutBboxPlaceholder(text) {
    text = String(text == null ? '' : text).trim()
    if (!text) return false
    if (LAYOUT_BBOX_IMAGE.test(text)) return true
    var parts = text.split(/\s+/).filter(Boolean)
    return parts.length > 0 && parts.every(function (part) { return LAYOUT_BBOX_IMAGE.test(part) })
  }

  function fixHandwritingMathAmbiguities(text) {
    var s = String(text == null ? '' : text)
    if (!s) return s
    // 手写 π 常被 OCR 识成「元」「兀」；仅在算式语境替换，避免误伤纯中文
    s = s.replace(/(\d+(?:\.\d+)?)\s*元/g, '$1π')
    s = s.replace(/([×÷+\-＝=])\s*元/g, '$1π')
    s = s.replace(/元\s*([×÷+\-＝=])/g, 'π$1')
    s = s.replace(/(\d+(?:\.\d+)?)\s*兀/g, '$1π')
    s = s.replace(/([×÷+\-＝=])\s*兀/g, '$1π')
    s = s.replace(/兀\s*([×÷+\-＝=])/g, 'π$1')
    return s
  }

  function normalizeHandwritingOcr(md) {
    return fixHandwritingMathAmbiguities(
      String(md == null ? '' : md)
      .replace(/\$\$[\s\S]*?\$\$/g, function (block) {
        return block
          .replace(/\\mathrm\s*\{([^}]*)\}/gi, '$1')
          .replace(/\\[a-zA-Z]+\s*\{([^}]*)\}/g, '$1')
          .replace(/\\[a-zA-Z]+/g, ' ')
          .replace(/\$/g, ' ')
      })
      .replace(/\\mathrm\s*\{([^}]*)\}/gi, '$1')
      .replace(/\\[a-zA-Z]+\s*\{([^}]*)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/!\[\]\(page=\d+,bbox=\[[^\]]*\]\)/gi, ' ')
      .replace(/!\[\]\([^)]*\)/g, ' ')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    )
  }

  function isNoisyLayoutOcr(text) {
    var raw = String(text || '')
    if (!raw) return false
    if (/\$\$|\\\w+\{|<\w+[\s>]/.test(raw)) return true
    if (/\\mathrm|\\frac|\\begin|\\text/.test(raw)) return true
    return false
  }

  function countCjk(text) {
    return (String(text || '').match(/[\u4e00-\u9fff]/g) || []).length
  }

  function countLatin(text) {
    return (String(text || '').match(/[a-zA-Z]/g) || []).length
  }

  function needsScriptGap(prev, next) {
    if (!prev || !next) return false
    var prevCjk = /[\u4e00-\u9fff]$/.test(prev)
    var nextCjk = /^[\u4e00-\u9fff]/.test(next)
    var prevLat = /[a-zA-Z0-9]$/.test(prev)
    var nextLat = /^[a-zA-Z0-9]/.test(next)
    return (prevCjk && nextLat) || (prevLat && nextCjk)
  }

  function joinMixedScriptParts(parts) {
    return parts.reduce(function (acc, word) {
      if (!acc) return word
      return acc + (needsScriptGap(acc, word) ? ' ' : '') + word
    }, '')
  }

  function pickMergedOcrText(hw, layout) {
    var hwNorm = hw ? normalizeHandwritingOcr(hw) : ''
    var layoutNorm = layout ? normalizeHandwritingOcr(layout) : ''
    if (!hwNorm && !layoutNorm) return ''
    if (!hwNorm) return layoutNorm
    if (!layoutNorm) return hwNorm

    var hwLatin = countLatin(hwNorm)
    var layoutLatin = countLatin(layoutNorm)

    if (layoutLatin > 0 && hwLatin === 0 && countCjk(hwNorm) > 0) return layoutNorm
    if (hwLatin > 0 && layoutLatin === 0 && countCjk(layoutNorm) > 0) return hwNorm
    if (layoutLatin > hwLatin && countCjk(layoutNorm) >= countCjk(hwNorm) - 1) return layoutNorm
    if (hwLatin > layoutLatin && countCjk(hwNorm) >= countCjk(layoutNorm) - 1) return hwNorm

    if (hwNorm && (!layoutNorm || isNoisyLayoutOcr(layout))) return hwNorm
    if (isNoisyLayoutOcr(layout) && !isNoisyLayoutOcr(hw)) return hwNorm
    if (countCjk(hwNorm) > countCjk(layoutNorm)) return hwNorm
    if (countCjk(layoutNorm) > countCjk(hwNorm) && !isNoisyLayoutOcr(layout)) return layoutNorm
    return hwNorm.length >= layoutNorm.length ? hwNorm : layoutNorm
  }

  function stripLayoutOcrNoise(text) {
    return normalizeHandwritingOcr(text).replace(/\s+/g, '')
  }

  function isHandwritingOcrValid(md) {
    var raw = String(md == null ? '' : md).trim()
    if (!raw.length) return false
    if (isLayoutBboxPlaceholder(raw)) return false
    return normalizeHandwritingOcr(raw).length > 0
  }

  function extractLayoutDetailTexts(data) {
    var details = data && data.layout_details
    if (!Array.isArray(details)) return []
    var texts = []
    details.forEach(function (page) {
      var items = Array.isArray(page) ? page : [page]
      items.forEach(function (item) {
        if (!item) return
        var label = item.label
        if (label && label !== 'text' && label !== 'formula') return
        var content = String(item.content || '').trim()
        if (!content || isLayoutBboxPlaceholder(content)) return
        if (/^https?:\/\//i.test(content)) return
        texts.push(content)
      })
    })
    return texts
  }

  function joinHandwriteWords(words) {
    if (!Array.isArray(words) || !words.length) return ''
    function topOf(item) {
      var loc = item && item.location
      return loc && loc.top != null ? loc.top : 0
    }
    function leftOf(item) {
      var loc = item && item.location
      return loc && loc.left != null ? loc.left : 0
    }
    function heightOf(item) {
      var loc = item && item.location
      return loc && loc.height != null ? loc.height : 32
    }
    var sorted = words.slice().sort(function (a, b) {
      var dy = topOf(a) - topOf(b)
      var lineGap = Math.max(heightOf(a), heightOf(b)) * 0.55
      if (Math.abs(dy) > lineGap) return dy
      return leftOf(a) - leftOf(b)
    })
    var lines = []
    sorted.forEach(function (item) {
      var word = String(item && item.words != null ? item.words : '').trim()
      if (!word) return
      var top = topOf(item)
      var last = lines[lines.length - 1]
      var gap = last ? Math.max(last.lineHeight, heightOf(item)) * 0.55 : 0
      if (last && Math.abs(top - last.top) <= gap) {
        last.parts.push(word)
        last.top = (last.top + top) / 2
        last.lineHeight = Math.max(last.lineHeight, heightOf(item))
      } else {
        lines.push({ top: top, lineHeight: heightOf(item), parts: [word] })
      }
    })
    return lines.map(function (line) { return joinMixedScriptParts(line.parts) }).join('\n')
  }

  function pickHandwriteOcrFromResponse(data) {
    if (!data || data.status !== 'succeeded') return ''
    var words = data.words_result
    if (!Array.isArray(words) || !words.length) return ''
    var joined = joinHandwriteWords(words)
    if (!isHandwritingOcrValid(joined)) return ''
    return normalizeHandwritingOcr(joined)
  }

  function pickHandwritingOcrFromResponse(data) {
    if (!data) return ''
    // GLM-OCR layout_parsing：优先 md_results / layout_details
    var md = data.md_results
    if (isHandwritingOcrValid(md)) return normalizeHandwritingOcr(md)
    var layoutJoined = extractLayoutDetailTexts(data).join('\n')
    if (isHandwritingOcrValid(layoutJoined)) return normalizeHandwritingOcr(layoutJoined)
    return pickHandwriteOcrFromResponse(data)
  }

  function combineOcrRowResults(rowResults, expectAllRows) {
    if (expectAllRows && rowResults.length > 0) {
      if (rowResults.some(function (row) { return !row.ok })) return ''
    }
    return rowResults.map(function (row) { return row.text }).filter(Boolean).join('\n').trim()
  }

  function formatHandwriting(md) {
    if (!isHandwritingOcrValid(md)) return HANDWRITING_OCR_INVALID
    return normalizeHandwritingOcr(md)
  }

  var HANDWRITING_OCR_FALLBACK = HANDWRITING_OCR_INVALID

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
        status: 'ok',
        kind: kind || null,
        action: (block && (block.logAction || block.id)) || null,
        value: text
      })
    }
    return text
  }

  function formatValueForKind(kind, value, block) {
    if (kind === 'choice') {
      // 上报 value：仅学生所选选项值（不再「值｜文案」）
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
    if (kind === 'handwriting') return formatHandwriting(value)
    return ensureString(value)
  }

  window.AIClassSubmitText = {
    SEP_ITEM: SEP_ITEM,
    SEP_PAIR: SEP_PAIR,
    HANDWRITING_OCR_INVALID: HANDWRITING_OCR_INVALID,
    HANDWRITING_OCR_FALLBACK: HANDWRITING_OCR_FALLBACK,
    isHandwritingOcrValid: isHandwritingOcrValid,
    pickHandwritingOcrFromResponse: pickHandwritingOcrFromResponse,
    combineOcrRowResults: combineOcrRowResults,
    joinHandwriteWords: joinHandwriteWords,
    pickHandwriteOcrFromResponse: pickHandwriteOcrFromResponse,
    pickMergedOcrText: pickMergedOcrText,
    isNoisyLayoutOcr: isNoisyLayoutOcr,
    extractLayoutDetailTexts: extractLayoutDetailTexts,
    normalizeHandwritingOcr: normalizeHandwritingOcr,
    fixHandwritingMathAmbiguities: fixHandwritingMathAmbiguities,
    stripLayoutOcrNoise: stripLayoutOcrNoise,
    normalizeOptions: normalizeOptions,
    findItem: findItem,
    formatChoice: formatChoice,
    parseChoice: parseChoice,
    formatFill: formatFill,
    formatHandwriting: formatHandwriting,
    ensureString: ensureString,
    report: report
  }
})()

// 纯计算公式：在 top-level = / 除号处拆分（供 calc-line-fit 与单测复用；± 不断行）
;(function () {
  if (window.AIClassCalcTexSplit) return

  var FRAC_CMDS = { frac: true, dfrac: true, tfrac: true, cfrac: true }
  var DIV_CMDS = { div: true }

  function isLetter(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
  }

  function skipWhitespace(tex, i) {
    while (i < tex.length && (tex[i] === ' ' || tex[i] === '\n' || tex[i] === '\t')) i++
    return i
  }

  function readCommandName(tex, i) {
    if (tex[i] !== '\\') return { name: '', next: i }
    i++
    if (i >= tex.length) return { name: '', next: i }
    if (!isLetter(tex[i])) return { name: tex[i], next: i + 1 }
    var start = i
    while (i < tex.length && isLetter(tex[i])) i++
    return { name: tex.slice(start, i), next: i }
  }

  function readOptionalBracket(tex, i) {
    if (i >= tex.length || tex[i] !== '[') return i
    i++
    var depth = 1
    while (i < tex.length && depth > 0) {
      if (tex[i] === '[') depth++
      else if (tex[i] === ']') depth--
      i++
    }
    return i
  }

  function readBracedGroup(tex, i) {
    if (i >= tex.length || tex[i] !== '{') return i
    var depth = 0
    while (i < tex.length) {
      if (tex[i] === '\\') {
        var cmd = readCommandName(tex, i)
        i = cmd.next
        i = readOptionalBracket(tex, i)
        if (i < tex.length && tex[i] === '{') i = readBracedGroup(tex, i)
        continue
      }
      if (tex[i] === '{') depth++
      else if (tex[i] === '}') {
        depth--
        if (depth === 0) return i + 1
      }
      i++
    }
    return i
  }

  function skipLeftRightDelimiter(tex, i) {
    i = skipWhitespace(tex, i)
    if (i >= tex.length) return i
    if (tex[i] === '\\') {
      var cmd = readCommandName(tex, i)
      i = cmd.next
      return i
    }
    return i + 1
  }

  function isTopLevel(depth) {
    return depth === 0
  }

  function prevNonSpace(tex, idx) {
    var j = idx - 1
    while (j >= 0 && (tex[j] === ' ' || tex[j] === '\n' || tex[j] === '\t')) j--
    return j
  }

  /** 去掉与 ±/= 相邻重复的 frac/div 断点 */
  function filterBreakIndices(tex, indices) {
    return indices.filter(function (idx) {
      if (tex[idx] !== '\\') return true
      var prev = prevNonSpace(tex, idx)
      if (prev < 0) return true
      var ch = tex[prev]
      return ch !== '=' && ch !== '+' && ch !== '-'
    })
  }

  /** 可在该下标处断行（新行从此字符开始） */
  function findBreakIndices(tex) {
    tex = tex == null ? '' : String(tex)
    if (!tex) return []

    var indices = []
    var i = 0
    var groupDepth = 0

    while (i < tex.length) {
      var ch = tex[i]

      if (ch === '\\') {
        var cmdStart = i
        var cmd = readCommandName(tex, i)
        i = cmd.next
        i = readOptionalBracket(tex, i)

        if (isTopLevel(groupDepth)) {
          if (DIV_CMDS[cmd.name] || FRAC_CMDS[cmd.name]) {
            indices.push(cmdStart)
          }
        }

        if (cmd.name === 'left') {
          i = skipLeftRightDelimiter(tex, i)
          groupDepth++
          continue
        }
        if (cmd.name === 'right') {
          i = skipLeftRightDelimiter(tex, i)
          if (groupDepth > 0) groupDepth--
          continue
        }

        if (i < tex.length && tex[i] === '{') {
          i = readBracedGroup(tex, i)
        }
        continue
      }

      if (ch === '{') {
        groupDepth++
        i++
        continue
      }
      if (ch === '}') {
        if (groupDepth > 0) groupDepth--
        i++
        continue
      }

      if (isTopLevel(groupDepth) && ch === '=') {
        indices.push(i)
      }
      i++
    }

    indices.sort(function (a, b) { return a - b })
    var out = []
    for (var n = 0; n < indices.length; n++) {
      if (!n || indices[n] !== indices[n - 1]) out.push(indices[n])
    }
    return filterBreakIndices(tex, out)
  }

  function findTopLevelEqualsIndices(tex) {
    return findBreakIndices(tex).filter(function (idx) {
      return tex[idx] === '='
    })
  }

  function splitIntoSegments(tex) {
    tex = tex == null ? '' : String(tex)
    if (!tex) return ['']
    var indices = findBreakIndices(tex)
    if (!indices.length) return [tex]
    var segments = []
    var start = 0
    for (var n = 0; n < indices.length; n++) {
      segments.push(tex.slice(start, indices[n]))
      start = indices[n]
    }
    segments.push(tex.slice(start))
    return segments
  }

  function groupSegmentsIntoLines(segments, breakCount) {
    segments = segments || ['']
    var breaks = Math.max(0, Math.min(breakCount | 0, Math.max(0, segments.length - 1)))
    if (!segments.length) return ['']
    if (breaks === 0) return [segments.join('')]

    var lines = []
    var start = 0
    for (var b = 1; b <= breaks; b++) {
      var end = b + 1
      lines.push(segments.slice(start, end).join(''))
      start = end
    }
    if (start < segments.length) lines.push(segments.slice(start).join(''))
    return lines
  }

  function maxBreakCount(segments) {
    return Math.max(0, (segments || []).length - 1)
  }

  window.AIClassCalcTexSplit = {
    findBreakIndices: findBreakIndices,
    findTopLevelEqualsIndices: findTopLevelEqualsIndices,
    splitIntoSegments: splitIntoSegments,
    groupSegmentsIntoLines: groupSegmentsIntoLines,
    maxBreakCount: maxBreakCount
  }
})()

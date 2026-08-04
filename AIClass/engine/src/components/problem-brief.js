// 审题信息：按步骤渐进显示已知、求、关键；不展示知识点。
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}

  function normalizeKnown(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) { return String(item).trim() }).filter(Boolean)
    }
    if (value == null || value === '') return []
    return [String(value).trim()]
  }

  function appendRow(root, label, values, className, field) {
    var row = document.createElement('div')
    row.className = 'cc-problem-brief__row ' + className
    row.setAttribute('data-brief-field', field)
    row.hidden = true

    var badge = document.createElement('span')
    badge.className = 'cc-problem-brief__label'
    badge.textContent = label
    row.appendChild(badge)

    var content = document.createElement('div')
    content.className = 'cc-problem-brief__content'
    values.forEach(function (value, index) {
      var line = document.createElement('div')
      line.className = 'cc-problem-brief__line'
      line.textContent = value
      line.setAttribute('data-brief-line', String(index + 1))
      line.hidden = true
      content.appendChild(line)
    })
    row.appendChild(content)
    root.appendChild(row)
  }

  function createProblemBrief(config) {
    config = config || {}
    var known = normalizeKnown(config.known)
    var ask = config.ask == null ? '' : String(config.ask).trim()
    var key = config.key == null ? '' : String(config.key).trim()
    if (!known.length || !ask) return null

    var root = document.createElement('section')
    root.className = 'cc-problem-brief'
    root.setAttribute('aria-label', '题目信息')
    root.hidden = true
    appendRow(root, '已知', known, 'is-known', 'known')
    appendRow(root, '求', [ask], 'is-ask', 'ask')
    if (key) appendRow(root, '关键', [key], 'is-key', 'key')
    return root
  }

  function setProblemBriefState(root, state) {
    if (!root || !state) return
    var knownCount = Math.max(0, Number(state.known) || 0)
    var knownRow = root.querySelector('[data-brief-field="known"]')
    var visibleCount = 0
    if (knownRow) {
      var knownLines = knownRow.querySelectorAll('[data-brief-line]')
      knownLines.forEach(function (line, index) {
        line.hidden = index >= knownCount
      })
      knownRow.hidden = knownCount === 0
      visibleCount += knownCount > 0 ? 1 : 0
    }

    ;['ask', 'key'].forEach(function (field) {
      var row = root.querySelector('[data-brief-field="' + field + '"]')
      if (!row) return
      var visible = state[field] === true
      row.hidden = !visible
      var line = row.querySelector('[data-brief-line]')
      if (line) line.hidden = !visible
      if (visible) visibleCount += 1
    })
    root.hidden = visibleCount === 0
  }

  ns.createProblemBrief = createProblemBrief
  ns.setProblemBriefState = setProblemBriefState
})()

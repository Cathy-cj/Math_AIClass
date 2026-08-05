// 课前屏流程包 — 标题屏 → 正文；对外入口 AIClassPreLessonFlow
;(function () {
  // —— 坐标框四角装饰（包内私有） ——

  function appendFrameCorners(parent, prefix) {
    if (!parent || !prefix) return parent
    ;['tl', 'tr', 'bl', 'br'].forEach(function (pos) {
      var corner = document.createElement('span')
      corner.className = prefix + '-corner ' + prefix + '-corner--' + pos
      corner.setAttribute('aria-hidden', 'true')
      parent.appendChild(corner)
    })
    return parent
  }

  // —— 标题屏 ——

  var titleEl = null
  var titleVisible = false
  var titleHideTimer = null

  function titleMeta() {
    return window.LESSON_META || {}
  }

  function titleEnabled() {
    return titleMeta().titleScreen !== false
  }

  function titleTextEl(tag, className, content) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (content) node.textContent = content
    return node
  }

  function buildTitleDOM() {
    var meta = titleMeta()
    var screen = meta.titleScreen || {}
    var title = meta.title || '未命名课件'
    var eyebrow = screen.eyebrow != null ? screen.eyebrow : (meta.tag || '')
    var subtitle = screen.subtitle != null ? screen.subtitle : (meta.subtitle || '')

    var root = document.createElement('div')
    root.className = 'lf-lesson-title-screen'
    root.id = 'lesson-title-screen'
    root.setAttribute('role', 'banner')
    root.setAttribute('aria-label', title)

    var frame = document.createElement('div')
    frame.className = 'lf-lts-frame'
    appendFrameCorners(frame, 'lf-lts')

    var content = document.createElement('div')
    content.className = 'lf-lts-content'

    if (eyebrow) content.appendChild(titleTextEl('p', 'lf-lts-eyebrow', eyebrow))
    content.appendChild(titleTextEl('h1', 'lf-lts-title', title))
    if (subtitle) content.appendChild(titleTextEl('p', 'lf-lts-subtitle', subtitle))

    frame.appendChild(content)
    root.appendChild(frame)
    return root
  }

  function titleMount(stage) {
    if (!titleEnabled() || !stage) return null
    if (titleEl && !titleEl.parentNode) titleEl = null
    if (titleEl && titleEl.parentNode) return titleEl

    titleEl = buildTitleDOM()
    stage.insertBefore(titleEl, stage.firstChild)
    titleVisible = true

    requestAnimationFrame(function () {
      if (titleEl) titleEl.classList.add('is-visible')
    })

    return titleEl
  }

  function titleHide() {
    if (!titleEl || !titleVisible) return
    titleVisible = false
    titleEl.classList.remove('is-visible')
    titleEl.classList.add('is-hiding')

    function removeEl() {
      if (titleHideTimer) {
        clearTimeout(titleHideTimer)
        titleHideTimer = null
      }
      if (titleEl && titleEl.parentNode) titleEl.parentNode.removeChild(titleEl)
      titleEl = null
    }

    titleEl.addEventListener('transitionend', removeEl, { once: true })
    titleHideTimer = setTimeout(removeEl, 520)
  }

  function titleShow(stage) {
    if (!titleEnabled()) return
    var target = stage || document.querySelector('.lf-stage')
    if (!target) return
    if (titleHideTimer) {
      clearTimeout(titleHideTimer)
      titleHideTimer = null
    }
    if (titleEl && titleEl.parentNode) {
      titleVisible = true
      titleEl.classList.remove('is-hiding')
      requestAnimationFrame(function () {
        if (titleEl) titleEl.classList.add('is-visible')
      })
      return
    }
    titleMount(target)
  }

  var TitleScreen = {
    mount: titleMount,
    show: titleShow,
    hide: titleHide,
    isVisible: function () { return titleVisible },
    isEnabled: titleEnabled
  }

  // —— 课前阶段协调 ——
  // phase: title → done（正文）

  var phase = 'done'
  var flowStage = null
  var stageLocked = false

  function scrollLock() {
    return window.AIClassStageScrollLock
  }

  function lockStage() {
    if (stageLocked || !flowStage || !scrollLock()) return
    scrollLock().lock(flowStage)
    stageLocked = true
  }

  function unlockStage() {
    if (!stageLocked || !flowStage || !scrollLock()) return
    scrollLock().unlock(flowStage)
    stageLocked = false
  }

  function flowInit(opts) {
    opts = opts || {}
    flowStage = opts.stage || flowStage

    if (titleEnabled()) {
      TitleScreen.mount(flowStage)
      phase = 'title'
      lockStage()
    } else {
      phase = 'done'
    }
  }

  function flowOnEnterBody() {
    if (titleEnabled() && TitleScreen.isVisible()) {
      TitleScreen.hide()
    }
    if (phase === 'title') {
      unlockStage()
      phase = 'done'
    }
  }

  function flowOnReset(targetStage) {
    if (targetStage) flowStage = targetStage
    if (titleEnabled()) {
      phase = 'title'
      lockStage()
      TitleScreen.show(flowStage)
    } else {
      phase = 'done'
      unlockStage()
    }
  }

  var PreLessonFlow = {
    init: flowInit,
    onEnterBody: flowOnEnterBody,
    onReset: flowOnReset,
    getPhase: function () { return phase }
  }

  window.AIClassPreLessonFlow = PreLessonFlow

  // Deprecated — 兼容旧引用，新代码请只用 AIClassPreLessonFlow
  window.AIClassLessonTitleScreen = TitleScreen
})()

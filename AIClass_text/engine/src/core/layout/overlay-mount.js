// overlay 挂载 — 挂到 lf-board，fixed 对齐 stage 可视区（叠放滚动时不跟内容上移）
;(function () {
  var syncState = null

  function getContentStage() {
    return document.getElementById('course-stack-stage') || document.querySelector('.lf-stage')
  }

  function getOverlayParent() {
    var stage = getContentStage()
    if (stage && stage.parentElement) return stage.parentElement
    return document.getElementById('course-stack-board') ||
      document.querySelector('.lf-board') ||
      document.body
  }

  function syncOverlayBounds(el) {
    if (!el) return
    var stage = getContentStage()
    if (!stage) return
    var rect = stage.getBoundingClientRect()
    el.style.position = 'fixed'
    el.style.left = rect.left + 'px'
    el.style.top = rect.top + 'px'
    el.style.width = rect.width + 'px'
    el.style.height = rect.height + 'px'
    el.style.right = 'auto'
    el.style.bottom = 'auto'
  }

  function bindOverlaySync(el) {
    unbindOverlaySync()
    var stage = getContentStage()
    syncState = { el: el, stage: stage }

    function onSync() {
      if (syncState && syncState.el) syncOverlayBounds(syncState.el)
    }

    syncState.onSync = onSync
    window.addEventListener('resize', onSync)
    if (stage) stage.addEventListener('scroll', onSync, { passive: true })
    onSync()
  }

  function unbindOverlaySync() {
    if (!syncState) return
    if (syncState.onSync) window.removeEventListener('resize', syncState.onSync)
    if (syncState.stage && syncState.onSync) {
      syncState.stage.removeEventListener('scroll', syncState.onSync)
    }
    syncState = null
  }

  window.AIClassOverlayMount = {
    getContentStage: getContentStage,
    getOverlayParent: getOverlayParent,
    syncOverlayBounds: syncOverlayBounds,
    bindOverlaySync: bindOverlaySync,
    unbindOverlaySync: unbindOverlaySync
  }
})()

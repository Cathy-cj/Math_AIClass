// stage 滚动锁 — 引用计数，避免标题屏→选择页交接时 overflow 闪动
;(function () {
  var counts = typeof WeakMap !== 'undefined' ? new WeakMap() : null
  var fallback = null

  function countFor(stage) {
    if (!stage) return 0
    if (counts) return counts.get(stage) || 0
    if (!fallback) fallback = {}
    return fallback[stage.id || '_stage'] || 0
  }

  function setCount(stage, n) {
    if (!stage) return
    if (counts) {
      if (n <= 0) counts.delete(stage)
      else counts.set(stage, n)
      return
    }
    if (!fallback) fallback = {}
    var key = stage.id || '_stage'
    if (n <= 0) delete fallback[key]
    else fallback[key] = n
  }

  function lock(stage) {
    if (!stage) return
    var n = countFor(stage)
    if (n === 0) {
      stage.classList.add('lf-scroll-locked')
      stage.scrollTop = 0
    }
    setCount(stage, n + 1)
  }

  function unlock(stage) {
    if (!stage) return
    var n = countFor(stage)
    if (n <= 1) {
      setCount(stage, 0)
      stage.classList.remove('lf-scroll-locked')
      return
    }
    setCount(stage, n - 1)
  }

  function isLocked(stage) {
    return countFor(stage) > 0
  }

  function bindOverlay(el) {
    if (!el || el._lfScrollBlock) return
    var block = function (e) { e.preventDefault() }
    el._lfScrollBlock = block
    el.addEventListener('wheel', block, { passive: false })
    el.addEventListener('touchmove', block, { passive: false })
  }

  function unbindOverlay(el) {
    if (!el || !el._lfScrollBlock) return
    el.removeEventListener('wheel', el._lfScrollBlock)
    el.removeEventListener('touchmove', el._lfScrollBlock)
    el._lfScrollBlock = null
  }

  window.AIClassStageScrollLock = {
    lock: lock,
    unlock: unlock,
    isLocked: isLocked,
    bindOverlay: bindOverlay,
    unbindOverlay: unbindOverlay
  }
})()

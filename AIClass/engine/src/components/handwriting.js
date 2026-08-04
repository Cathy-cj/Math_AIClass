// Handwriting 绘图 + 可选 OCR provider — 懒加载本地 Konva
// widget 注册见 src/widgets/handwriting.js
;(function () {
  'use strict'

  var ns = window.AIClassComponent = window.AIClassComponent || {}

  var runtimeConfig = window.AICLASS_RUNTIME_CONFIG || {}
  var KONVA_SRC = runtimeConfig.konvaSrc || 'vendor/konva/konva.min.js'
  var DEFAULT_DEMO_VIDEO = runtimeConfig.handwritingDemoVideo || ''
  var ICON_PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
  var ICON_ERASER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/></svg>'
  var ICON_LEFT = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 13.0001L22 11.0002L5.828 11.0002L9.778 7.05044L8.364 5.63623L2 12.0002L8.364 18.3642L9.778 16.9499L5.828 13.0002L22 13.0001Z"/></svg>'
  var ICON_RIGHT = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.99974 13.0001L1.9996 11.0002L18.1715 11.0002L14.2218 7.05044L15.636 5.63623L22 12.0002L15.636 18.3642L14.2218 16.9499L18.1716 13.0002L1.99974 13.0001Z"/></svg>'
  var ICON_CLEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
  var ICON_CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>'
  var ICON_DEMO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>'

  var _konvaLoading = false
  var _konvaQueue = []

  function loadKonva(callback) {
    if (window.Konva) { callback(); return }
    if (_konvaLoading) { _konvaQueue.push(callback); return }
    _konvaLoading = true
    var s = document.createElement('script')
    s.src = KONVA_SRC
    s.onload = function () {
      callback()
      _konvaQueue.forEach(function (fn) { fn() })
      _konvaQueue.length = 0
    }
    s.onerror = function () {
      console.warn('[handwriting] Failed to load Konva: ' + KONVA_SRC)
      _konvaLoading = false
      _konvaQueue.forEach(function (fn) { fn() })
      _konvaQueue.length = 0
    }
    document.head.appendChild(s)
  }

  function combineOcrRowResults(rowResults, expectAllRows) {
    if (window.AIClassSubmitText && typeof AIClassSubmitText.combineOcrRowResults === 'function') {
      return AIClassSubmitText.combineOcrRowResults(rowResults, expectAllRows)
    }
    if (expectAllRows && rowResults.length > 0) {
      if (rowResults.some(function (row) { return !row.ok })) return ''
    }
    return rowResults.map(function (row) { return row.text }).filter(Boolean).join('\n').trim()
  }

  var TEMPLATE_HTML =
    '<div class="hw-workspace">'
    + '<div class="hw-toolbar" data-role="toolbar">'
    + '  <div class="hw-toolbar-cluster hw-toolbar-cluster--tools">'
    + '    <button type="button" data-tool="pen" class="active hw-icon-btn" title="画笔" aria-label="画笔">' + ICON_PEN + '</button>'
    + '    <button type="button" data-tool="eraser" class="hw-icon-btn" title="橡皮擦" aria-label="橡皮擦">' + ICON_ERASER + '</button>'
    + '  </div>'
    + '  <div class="hw-toolbar-cluster hw-toolbar-cluster--history">'
    + '    <button type="button" data-role="undo" disabled class="hw-icon-btn" title="撤销" aria-label="撤销">' + ICON_LEFT + '</button>'
    + '    <button type="button" data-role="redo" disabled class="hw-icon-btn" title="重做" aria-label="重做">' + ICON_RIGHT + '</button>'
    + '  </div>'
    + '  <span class="hw-clear-wrap" data-role="clear-wrap">'
    + '    <button type="button" data-role="clear" class="hw-toolbar-text-btn hw-toolbar-text-btn--clear" title="清空画布">'
    + ICON_CLEAR + '<span>清空</span></button>'
    + '    <div class="hw-clear-popover" data-role="clear-popover" hidden>'
    + '      <div class="hw-clear-popover-actions">'
    + '        <button type="button" data-action="cancel" class="hw-clear-popover-cancel">取消</button>'
    + '        <button type="button" data-action="confirm" class="hw-clear-popover-ok">确定</button>'
    + '      </div>'
    + '    </div>'
    + '  </span>'
    + '  <span class="hw-upload-wrap" data-role="upload-wrap" style="display:none">'
    + '    <button type="button" data-role="upload" class="hw-toolbar-text-btn hw-toolbar-text-btn--upload" title="上传手写图片">'
    + ICON_CAMERA + '<span>拍照</span></button>'
    + '    <input type="file" data-role="file-input" accept="image/*" hidden>'
    + '  </span>'
    + '  <span class="hw-demo-wrap" data-role="demo-wrap">'
    + '    <button type="button" data-role="demo" class="hw-toolbar-text-btn hw-toolbar-text-btn--demo" title="观看写法演示">'
    + ICON_DEMO + '<span>演示</span></button>'
    + '    <div class="hw-demo-tip" data-role="demo-tip" hidden>'
    + '      <button type="button" class="hw-demo-tip-close" data-role="demo-tip-close" aria-label="关闭预览" title="关闭预览">'
    + '        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">'
    + '          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
    + '        </svg>'
    + '      </button>'
    + '      <div class="hw-demo-tip-preview" data-role="demo-tip-preview">'
    + '        <div class="hw-demo-tip-media" data-role="demo-tip-media"></div>'
    + '        <p class="hw-demo-tip-caption">点击放大观看</p>'
    + '      </div>'
    + '    </div>'
    + '  </span>'
    + '  <span class="hw-spacer"></span>'
    + '  <span class="hw-status" data-role="status"></span>'
    + '  <button type="button" data-role="submit" class="hw-toolbar-submit aic-button" style="display:none">提交</button>'
    + '</div>'
    + '<div class="hw-draft-note" data-role="draft-note" hidden></div>'
    + '<div class="hw-scroll" data-role="scroll">'
    + '  <div class="hw-paper" data-role="paper">'
    + '    <div class="hw-answer-cue" aria-hidden="true">解：</div>'
    + '    <div class="hw-limit-line" data-role="limit-line" aria-hidden="true"></div>'
    + '    <div data-role="stage"></div>'
    + '  </div>'
    + '  <div class="hw-zone-mask" data-role="zone-mask" aria-hidden="true">手写答题区</div>'
    + '</div>'
    + '</div>'

  function renderHandwriting(el, block, runtime, ctx) {
    el.innerHTML = TEMPLATE_HTML
    var cfg = block.handwriting || {}
    var demoVideoSrc = cfg.demoVideo || DEFAULT_DEMO_VIDEO
    var demoPreviewSrc = cfg.demoPreview || demoVideoSrc
    var height = cfg.height || 350
    var toolbar = cfg.toolbar || ['pen', 'eraser', 'undo', 'redo', 'clear', 'demo', 'submit']
    var draftOnly = !!cfg.draftOnly
    if (draftOnly) {
      toolbar = toolbar.filter(function (item) {
        return item !== 'submit' && item !== 'upload'
      })
    }
    var ocr = draftOnly ? false : (cfg.ocr || false)
    var stepId = runtime.stepId || (block && block.__stepId) || 'default'
    // runtime 挂载：stepId 为 runtime:{logAction}，storage 与提交 context 由此隔离
    var interactive = true
    if (window.AIClassInteractionGate && typeof AIClassInteractionGate.isInteractive === 'function') {
      interactive = AIClassInteractionGate.isInteractive(block, runtime)
    }

    var scrollEl = el.querySelector('[data-role="scroll"]')
    var stageContainer = el.querySelector('[data-role="stage"]')
    if (cfg.fillHeight) {
      el.style.flex = '1'
      el.style.minHeight = cfg.minHeight != null ? cfg.minHeight + 'px' : '0'
      el.style.height = '100%'
      el.style.maxHeight = '100%'
    } else {
      el.style.height = height + 'px'
    }
    el.style.display = 'flex'
    el.style.flexDirection = 'column'
    if (!interactive) el.classList.add('hw-readonly')

    var workspaceEl = el.querySelector('.hw-workspace')
    if (draftOnly && workspaceEl) workspaceEl.classList.add('hw-workspace--draft-only')

    var toolbarEl = el.querySelector('[data-role="toolbar"]')
    ;['undo', 'redo', 'clear'].forEach(function (role) {
      if (toolbar.indexOf(role) < 0) {
        var btn = toolbarEl.querySelector('[data-role="' + role + '"]')
        if (btn) btn.remove()
      }
    })

    // submitBtn 可能被 toolbar 配置移除
    var submitBtn = toolbarEl.querySelector('[data-role="submit"]')
    if (toolbar.indexOf('submit') < 0 || !ocr || !interactive) {
      if (submitBtn) submitBtn.remove()
      submitBtn = null
    } else {
      if (submitBtn) submitBtn.style.display = ''
    }

    var uploadWrap = toolbarEl.querySelector('[data-role="upload-wrap"]')
    var uploadBtn = toolbarEl.querySelector('[data-role="upload"]')
    var fileInput = toolbarEl.querySelector('[data-role="file-input"]')
    if (toolbar.indexOf('upload') < 0 || !ocr || !interactive) {
      if (uploadWrap) uploadWrap.remove()
      uploadWrap = null
      uploadBtn = null
      fileInput = null
    } else if (uploadWrap) {
      uploadWrap.style.display = ''
    }

    var demoWrap = toolbarEl.querySelector('[data-role="demo-wrap"]')
    var demoBtn = toolbarEl.querySelector('[data-role="demo"]')
    var demoTipEl = toolbarEl.querySelector('[data-role="demo-tip"]')
    if (toolbar.indexOf('demo') < 0 || !interactive) {
      if (demoWrap) demoWrap.remove()
      demoWrap = null
      demoBtn = null
      demoTipEl = null
    }

    var MAX_UPLOAD_BYTES = 10 * 1024 * 1024
    var MAX_OCR_EDGE = 2048

    var STORAGE_KEY = storageKeyFor(stepId, block)
    var INIT_HEIGHT = 1200
    var MAX_CONTENT_HEIGHT = cfg.maxContentHeight || 2000
    var EXPAND_GAP = 300
    var EXPAND_STEP = 400
    var PEN_COLOR = '#0f172a'
    var PEN_WIDTH = 3
    var ERASER_RADIUS = 14
    var baseWidth = scrollEl.clientWidth || 600
    var contentHeight = INIT_HEIGHT
    var tool = 'pen'
    var drawing = false
    var currentLine = null
    var undoStack = []
    var redoStack = []
    var saveTimer = null
    var statusTimer = null
    var isSubmitting = false
    var pendingSubmit = null
    var lockedUploadEl = null
    var uploadLocked = false
    var submitGeneration = 0

    var paperEl = el.querySelector('[data-role="paper"]')
    var zoneMaskEl = el.querySelector('[data-role="zone-mask"]')
    var zoneMaskDismissed = false
    if (draftOnly) {
      if (cfg.zoneMaskText && zoneMaskEl) zoneMaskEl.textContent = cfg.zoneMaskText
      if (cfg.draftNote) {
        var draftNoteEl = el.querySelector('[data-role="draft-note"]')
        if (draftNoteEl) {
          draftNoteEl.hidden = false
          draftNoteEl.textContent = cfg.draftNote
        }
      }
    }
    var stage = new Konva.Stage({
      container: stageContainer,
      width: baseWidth,
      height: contentHeight
    })
    // 横线画在 Konva 底层：CSS gradient / 独立 canvas 在 .lf-stage transform:scale 下都会被合成裁切
    var paperLayer = new Konva.Layer({ listening: false })
    var layer = new Konva.Layer()
    stage.add(paperLayer)
    stage.add(layer)

    var placeholderEl = el.querySelector('[data-role="placeholder"]')

    function redrawPaperLines() {
      paperLayer.destroyChildren()
      // .lf-stage 有 CSS transform:scale，1px 线会变成亚像素被合成掉；按屏幕像素加粗
      var boardScale = Number(
        getComputedStyle(document.documentElement).getPropertyValue('--lf-board-scale')
      ) || 1
      if (boardScale <= 0) boardScale = 1
      var strokeW = Math.max(1.5, 1.25 / boardScale)
      for (var y = 38; y < contentHeight; y += 38) {
        paperLayer.add(new Konva.Line({
          points: [0, y, baseWidth, y],
          stroke: '#cbd5e1',
          strokeWidth: strokeW,
          listening: false,
          perfectDrawEnabled: false,
          shadowForStrokeEnabled: false,
          strokeScaleEnabled: false
        }))
      }
      paperLayer.batchDraw()
    }

    function isPreviewImage(src) {
      return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(src || '')
    }

    function pauseDemoTipPreview() {
      if (!demoTipEl) return
      var video = demoTipEl.querySelector('[data-role="demo-tip-video"]')
      if (video) video.pause()
    }

    function resumeDemoTipPreview() {
      if (!demoTipEl || demoTipEl.hidden) return
      var previewVideo = demoTipEl.querySelector('[data-role="demo-tip-video"]')
      if (previewVideo) previewVideo.play().catch(function () {})
    }

    function openDemoEnlarged() {
      if (!interactive || isSubmitting) return
      pauseDemoTipPreview()
      hideDemoTip()
      showDemoModal()
    }

    function bindDemoTipClick() {
      if (!demoTipEl || demoTipEl.dataset.clickBound === '1') return
      demoTipEl.dataset.clickBound = '1'
      demoTipEl.setAttribute('role', 'button')
      demoTipEl.setAttribute('tabindex', '0')
      demoTipEl.setAttribute('aria-label', '点击放大观看演示')
      var closeBtn = demoTipEl.querySelector('[data-role="demo-tip-close"]')
      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.preventDefault()
          e.stopPropagation()
          hideDemoTip()
        })
      }
      demoTipEl.addEventListener('click', function (e) {
        e.stopPropagation()
        if (demoTipEl.hidden) return
        if (e.target && e.target.closest && e.target.closest('[data-role="demo-tip-close"]')) return
        openDemoEnlarged()
      })
      demoTipEl.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        if (demoTipEl.hidden) return
        openDemoEnlarged()
      })
    }

    function ensureDemoTipPreview() {
      if (!demoTipEl) return
      var mediaSlot = demoTipEl.querySelector('[data-role="demo-tip-media"]')
      if (!mediaSlot || mediaSlot.dataset.ready === '1') return
      mediaSlot.innerHTML = ''
      mediaSlot.dataset.ready = '1'
      if (!demoPreviewSrc) {
        mediaSlot.innerHTML = '<span class="hw-demo-tip-fallback">演示预览</span>'
        return
      }
      if (isPreviewImage(demoPreviewSrc)) {
        var img = document.createElement('img')
        img.setAttribute('data-role', 'demo-tip-image')
        img.alt = '写法示范预览'
        img.src = demoPreviewSrc
        img.addEventListener('error', function () {
          mediaSlot.innerHTML = '<span class="hw-demo-tip-fallback">演示预览</span>'
        }, { once: true })
        mediaSlot.appendChild(img)
        return
      }
      var previewVideo = document.createElement('video')
      previewVideo.setAttribute('data-role', 'demo-tip-video')
      previewVideo.muted = true
      previewVideo.loop = true
      previewVideo.playsInline = true
      previewVideo.setAttribute('playsinline', '')
      previewVideo.preload = 'metadata'
      previewVideo.src = demoPreviewSrc
      previewVideo.addEventListener('error', function () {
        mediaSlot.innerHTML = '<span class="hw-demo-tip-fallback">演示预览</span>'
      }, { once: true })
      mediaSlot.appendChild(previewVideo)
    }

    function positionDemoTip() {
      if (!demoTipEl || demoTipEl.hidden || !demoBtn) return
      var r = demoBtn.getBoundingClientRect()
      demoTipEl.style.left = (r.left + r.width / 2) + 'px'
      demoTipEl.style.top = (r.top - 10) + 'px'
    }

    function hideDemoTip() {
      if (!demoTipEl) return
      pauseDemoTipPreview()
      demoTipEl.hidden = true
      demoTipEl.style.left = ''
      demoTipEl.style.top = ''
    }

    function closeDemoUi() {
      closeDemoModal({ resumePreview: false })
      hideDemoTip()
    }

    function showDemoTip() {
      if (!demoTipEl || zoneMaskDismissed || !demoBtn) return
      bindDemoTipClick()
      ensureDemoTipPreview()
      demoTipEl.dataset.hwStepId = String(stepId)
      // 挂到 body，避开 .lf-board / .lf-stage 的 overflow、transform 裁切
      if (demoTipEl.parentNode !== document.body) {
        document.body.appendChild(demoTipEl)
      }
      demoTipEl.hidden = false
      positionDemoTip()
      var previewVideo = demoTipEl.querySelector('[data-role="demo-tip-video"]')
      if (previewVideo) previewVideo.play().catch(function () {})
      requestAnimationFrame(function () {
        positionDemoTip()
        requestAnimationFrame(positionDemoTip)
      })
    }

    function dismissZoneMask() {
      if (zoneMaskDismissed) return
      zoneMaskDismissed = true
      if (zoneMaskEl) {
        zoneMaskEl.classList.add('hw-zone-mask--gone')
        zoneMaskEl.setAttribute('hidden', '')
      }
      hideDemoTip()
      scrollEl.classList.remove('hw-scroll--zone-locked')
      scheduleSave()
    }

    function lockScrollForZoneMask() {
      if (zoneMaskDismissed) return
      scrollEl.classList.add('hw-scroll--zone-locked')
      scrollEl.scrollTop = 0
      showDemoTip()
    }

    function closeDemoModal(opts) {
      opts = opts || {}
      var hadModal = !!el._hwDemoModal
      var modal = el._hwDemoModal
      if (modal) {
        var video = modal.querySelector('[data-role="demo-video"]')
        if (video) {
          video.pause()
          video.removeAttribute('src')
          video.load()
        }
        if (modal.parentNode) modal.parentNode.removeChild(modal)
      }
      el._hwDemoModal = null
      if (hadModal && opts.resumePreview !== false) {
        resumeDemoTipPreview()
      }
    }

    function showDemoModal() {
      if (!interactive) return
      pauseDemoTipPreview()
      closeDemoModal({ resumePreview: false })
      var modal = document.createElement('div')
      modal.className = 'hw-demo-overlay'
      modal.setAttribute('role', 'dialog')
      modal.setAttribute('aria-modal', 'true')
      modal.setAttribute('aria-label', '演示')
      modal.innerHTML = ''
        + '<div class="hw-demo-stage">'
        + '  <button type="button" class="hw-demo-close" data-action="close" aria-label="关闭" title="关闭">'
        + '    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">'
        + '      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
        + '    </svg>'
        + '  </button>'
        + '  <div class="hw-demo-player" data-role="demo-video-slot">'
        + '    <p class="hw-demo-player-placeholder">演示视频占位</p>'
        + '    <video data-role="demo-video" controls playsinline hidden></video>'
        + '  </div>'
        + '</div>'
      document.body.appendChild(modal)
      el._hwDemoModal = modal

      var placeholder = modal.querySelector('.hw-demo-player-placeholder')
      var video = modal.querySelector('[data-role="demo-video"]')
      function showPlaceholder(message) {
        if (placeholder) {
          placeholder.textContent = message
          placeholder.hidden = false
        }
        if (video) video.hidden = true
      }
      if (!demoVideoSrc || !video) {
        showPlaceholder('暂无演示视频')
      } else {
        video.addEventListener('error', function () {
          showPlaceholder('暂无演示视频')
        }, { once: true })
        video.src = demoVideoSrc
        video.hidden = false
        if (placeholder) placeholder.hidden = true
        video.play().catch(function () {})
      }

      requestAnimationFrame(function () {
        modal.classList.add('hw-demo-overlay--open')
      })
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.closest('[data-action="close"]')) {
          closeDemoModal()
        }
      })
    }
    function syncPaperSize() {
      if (!paperEl) return
      paperEl.style.width = baseWidth + 'px'
      paperEl.style.height = contentHeight + 'px'
      paperEl.classList.toggle('hw-paper--at-limit', contentHeight >= MAX_CONTENT_HEIGHT)
      redrawPaperLines()
    }
    var eraserCursorEl = document.createElement('div')
    eraserCursorEl.className = 'hw-eraser-cursor'
    eraserCursorEl.style.setProperty('--hw-eraser-radius', ERASER_RADIUS + 'px')
    eraserCursorEl.hidden = true
    document.body.appendChild(eraserCursorEl)

    function removeLockedUpload() {
      if (lockedUploadEl) {
        lockedUploadEl.remove()
        lockedUploadEl = null
      }
      stageContainer.style.display = ''
      stageContainer.style.visibility = ''
      scrollEl.classList.remove('hw-scroll--locked-upload')
    }

    function showLockedUpload(imageUrl) {
      if (!imageUrl) return
      removeLockedUpload()
      lockedUploadEl = document.createElement('img')
      lockedUploadEl.className = 'hw-locked-upload'
      lockedUploadEl.src = imageUrl
      lockedUploadEl.alt = '已提交手写'
      scrollEl.appendChild(lockedUploadEl)
      scrollEl.classList.add('hw-scroll--locked-upload')
      stageContainer.style.display = 'none'
      if (placeholderEl) placeholderEl.style.display = 'none'
    }

    function enterSubmitting(source, imageUrl, submitModal) {
      isSubmitting = true
      pendingSubmit = { source: source, imageUrl: imageUrl, modal: submitModal || null }
      if (source === 'upload') showLockedUpload(imageUrl)
      // 预览弹窗内按钮已显示「识别中…」，勿再刷工具栏状态
      if (!submitModal) flashStatus('识别中…')
    }

    function closeSubmitModal(modalRef) {
      var modal = modalRef || (pendingSubmit && pendingSubmit.modal) || el._hwActiveModal
      if (modal && modal.parentNode) modal.remove()
      if (el._hwActiveModal === modal) el._hwActiveModal = null
      if (pendingSubmit) pendingSubmit.modal = null
    }

    function isSubmitAborted(batchGen) {
      return batchGen !== submitGeneration
    }

    function setSubmitControls(disabled) {
      if (submitBtn) submitBtn.disabled = !!disabled
      if (uploadBtn) uploadBtn.disabled = !!disabled
    }

    function abortActiveSubmit() {
      submitGeneration++
      closeSubmitModal()
      closeDemoModal()
      isSubmitting = false
      pendingSubmit = null
      removeLockedUpload()
      clearToolbarStatus()
    }

    function clearToolbarStatus() {
      var statusEl = toolbarEl.querySelector('[data-role="status"]')
      if (statusEl) statusEl.textContent = ''
      if (statusTimer) clearTimeout(statusTimer)
    }

    function finishSubmitSuccess(ocrResult, submitMeta) {
      submitMeta = submitMeta || {}
      closeSubmitModal(submitMeta.modal)
      isSubmitting = false
      pendingSubmit = null
      if (submitMeta.source === 'upload') {
        uploadLocked = true
        setSubmitControls(true)
      } else {
        uploadLocked = false
        removeLockedUpload()
        setSubmitControls(false)
      }
      refreshButtons()
      updatePlaceholder()
      save()
      clearToolbarStatus()
      if (window.toast && typeof window.toast.show === 'function') {
        window.toast.show('提交成功', { duration: 2000, icon: 'check' })
      } else {
        flashStatus('提交成功')
      }
    }

    function finishSubmitFailed(message) {
      closeSubmitModal()
      isSubmitting = false
      pendingSubmit = null
      removeLockedUpload()
      refreshButtons()
      updatePlaceholder()
      clearToolbarStatus()
      if (message) {
        if (window.toast && typeof window.toast.show === 'function') {
          window.toast.show(message, { duration: 2800, icon: 'error' })
        } else {
          flashStatus(message)
        }
      }
      save()
    }

    function updatePlaceholder() {
      if (!placeholderEl) return
      if (lockedUploadEl) {
        placeholderEl.style.display = 'none'
        return
      }
      placeholderEl.style.display = layer.find('Line').length > 0 ? 'none' : ''
    }

    function updateEraserCursor(clientX, clientY) {
      // fixed 定位 + 视口坐标，避免 lf-stage scale 与 scroll 坐标系不一致
      eraserCursorEl.style.left = clientX + 'px'
      eraserCursorEl.style.top = clientY + 'px'
      eraserCursorEl.hidden = false
    }

    function hideEraserCursor() {
      eraserCursorEl.hidden = true
    }

    function setTool(next) {
      if (!interactive) return
      tool = next
      var penBtn = toolbarEl.querySelector('[data-tool="pen"]')
      var erasBtn = toolbarEl.querySelector('[data-tool="eraser"]')
      if (penBtn) penBtn.classList.toggle('active', next === 'pen')
      if (erasBtn) erasBtn.classList.toggle('active', next === 'eraser')
      if (next === 'eraser') {
        scrollEl.style.cursor = 'none'
        scrollEl.classList.add('hw-scroll--eraser')
      } else {
        scrollEl.style.cursor = 'crosshair'
        scrollEl.classList.remove('hw-scroll--eraser')
        hideEraserCursor()
      }
    }

    function refreshStage() {
      stage.width(baseWidth)
      stage.height(contentHeight)
      syncPaperSize()
      layer.batchDraw()
    }

    function pushAction(action) {
      undoStack.push(action)
      redoStack.length = 0
      refreshButtons()
    }

    function refreshButtons() {
      var undoBtn = toolbarEl.querySelector('[data-role="undo"]')
      var redoBtn = toolbarEl.querySelector('[data-role="redo"]')
      if (!interactive) {
        toolbarEl.querySelectorAll('button').forEach(function (btn) { btn.disabled = true })
        return
      }
      if (undoBtn) undoBtn.disabled = undoStack.length === 0
      if (redoBtn) redoBtn.disabled = redoStack.length === 0
      setSubmitControls(uploadLocked)
    }

    function flashStatus(text) {
      var statusEl = toolbarEl.querySelector('[data-role="status"]')
      if (!statusEl) return
      statusEl.textContent = text
      if (statusTimer) clearTimeout(statusTimer)
      statusTimer = setTimeout(function () { statusEl.textContent = '' }, 2000)
    }

    function clampContentHeight(h) {
      return Math.min(Math.max(h, INIT_HEIGHT), MAX_CONTENT_HEIGHT)
    }

    var _expandTimer = null
    function maybeExpand(y) {
      if (y < contentHeight - EXPAND_GAP) return
      if (contentHeight >= MAX_CONTENT_HEIGHT) return
      if (_expandTimer) return
      contentHeight = clampContentHeight(contentHeight + EXPAND_STEP)
      refreshStage()
      _expandTimer = setTimeout(function () { _expandTimer = null }, 80)
    }

    function lineToData(line) {
      return {
        id: line.id(),
        points: line.points(),
        stroke: line.stroke(),
        strokeWidth: line.strokeWidth()
      }
    }

    function dataToLine(data) {
      return new Konva.Line({
        id: data.id,
        points: data.points,
        stroke: data.stroke,
        strokeWidth: data.strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0.4
      })
    }

    function scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(save, 800)
    }

    function save() {
      var lines = layer.find('Line').map(lineToData)
      var payload = {
        height: contentHeight,
        strokes: lines,
        zoneMaskDismissed: zoneMaskDismissed
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch (e) {
        flashStatus('保存失败')
      }
    }

    function restore() {
      var raw
      try { raw = localStorage.getItem(STORAGE_KEY) } catch (e) { return }
      if (!raw) return
      try {
        var data = JSON.parse(raw)
        if (data.height) contentHeight = clampContentHeight(data.height)
        ;(data.strokes || []).forEach(function (s) { layer.add(dataToLine(s)) })
        if (data.zoneMaskDismissed || (data.strokes && data.strokes.length)) {
          dismissZoneMask()
        }
        refreshStage()
        if (data.strokes && data.strokes.length) flashStatus('已恢复草稿')
      } catch (e) { /* ignore */ }
      updatePlaceholder()
    }

    function distToSegmentSq(px, py, x1, y1, x2, y2) {
      var dx = x2 - x1
      var dy = y2 - y1
      if (dx === 0 && dy === 0) {
        var ddx = px - x1
        var ddy = py - y1
        return ddx * ddx + ddy * ddy
      }
      var t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
      if (t < 0) t = 0
      else if (t > 1) t = 1
      var ex = px - (x1 + t * dx)
      var ey = py - (y1 + t * dy)
      return ex * ex + ey * ey
    }

    function eraseAt(x, y) {
      var hits = []
      layer.find('Line').forEach(function (line) {
        var pts = line.points()
        if (pts.length < 2) return
        var hitR = ERASER_RADIUS + line.strokeWidth() / 2
        var hitR2 = hitR * hitR
        var hit = false
        if (pts.length >= 4) {
          for (var i = 0; i < pts.length - 2; i += 2) {
            if (distToSegmentSq(x, y, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) <= hitR2) {
              hit = true
              break
            }
          }
        } else {
          var dx = pts[0] - x
          var dy = pts[1] - y
          hit = dx * dx + dy * dy <= hitR2
        }
        if (hit) hits.push(line)
      })
      if (hits.length) {
        hits.forEach(function (line) { line.remove() })
        pushAction({ type: 'deleteMany', lines: hits })
        layer.batchDraw()
        scheduleSave()
        updatePlaceholder()
      }
    }

    stage.on('pointerdown', function (e) {
      if (!interactive || isSubmitting) return
      var p = stage.getRelativePointerPosition()
      if (!p) return
      if (tool === 'eraser' && e.evt) updateEraserCursor(e.evt.clientX, e.evt.clientY)
      drawing = true
      if (tool === 'eraser') { eraseAt(p.x, p.y); return }
      dismissZoneMask()
      currentLine = new Konva.Line({
        id: 's-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        points: [p.x, p.y],
        stroke: PEN_COLOR,
        strokeWidth: PEN_WIDTH,
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0.4
      })
      layer.add(currentLine)
    })

    stage.on('pointermove', function (e) {
      if (tool === 'eraser' && e.evt) updateEraserCursor(e.evt.clientX, e.evt.clientY)
      if (!drawing) return
      var p = stage.getRelativePointerPosition()
      if (!p) return
      if (tool === 'eraser') { eraseAt(p.x, p.y); return }
      var pts = currentLine.points()
      pts.push(p.x, p.y)
      currentLine.points(pts)
      maybeExpand(p.y)
      layer.batchDraw()
    })

    function finishStroke() {
      if (!drawing) return
      drawing = false
      if (tool === 'pen' && currentLine) {
        pushAction({ type: 'add', line: currentLine })
        currentLine = null
        scheduleSave()
        updatePlaceholder()
      }
    }

    window.addEventListener('pointerup', finishStroke)
    window.addEventListener('pointercancel', finishStroke)

    scrollEl.addEventListener('pointermove', function (e) {
      if (tool !== 'eraser') return
      updateEraserCursor(e.clientX, e.clientY)
    })
    scrollEl.addEventListener('pointerenter', function (e) {
      if (tool !== 'eraser') return
      updateEraserCursor(e.clientX, e.clientY)
    })
    scrollEl.addEventListener('pointerleave', function () {
      if (!drawing) hideEraserCursor()
    })

    var EXPORT_PADDING = 24

    function getStrokesBBox() {
      var lines = layer.find('Line')
      if (!lines.length) return null
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      lines.forEach(function (line) {
        var half = line.strokeWidth() / 2
        var pts = line.points()
        for (var i = 0; i < pts.length; i += 2) {
          var x = pts[i], y = pts[i + 1]
          if (x - half < minX) minX = x - half
          if (y - half < minY) minY = y - half
          if (x + half > maxX) maxX = x + half
          if (y + half > maxY) maxY = y + half
        }
      })
      return {
        x: Math.max(0, minX - EXPORT_PADDING),
        y: Math.max(0, minY - EXPORT_PADDING),
        width: (maxX - minX) + EXPORT_PADDING * 2,
        height: (maxY - minY) + EXPORT_PADDING * 2
      }
    }

    function clampRegionToCanvas(bbox) {
      return {
        x: Math.max(0, bbox.x),
        y: Math.max(0, bbox.y),
        width: Math.min(baseWidth - bbox.x, bbox.width),
        height: Math.min(contentHeight - bbox.y, bbox.height)
      }
    }

    function exportStageRegion(px) {
      if (!px || px.width <= 0 || px.height <= 0) return null

      paperLayer.visible(false)
      var bg = new Konva.Rect({
        x: 0, y: 0,
        width: baseWidth,
        height: contentHeight,
        fill: '#ffffff'
      })
      layer.add(bg)
      bg.moveToBottom()
      layer.draw()

      var region = clampRegionToCanvas(px)
      if (region.width <= 0 || region.height <= 0) {
        bg.destroy()
        layer.draw()
        paperLayer.visible(true)
        paperLayer.batchDraw()
        return null
      }

      var url = stage.toDataURL({
        x: region.x, y: region.y,
        width: region.width, height: region.height,
        pixelRatio: 2,
        mimeType: 'image/png'
      })

      bg.destroy()
      layer.draw()
      paperLayer.visible(true)
      paperLayer.batchDraw()

      return {
        url: url,
        width: Math.round(region.width * 2),
        height: Math.round(region.height * 2)
      }
    }

    function buildCroppedPNG() {
      return exportStageRegion(getStrokesBBox())
    }

    function buildFullCanvasPNG() {
      if (!layer.find('Line').length) return null
      return exportStageRegion({
        x: 0,
        y: 0,
        width: baseWidth,
        height: contentHeight
      })
    }

    function resizeDataUrlIfNeeded(dataUrl, callback) {
      var img = new Image()
      img.onload = function () {
        var w = img.naturalWidth
        var h = img.naturalHeight
        var maxEdge = Math.max(w, h)
        if (!w || !h || maxEdge <= MAX_OCR_EDGE) {
          callback(dataUrl)
          return
        }
        var scale = MAX_OCR_EDGE / maxEdge
        var canvas = document.createElement('canvas')
        canvas.width = Math.round(w * scale)
        canvas.height = Math.round(h * scale)
        var ctx2d = canvas.getContext('2d')
        ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height)
        callback(canvas.toDataURL('image/png'))
      }
      img.onerror = function () { callback(dataUrl) }
      img.src = dataUrl
    }

    function dispatchHandwritingSubmit(md) {
      if (block.onSubmit && window.AIClassInteractionGate) {
        window.AIClassInteractionGate.submit('handwriting', md, block, ctx && ctx.config)
        return
      }
      console.warn('[handwriting] submit dropped: no onSubmit handler')
      throw new Error('handwriting submit handler missing')
    }

    var OCR_FAIL_HINT = '识别未成功，请写清楚后重新提交'
    var DISPATCH_FAIL_HINT = '提交失败，请重试'
    var OCR_MIN_EDGE = 160

    function getOcrProvider() {
      if (ocr && typeof ocr === 'object' && ocr.provider &&
          typeof ocr.provider.recognize === 'function') {
        return ocr.provider
      }
      var providers = window.AIClassProviders || {}
      return providers.ocr && typeof providers.ocr.recognize === 'function'
        ? providers.ocr
        : null
    }

    function pickOcrTextFromResponse(data) {
      if (!data || !window.AIClassSubmitText) return ''
      if (typeof AIClassSubmitText.pickHandwriteOcrFromResponse === 'function') {
        return AIClassSubmitText.pickHandwriteOcrFromResponse(data)
      }
      return typeof AIClassSubmitText.pickHandwritingOcrFromResponse === 'function'
        ? AIClassSubmitText.pickHandwritingOcrFromResponse(data)
        : ''
    }

    function dataUrlToBlob(dataUrl) {
      var parts = String(dataUrl || '').split(',')
      var mimeMatch = parts[0] && parts[0].match(/:(.*?);/)
      var mime = (mimeMatch && mimeMatch[1]) || 'image/png'
      var bin = atob(parts[1] || '')
      var arr = new Uint8Array(bin.length)
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
      return new Blob([arr], { type: mime })
    }

    function prepareOcrDataUrlAsync(dataUrl) {
      return new Promise(function (resolve) {
        var img = new Image()
        img.onload = function () {
          var w = img.naturalWidth
          var h = img.naturalHeight
          if (!w || !h) { resolve(dataUrl); return }
          var minEdge = Math.min(w, h)
          var maxEdge = Math.max(w, h)
          var scale = 1
          if (minEdge < OCR_MIN_EDGE) scale = OCR_MIN_EDGE / minEdge
          if (maxEdge * scale > MAX_OCR_EDGE) scale = MAX_OCR_EDGE / maxEdge
          if (scale <= 1.01) { resolve(dataUrl); return }
          var canvas = document.createElement('canvas')
          canvas.width = Math.round(w * scale)
          canvas.height = Math.round(h * scale)
          var ctx2d = canvas.getContext('2d')
          ctx2d.fillStyle = '#ffffff'
          ctx2d.fillRect(0, 0, canvas.width, canvas.height)
          ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = function () { resolve(dataUrl) }
        img.src = dataUrl
      })
    }

    /** OCR 由宿主 provider 实现；引擎不保存 endpoint 或 API key。 */
    function ocrRecognizeDataUrl(dataUrl) {
      var provider = getOcrProvider()
      if (!provider) return Promise.reject(new Error('OCR provider not configured'))
      return prepareOcrDataUrlAsync(dataUrl).then(function (sizedUrl) {
        return provider.recognize({
          dataUrl: sizedUrl,
          blob: dataUrlToBlob(sizedUrl),
          fileName: 'handwriting.png',
          toolType: 'hand_write',
          language: 'CHN_ENG'
        })
      }).then(function (data) {
        if (typeof data === 'string') return data.trim()
        return pickOcrTextFromResponse(data)
      })
    }

    function buildOcrImage() {
      return buildCroppedPNG() || buildFullCanvasPNG()
    }

    function runOcrBatch(dataUrls, source, opts) {
      opts = opts || {}
      var dataUrl = dataUrls && dataUrls[0]
      if (!dataUrl) {
        finishSubmitFailed(OCR_FAIL_HINT)
        return
      }

      var batchGen = submitGeneration
      var submitMeta = {
        source: source || (pendingSubmit && pendingSubmit.source) || 'canvas',
        imageUrl: (pendingSubmit && pendingSubmit.imageUrl) || dataUrl,
        modal: opts.modal || (pendingSubmit && pendingSubmit.modal) || null
      }

      if (!opts.skipEnterSubmitting) {
        enterSubmitting(submitMeta.source, dataUrl, opts.modal || null)
        if (pendingSubmit && pendingSubmit.source) submitMeta.source = pendingSubmit.source
        if (pendingSubmit && pendingSubmit.imageUrl) submitMeta.imageUrl = pendingSubmit.imageUrl
        if (pendingSubmit && pendingSubmit.modal) submitMeta.modal = pendingSubmit.modal
      }

      function onOcrSuccess(text) {
        if (isSubmitAborted(batchGen)) return
        if (cfg.pretendSubmit) {
          finishSubmitSuccess(text, submitMeta)
          return
        }
        try {
          dispatchHandwritingSubmit(text)
        } catch (err) {
          console.error('[handwriting] dispatch failed:', err)
          if (!isSubmitAborted(batchGen)) finishSubmitFailed(DISPATCH_FAIL_HINT)
          return
        }
        if (isSubmitAborted(batchGen)) return
        finishSubmitSuccess(text, submitMeta)
      }

      ocrRecognizeDataUrl(dataUrl).then(function (text) {
        if (isSubmitAborted(batchGen)) return
        if (text) {
          onOcrSuccess(text)
          return
        }
        console.warn('[handwriting] OCR returned empty text')
        finishSubmitFailed(OCR_FAIL_HINT)
      }).catch(function (err) {
        if (isSubmitAborted(batchGen)) return
        console.error('[handwriting] OCR error:', err)
        if (err && (err.status === 401 || String(err.message || '').indexOf('401') >= 0)) {
          console.warn('[handwriting] HW_API_KEY 无效或已过期，请在智谱控制台重新生成并更新 lesson/config.local.js')
        }
        finishSubmitFailed(OCR_FAIL_HINT)
      })
    }

    function showPreviewAndOcr(imageResult, opts) {
      opts = opts || {}
      var source = opts.source || 'canvas'
      var cancelLabel = source === 'upload' ? '取消上传' : '继续编辑'
      var ocrUrls = opts.ocrUrls || [imageResult.url]
      var dataUrl = ocrUrls[0]
      if (!dataUrl) {
        finishSubmitFailed(OCR_FAIL_HINT)
        return
      }

      enterSubmitting(source, dataUrl)

      var modal = document.createElement('div')
      modal.className = 'hw-modal'
      modal.innerHTML = '<div class="hw-modal-card hw-modal-card--split">'
        + '<div class="hw-modal-body hw-modal-body--split">'
        + '  <div class="hw-modal-preview-left">'
        + '    <div class="hw-modal-ocr-label">手写原图</div>'
        + '    <div class="hw-modal-imgwrap">'
        + '      <div class="hw-modal-img-inner">'
        + '        <img src="' + imageResult.url + '" alt="手写预览">'
        + '      </div>'
        + '    </div>'
        + '  </div>'
        + '  <div class="hw-modal-preview-right">'
        + '    <div class="hw-modal-ocr-label">识别结果</div>'
        + '    <div class="hw-modal-ocr-text" data-role="ocr-text">'
        + '      <span class="hw-ocr-loading">识别中…</span>'
        + '    </div>'
        + '  </div>'
        + '</div>'
        + '<div class="hw-modal-actions">'
        + '  <button data-action="cancel" class="hw-btn-cancel" disabled>' + cancelLabel + '</button>'
        + '  <button data-action="confirm" class="hw-btn-primary" disabled>确认提交</button>'
        + '</div>'
        + '</div>'
      document.body.appendChild(modal)
      el._hwActiveModal = modal

      requestAnimationFrame(function () {
        var card = modal.querySelector('.hw-modal-card')
        if (card) card.classList.add('hw-modal-card--open')
      })

      var ocrTextEl = modal.querySelector('[data-role="ocr-text"]')
      var confirmBtn = modal.querySelector('[data-action="confirm"]')
      var cancelBtn = modal.querySelector('[data-action="cancel"]')
      var ocrText = ''
      var ocrDone = false
      var ocrError = false
      var finalizing = false

      var batchGen = submitGeneration

      function resolveOcr(raw) {
        if (isSubmitAborted(batchGen)) return
        ocrDone = true
        if (raw) {
          ocrText = raw
          ocrTextEl.textContent = raw
          confirmBtn.disabled = false
          cancelBtn.disabled = false
        } else {
          ocrError = true
          ocrTextEl.innerHTML = '<span class="hw-ocr-error">' + OCR_FAIL_HINT.replace('，请写清楚后重新提交', '') + '，请重写后重试</span>'
          cancelBtn.disabled = false
        }
      }

      function rejectOcr(err) {
        if (isSubmitAborted(batchGen)) return
        ocrDone = true
        ocrError = true
        ocrTextEl.innerHTML = '<span class="hw-ocr-error">识别失败，请重写后重试</span>'
        cancelBtn.disabled = false
        console.error('[handwriting] OCR error:', err)
        if (err && (err.status === 401 || String(err.message || '').indexOf('401') >= 0)) {
          console.warn('[handwriting] HW_API_KEY 无效或已过期，请在智谱控制台重新生成并更新 lesson/config.local.js')
        }
      }

      if (cfg.pretendSubmit) {
        setTimeout(function () {
          resolveOcr('(模拟识别结果)')
        }, 600)
      } else {
        ocrRecognizeDataUrl(dataUrl).then(resolveOcr)['catch'](rejectOcr)
      }

      modal.addEventListener('click', function (e) {
        if (finalizing) return
        if (e.target === modal || e.target.getAttribute('data-action') === 'cancel') {
          if (cancelBtn.disabled) return
          abortActiveSubmit()
          modal.remove()
          return
        }
        if (e.target.getAttribute('data-action') === 'confirm') {
          if (confirmBtn.disabled || !ocrDone || ocrError) return
          confirmBtn.disabled = true
          if (cancelBtn) cancelBtn.disabled = true
          finalizing = true
          confirmBtn.classList.add('hw-loading')
          confirmBtn.textContent = '提交中…'
          modal.classList.add('hw-modal--submitting')

          var submitMeta = { source: source, imageUrl: dataUrl, modal: modal }
          if (cfg.pretendSubmit) {
            setTimeout(function () {
              finishSubmitSuccess(ocrText, submitMeta)
            }, 400)
            return
          }
          try {
            dispatchHandwritingSubmit(ocrText)
          } catch (err) {
            console.error('[handwriting] dispatch failed:', err)
            if (!isSubmitAborted(batchGen)) finishSubmitFailed(DISPATCH_FAIL_HINT)
            return
          }
          if (isSubmitAborted(batchGen)) return
          finishSubmitSuccess(ocrText, submitMeta)
        }
      })
    }

    function doSubmit() {
      if (!interactive || isSubmitting || uploadLocked) return
      if (ocr && !getOcrProvider()) {
        flashStatus('未配置 OCR provider')
        return
      }
      var image = buildOcrImage()
      if (!image || !image.url) { flashStatus('没有手写内容'); return }
      showPreviewAndOcr(image, { source: 'canvas', ocrUrls: [image.url] })
    }

    function handleFileUpload(file) {
      if (!interactive || isSubmitting || uploadLocked) {
        if (uploadLocked) flashStatus('请先清空后重新拍照')
        return
      }
      if (!file) return
      if (!file.type || file.type.indexOf('image/') !== 0) {
        flashStatus('请选择图片文件')
        return
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        flashStatus('图片不能超过 10MB')
        return
      }
      dismissZoneMask()
      var reader = new FileReader()
      reader.onload = function () {
        resizeDataUrlIfNeeded(reader.result, function (dataUrl) {
          showPreviewAndOcr({ url: dataUrl }, { source: 'upload' })
        })
      }
      reader.onerror = function () { flashStatus('读取图片失败') }
      reader.readAsDataURL(file)
    }

    toolbarEl.querySelectorAll('[data-tool]').forEach(function (btn) {
      if (!interactive) {
        btn.disabled = true
        return
      }
      btn.addEventListener('click', function () { setTool(btn.getAttribute('data-tool')) })
    })
    if (!interactive) {
      scrollEl.style.cursor = 'default'
      toolbarEl.querySelectorAll('button').forEach(function (btn) { btn.disabled = true })
    }

    var undoBtn = toolbarEl.querySelector('[data-role="undo"]')
    if (undoBtn) undoBtn.addEventListener('click', function () {
      if (!interactive || isSubmitting) return
      var action = undoStack.pop()
      if (!action) return
      if (action.type === 'add') {
        action.line.remove()
      } else if (action.type === 'deleteMany') {
        action.lines.forEach(function (line) { layer.add(line) })
      } else {
        layer.add(action.line)
      }
      redoStack.push(action)
      layer.batchDraw(); refreshButtons(); scheduleSave(); updatePlaceholder()
    })

    var redoBtn = toolbarEl.querySelector('[data-role="redo"]')
    if (redoBtn) redoBtn.addEventListener('click', function () {
      if (!interactive || isSubmitting) return
      var action = redoStack.pop()
      if (!action) return
      if (action.type === 'add') {
        layer.add(action.line)
      } else if (action.type === 'deleteMany') {
        action.lines.forEach(function (line) { line.remove() })
      } else {
        action.line.remove()
      }
      undoStack.push(action)
      layer.batchDraw(); refreshButtons(); scheduleSave(); updatePlaceholder()
    })

    var workspaceEl = el.querySelector('.hw-workspace') || el

    function closeClearPopover() {
      var pop = el.querySelector('[data-role="clear-popover"]')
      if (pop) pop.hidden = true
      workspaceEl.classList.remove('hw-workspace--clear-open')
      if (toolbarEl) toolbarEl.classList.remove('hw-toolbar--clear-open')
    }

    function confirmClear() {
      closeClearPopover()
      layer.destroyChildren()
      undoStack.length = 0
      redoStack.length = 0
      contentHeight = INIT_HEIGHT
      uploadLocked = false
      removeLockedUpload()
      setSubmitControls(false)
      refreshStage()
      refreshButtons()
      save()
      updatePlaceholder()
    }

    var clearWrap = el.querySelector('[data-role="clear-wrap"]')
    var clearPopover = el.querySelector('[data-role="clear-popover"]')
    var clearBtn = el.querySelector('[data-role="clear"]')
    function onDocClickCloseClear(e) {
      if (!clearPopover || clearPopover.hidden) return
      if (clearWrap && clearWrap.contains(e.target)) return
      closeClearPopover()
    }
    if (clearBtn && clearPopover) {
      clearBtn.addEventListener('click', function (e) {
        e.stopPropagation()
        if (!interactive || isSubmitting) return
        if (!layer.find('Line').length && !lockedUploadEl) return
        if (!clearPopover.hidden) { closeClearPopover(); return }
        clearPopover.hidden = false
        workspaceEl.classList.add('hw-workspace--clear-open')
        if (toolbarEl) toolbarEl.classList.add('hw-toolbar--clear-open')
      })
      clearPopover.querySelector('[data-action="cancel"]').addEventListener('click', function (e) {
        e.stopPropagation()
        closeClearPopover()
      })
      clearPopover.querySelector('[data-action="confirm"]').addEventListener('click', function (e) {
        e.stopPropagation()
        confirmClear()
      })
      clearPopover.addEventListener('click', function (e) { e.stopPropagation() })
    }
    if (clearWrap) {
      document.addEventListener('click', onDocClickCloseClear)
    }

    if (submitBtn) submitBtn.addEventListener('click', doSubmit)

    if (demoBtn) {
      demoBtn.addEventListener('click', function () {
        openDemoEnlarged()
      })
    }

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () { fileInput.click() })
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0]
        fileInput.value = ''
        handleFileUpload(file)
      })
    }

    function onWindowResize() {
      baseWidth = scrollEl.clientWidth
      refreshStage()
      positionDemoTip()
    }
    function onViewportScroll() {
      positionDemoTip()
    }
    window.addEventListener('resize', onWindowResize)
    window.addEventListener('scroll', onViewportScroll, true)

    // 滚轮只滚动答题区；遮罩未消失时禁止滚动，且不把滚轮传给外层
    function onScrollWheel(e) {
      e.preventDefault()
      e.stopPropagation()
      if (zoneMaskDismissed) scrollEl.scrollTop += e.deltaY
    }
    scrollEl.addEventListener('wheel', onScrollWheel, { passive: false })

    function teardownHandwriting() {
      abortActiveSubmit()
      closeDemoModal()
      pauseDemoTipPreview()
      hideDemoTip()
      if (demoTipEl && demoTipEl.parentNode === document.body) {
        demoTipEl.parentNode.removeChild(demoTipEl)
      }
      window.removeEventListener('pointerup', finishStroke)
      window.removeEventListener('pointercancel', finishStroke)
      window.removeEventListener('resize', onWindowResize)
      window.removeEventListener('scroll', onViewportScroll, true)
      scrollEl.removeEventListener('wheel', onScrollWheel)
      document.removeEventListener('click', onDocClickCloseClear)
      hideEraserCursor()
      if (eraserCursorEl && eraserCursorEl.parentNode) eraserCursorEl.parentNode.removeChild(eraserCursorEl)
      if (saveTimer) clearTimeout(saveTimer)
      if (statusTimer) clearTimeout(statusTimer)
      try { if (stage) stage.destroy() } catch (e) { /* ignore */ }
      el._hwAbortSubmit = null
      el._hwTeardown = null
      el._hwHideDemoTip = null
      el._hwCloseDemoUi = null
    }

    el._hwAbortSubmit = abortActiveSubmit
    el._hwTeardown = teardownHandwriting
    el._hwHideDemoTip = hideDemoTip
    el._hwCloseDemoUi = closeDemoUi

    restore()
    refreshStage()
    refreshButtons()
    if (!interactive) dismissZoneMask()
    else lockScrollForZoneMask()

    requestAnimationFrame(function () {
      var cw = scrollEl.clientWidth
      if (cw > 0 && cw !== baseWidth) {
        baseWidth = cw
        refreshStage()
      }
      positionDemoTip()
    })
  }

  function storageKeyFor(stepId, block) {
    if (block && block.logAction && String(stepId).indexOf('runtime:') === 0) {
      return 'handwriting:runtime:' + block.logAction
    }
    return 'handwriting:' + stepId
  }

  function clearHandwritingStorage(stepId) {
    var key = String(stepId).indexOf('handwriting:') === 0 ? stepId : storageKeyFor(stepId)
    try { localStorage.removeItem(key) } catch (e) {}
  }

  function clearAllHandwritingStorage() {
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i)
        if (k && k.indexOf('handwriting:') === 0) localStorage.removeItem(k)
      }
    } catch (e) {}
  }

  function pauseDemoTipElement(tip) {
    if (!tip) return
    var video = tip.querySelector('[data-role="demo-tip-video"]')
    if (video) video.pause()
  }

  function forceHideDemoTipElement(tip) {
    if (!tip) return
    pauseDemoTipElement(tip)
    tip.hidden = true
    tip.style.left = ''
    tip.style.top = ''
  }

  function syncHandwritingDemoTips(activeStepId, rootEl) {
    var scope = rootEl && typeof rootEl.querySelectorAll === 'function' ? rootEl : document
    scope.querySelectorAll('.lf-block-handwriting').forEach(function (block) {
      var sid = block.getAttribute('data-step-id')
      if (activeStepId != null && String(sid) === String(activeStepId)) return
      if (typeof block._hwCloseDemoUi === 'function') block._hwCloseDemoUi()
      else if (typeof block._hwHideDemoTip === 'function') block._hwHideDemoTip()
    })

    document.querySelectorAll('.hw-demo-tip:not([hidden])').forEach(function (tip) {
      var linkedId = tip.dataset.hwStepId
      if (!linkedId) {
        forceHideDemoTipElement(tip)
        return
      }
      var block = document.querySelector('.lf-block-handwriting[data-step-id="' + linkedId + '"]')
      var shouldHide = !block ||
        block.getAttribute('data-is-current-step') !== 'true' ||
        activeStepId == null ||
        String(linkedId) !== String(activeStepId)
      if (shouldHide) forceHideDemoTipElement(tip)
    })
  }

  ns.clearHandwritingStorage = clearHandwritingStorage
  ns.clearAllHandwritingStorage = clearAllHandwritingStorage
  ns.syncHandwritingDemoTips = syncHandwritingDemoTips
  ns.combineOcrRowResults = combineOcrRowResults
  ns.renderHandwriting = function (el, block, runtime, ctx) {
    loadKonva(function () {
      renderHandwriting(el, block, runtime, ctx)
    })
  }

  // 页面刷新时清理所有手写板 localStorage 草稿，恢复初始状态
  clearAllHandwritingStorage()
})()

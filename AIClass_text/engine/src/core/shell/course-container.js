// 统一容器：四种 layout + A/B 排版 + appendBlocks
;(function () {
  var LAYOUTS = ['text-only']
  var SPLIT_LAYOUTS = { 'top-split': true, 'left-right': true }
  var TOP_SPLIT_REGIONS = { top: true, left: true, right: true }

  function toCssSize(value) {
    if (value == null || value === '') return null
    return typeof value === 'number' ? value + 'px' : String(value)
  }

  function applyParams(el, layoutParams, style) {
    layoutParams = layoutParams || {}
    style = style || {}
    var map = {
      '--cc-edge-pad': toCssSize(layoutParams.edgePad),
      '--cc-scroll-padding': layoutParams.scrollPadding,
      '--cc-gap': toCssSize(layoutParams.gap),
      '--cc-text-max-width': toCssSize(layoutParams.textMaxWidth),
      '--cc-text-align': layoutParams.textAlign,
      '--cc-figure-width': toCssSize(layoutParams.figureWidth),
      '--cc-figure-max-width': toCssSize(layoutParams.figureMaxWidth),
      '--cc-figure-svg-width': toCssSize(layoutParams.figureSvgWidth),
      '--cc-figure-height': layoutParams.figureHeight != null ? toCssSize(layoutParams.figureHeight) : null,
      '--cc-split-left-width': toCssSize(layoutParams.splitLeftWidth),
      '--cc-split-min-height': toCssSize(layoutParams.splitMinHeight),
      '--cc-font': style.fontFamily,
      '--cc-body-size': toCssSize(style.bodySize),
      '--cc-title-size': toCssSize(style.titleSize),
      '--cc-section-size': toCssSize(style.sectionSize),
      '--cc-line-height': style.lineHeight != null ? String(style.lineHeight) : null,
      '--cc-ink': style.ink,
      '--cc-muted': style.muted
    }
    Object.keys(map).forEach(function (key) {
      if (map[key] != null) el.style.setProperty(key, map[key])
    })
  }

  function hasFigureLayout(layout) {
    return layout === 'figure-text' || layout === 'text-over-figure'
  }

  function normalizeRegion(block, layout) {
    if (layout === 'text-only') {
      var tr = block.region || block.zone || 'main'
      if (tr === 'top') return 'top'
      return 'main'
    }
    if (!SPLIT_LAYOUTS[layout]) return 'main'
    if (layout === 'left-right') {
      var lr = block.region || block.zone || 'right'
      if (lr === 'top') return 'top'
      if (lr === 'pinned' || lr === 'overlay' || lr === 'bottom') return 'right'
      if (lr === 'bottom-right' || lr === 'right') return 'right'
      return 'right'
    }
    var raw = block.region || block.zone || 'top'
    if (raw === 'bottom-left' || raw === 'left') return 'left'
    if (raw === 'bottom-right' || raw === 'right') return 'right'
    return TOP_SPLIT_REGIONS[raw] ? raw : 'top'
  }

  function scrollTargetFor(container, region) {
    if (container.layout === 'text-only') {
      if (region === 'top') return container.scrollEl
      return container.scrollStackEl || container.scrollRightEl || container.scrollEl
    }
    if (!SPLIT_LAYOUTS[container.layout]) return container.scrollEl
    if (container.layout === 'left-right') {
      if (region === 'top') return container.scrollEl
      return container.scrollStackEl || container.scrollRightEl
    }
    if (region === 'left') return container.scrollLeftEl || container.scrollRightEl
    if (region === 'right') return container.scrollRightEl
    return container.scrollEl
  }

  function allScrollEls(container) {
    if (container.layout === 'text-only') {
      return [container.scrollEl, container.scrollRightEl, container.scrollStackEl].filter(Boolean)
    }
    if (!SPLIT_LAYOUTS[container.layout]) {
      return container.scrollEl ? [container.scrollEl] : []
    }
    if (container.layout === 'left-right') {
      return [container.scrollEl, container.scrollRightEl, container.scrollStackEl].filter(Boolean)
    }
    return [container.scrollEl, container.scrollLeftEl, container.scrollRightEl].filter(Boolean)
  }

  function forEachBlockInContainer(container, fn) {
    allScrollEls(container).forEach(function (scrollEl) {
      scrollEl.querySelectorAll('.lf-block').forEach(fn)
    })
    if (container.guidePanelEl) {
      container.guidePanelEl.querySelectorAll('.lf-block').forEach(fn)
    }
  }

  function removeStepBlocks(container, stepId) {
    if (stepId == null) return
    var sel = '.lf-block[data-step-id="' + String(stepId) + '"]'
    allScrollEls(container).forEach(function (scrollEl) {
      scrollEl.querySelectorAll(sel).forEach(function (node) {
        node.parentNode.removeChild(node)
      })
    })
    if (container.guidePanelEl) {
      container.guidePanelEl.querySelectorAll(sel).forEach(function (node) {
        node.parentNode.removeChild(node)
      })
    }
  }

  function removeReplaceKeyBlocks(container, replaceKey) {
    if (replaceKey == null || replaceKey === '') return
    var expected = String(replaceKey)
    forEachBlockInContainer(container, function (node) {
      if (node.getAttribute('data-replace-key') !== expected) return
      if (node.parentNode) node.parentNode.removeChild(node)
    })
  }

  function findReplaceKeyBlock(container, replaceKey, target) {
    if (replaceKey == null || replaceKey === '') return null
    var expected = String(replaceKey)
    if (target && target.querySelectorAll) {
      var inTarget = target.querySelectorAll('.lf-block[data-replace-key]')
      for (var i = 0; i < inTarget.length; i++) {
        if (inTarget[i].getAttribute('data-replace-key') === expected) return inTarget[i]
      }
    }
    var found = null
    forEachBlockInContainer(container, function (node) {
      if (node.getAttribute('data-replace-key') === expected) found = node
    })
    return found
  }

  function ensureStackNodeBeforeSpacer(stack, node) {
    if (!stack || !node) return
    var spacer = stack.querySelector('.sf-scroll-spacer')
    if (!node.parentNode || node.parentNode !== stack) {
      if (spacer && spacer.parentNode === stack) stack.insertBefore(node, spacer)
      else stack.appendChild(node)
      return
    }
    if (spacer && spacer.parentNode === stack &&
        (node.compareDocumentPosition(spacer) & Node.DOCUMENT_POSITION_PRECEDING)) {
      stack.insertBefore(node, spacer)
    }
  }

  function appendFigureBody(content, scrollEl, figureSlot, layout) {
    if (figureSlot && layout === 'figure-text') {
      content.appendChild(figureSlot)
      content.appendChild(scrollEl)
    } else if (figureSlot && layout === 'text-over-figure') {
      content.appendChild(scrollEl)
      content.appendChild(figureSlot)
    } else {
      content.appendChild(scrollEl)
    }
  }

  function renderStubBlock(block, ctx) {
    var type = block.type || 'text'
    var el = document.createElement('div')
    el.className = 'lf-block lf-block-' + type + ' course-stub-block'
    if (ctx && ctx.stepId != null) el.setAttribute('data-step-id', ctx.stepId)
    el.setAttribute('data-block-type', type)
    el.setAttribute('data-is-current-step', ctx && ctx.isCurrentStep ? 'true' : 'false')

    if (type === 'text') {
      var align = block.align || null
      if (align) el.style.textAlign = align
      if (block.size === 'large') {
        el.style.fontSize = 'calc(var(--cc-body-size, var(--lf-body-size, 24px)) * 1.25)'
      }
      ;(block.lines || []).forEach(function (line) {
        var p = document.createElement('p')
        p.className = 'lf-text-line course-stub-line'
        p.textContent = line
        el.appendChild(p)
      })
      if (!block.lines || !block.lines.length) {
        el.textContent = block.text || ''
      }
    } else if (type === 'section') {
      el.className += ' lf-block-section'
      el.textContent = block.title || block.text || type
      if (block.color) el.setAttribute('data-color', block.color)
    } else {
      el.textContent = '[' + type + '] ' + (block.title || block.text || '')
    }
    return el
  }

  function CourseContainer(options) {
    options = options || {}
    this.layout = options.layout || 'text-only'
    this.layoutParams = options.layoutParams || {}
    this.style = options.style || {}
    this.meta = options.meta || {}
    this.figureDef = options.figure || null
    this.el = null
    this.bodyEl = null
    this.scrollEl = null
    this.scrollLeftEl = null
    this.scrollRightEl = null
    this.scrollStackEl = null
    this.figureSlot = null
    this.figureHost = null
    this.instanceId = options.instanceId || ('course-container-' + Date.now())
    this.textAccumulate = options.textAccumulate === true
    this.guidanceLayout = 'interleaved'
    this.guidanceChainEl = null
    this.guideSlotEls = null
  }

  CourseContainer.prototype.getElement = function () { return this.el }
  CourseContainer.prototype.getInstanceId = function () { return this.instanceId }
  CourseContainer.prototype.getScrollEl = function () { return this.scrollEl }
  CourseContainer.prototype.getFollowScrollEl = function () {
    if (this.layout === 'left-right' || this.layout === 'top-split' || this.layout === 'text-only') {
      return this.scrollRightEl || null
    }
    return null
  }

  CourseContainer.prototype.getFigureSlot = function () { return this.figureSlot }

  CourseContainer.prototype.clearStepBlocks = function (stepIds, retainIds) {
    var self = this
    ;(stepIds || []).forEach(function (stepId) {
      if (retainIds && retainIds.indexOf(stepId) >= 0) return
      removeStepBlocks(self, stepId)
    })
  }

  CourseContainer.prototype.applyStemClass = function (spec) {
    if (!spec || !spec.selector || !this.el) return
    this.el.querySelectorAll(spec.selector).forEach(function (node) {
      if (spec.remove) {
        String(spec.remove).split(/\s+/).forEach(function (cls) {
          if (cls) node.classList.remove(cls)
        })
      }
      if (spec.add) {
        var classes = String(spec.add).split(/\s+/).filter(Boolean)
        if (spec.restart) {
          classes.forEach(function (cls) {
            if (cls.indexOf('--flash') >= 0) node.classList.remove(cls)
          })
          void node.offsetWidth
        }
        classes.forEach(function (cls) {
          node.classList.add(cls)
        })
      }
    })
  }

  CourseContainer.prototype.placeGuidanceInStack = function () {
    if (!this.scrollStackEl) return
    var stack = this.scrollStackEl

    if (this.guidanceLayout === 'interleaved') {
      var panel = this.guidePanelEl
      if (!panel) return
      ensureStackNodeBeforeSpacer(stack, panel)
      return
    }

    if (!this.guidanceChainEl) return
    ensureStackNodeBeforeSpacer(stack, this.guidanceChainEl)
  }

  CourseContainer.prototype.appendBlocks = function (blocks, ctx) {
    ctx = ctx || {}
    var out = []
    var self = this
    var layout = this.layout

    if (ctx.replaceExistingStep && ctx.stepId != null) {
      removeStepBlocks(this, ctx.stepId)
    }

    ;(blocks || []).forEach(function (block, index) {
      block = block || {}
      block.__stepId = block.__stepId != null ? block.__stepId : ctx.stepId
      block.__isCurrentStep = ctx.isCurrentStep !== false
      block.__localIndex = index

      var region = normalizeRegion(block, layout)
      var target = scrollTargetFor(self, region)
      if (self.guidanceLayout === 'interleaved' && ctx.group != null &&
          self.guideSlotEls && self.guideSlotEls[ctx.group] &&
          (region === 'main' || region === 'right')) {
        target = self.guideSlotEls[ctx.group]
      }
      if (!target) return

      var replaceKey = block.replaceKey != null && block.replaceKey !== '' ? String(block.replaceKey) : null
      var existingEl = replaceKey ? findReplaceKeyBlock(self, replaceKey, target) : null
      var renderCtx = {
        config: ctx.config || {},
        instant: ctx.instant === true,
        currentStepId: ctx.stepId,
        runner: ctx.runner || null
      }

      var el
      if (existingEl) {
        if (window.AIClassWidgetRegistry &&
            typeof window.AIClassWidgetRegistry.renderBlock === 'function') {
          existingEl.innerHTML = ''
          el = window.AIClassWidgetRegistry.renderBlock(block, renderCtx, index, existingEl)
        } else {
          existingEl.innerHTML = ''
          var fresh = renderStubBlock(block, ctx)
          existingEl.className = fresh.className
          while (fresh.firstChild) existingEl.appendChild(fresh.firstChild)
          el = existingEl
        }
        if (replaceKey) el.setAttribute('data-replace-key', replaceKey)
        if (block.__stepId != null) el.setAttribute('data-step-id', block.__stepId)
        el.setAttribute('data-is-current-step', block.__isCurrentStep ? 'true' : 'false')
        out.push(el)
        return
      }

      if (window.AIClassWidgetRegistry && typeof window.AIClassWidgetRegistry.renderBlock === 'function') {
        el = window.AIClassWidgetRegistry.renderBlock(block, renderCtx, index)
      } else {
        el = renderStubBlock(block, ctx)
      }

      if (el) {
        if (replaceKey) {
          el.setAttribute('data-replace-key', replaceKey)
        }
        if (target === self.scrollStackEl && target.querySelector) {
          var scrollSpacer = target.querySelector('.sf-scroll-spacer')
          if (scrollSpacer) target.insertBefore(el, scrollSpacer)
          else target.appendChild(el)
        } else {
          target.appendChild(el)
        }
        out.push(el)
      }
    })

    if (window.AIClassLatex) {
      allScrollEls(this).forEach(function (scrollEl) {
        window.AIClassLatex.render(scrollEl)
      })
    }
    if (this.guidanceLayout === 'interleaved') {
      if (this.layout === 'text-only') this.placeGuidanceInStack()
    } else if (this.layout === 'left-right' || this.layout === 'text-only') {
      this.placeGuidanceInStack()
      if (this.scrollStackEl) {
        var tailSpacer = this.scrollStackEl.querySelector('.sf-scroll-spacer')
        if (tailSpacer && tailSpacer.parentNode === this.scrollStackEl &&
            tailSpacer !== this.scrollStackEl.lastElementChild) {
          this.scrollStackEl.appendChild(tailSpacer)
        }
      }
    }
    if (self.scrollRightEl && self.scrollRightEl._overlayScrollbarApi &&
        typeof self.scrollRightEl._overlayScrollbarApi.sync === 'function') {
      self.scrollRightEl._overlayScrollbarApi.sync()
    }
    return out
  }

  CourseContainer.prototype._photoAnswerTarget = function () {
    if (this.layout === 'left-right' || this.layout === 'text-only') {
      return this.scrollStackEl || this.scrollRightEl
    }
    if (this.layout === 'top-split') return this.scrollRightEl || this.scrollEl
    return this.scrollEl
  }

  CourseContainer.prototype.showPhotoAnswer = function (onPhotoRequest) {
    var target = this._photoAnswerTarget()
    if (!target || !window.AIClassPhotoAnswer) return null

    this.clearPhotoAnswer()
    var card = AIClassPhotoAnswer.create(onPhotoRequest)
    target.insertBefore(card, target.firstChild)
    if (target.scrollTop != null) target.scrollTop = 0
    return card
  }

  CourseContainer.prototype.showPhotoResult = function (content) {
    var target = this._photoAnswerTarget()
    if (!target || !window.AIClassPhotoAnswer) return false
    var card = target.querySelector('.cc-photo-answer')
    return !!(card && AIClassPhotoAnswer.showResult(card, content))
  }

  CourseContainer.prototype.clearPhotoAnswer = function () {
    var target = this._photoAnswerTarget()
    if (!target || !target.querySelectorAll) return
    target.querySelectorAll('.cc-photo-answer').forEach(function (node) {
      if (node.parentNode) node.parentNode.removeChild(node)
    })
  }

  CourseContainer.prototype.setFigureState = function (state, opts) {
    opts = opts || {}
    if (this.figureHost && typeof this.figureHost.setState === 'function') {
      this.figureHost.setState(state, {
        stepId: opts.stepId,
        instant: opts.instant === true,
        action: opts.action || null
      })
      return
    }
    if (this.figureSlot && state) {
      this.figureSlot.setAttribute('data-figure-state', JSON.stringify(state))
      if (!this.figureSlot.querySelector('.course-figure-placeholder')) {
        var label = document.createElement('div')
        label.className = 'course-figure-placeholder'
        label.textContent = 'figure'
        this.figureSlot.appendChild(label)
      }
    }
  }

  CourseContainer.prototype._syncChoiceBlocks = function (activeStepId) {
    allScrollEls(this).forEach(function (scrollEl) {
      scrollEl.querySelectorAll('.lf-block[data-block-type="choice"]').forEach(function (block) {
        var api = block._choiceApi
        if (!api || typeof api.setRevealed !== 'function') return
        var sid = block.getAttribute('data-step-id')
        var isActive = activeStepId != null && String(sid) === String(activeStepId)
        var answer = block._choiceAnswer
        if (answer == null) {
          var raw = block.getAttribute('data-choice-answer')
          if (raw != null && raw !== '') {
            try {
              answer = raw.charAt(0) === '[' ? JSON.parse(raw) : raw
            } catch (err) {
              answer = raw
            }
          }
        }
        if (!isActive && answer != null && answer !== '') {
          api.setRevealed(true, answer)
        } else if (isActive) {
          api.setRevealed(false)
        }
      })
    })
  }

  CourseContainer.prototype.finalizeInteractions = function (activeStepId) {
    forEachBlockInContainer(this, function (block) {
      var sid = block.getAttribute('data-step-id')
      var isActive = activeStepId != null && String(sid) === String(activeStepId)
      block.setAttribute('data-is-current-step', isActive ? 'true' : 'false')
      ;(block.querySelectorAll ? block.querySelectorAll('.aic-button-submit') : []).forEach(function (button) {
        button.hidden = !isActive
        button.disabled = !isActive
      })
    })
    this._syncChoiceBlocks(activeStepId)
    if (window.AIClassComponent && typeof window.AIClassComponent.syncMathKeyboard === 'function') {
      window.AIClassComponent.syncMathKeyboard()
    }
  }

  CourseContainer.prototype._applyGuideNodeState = function (node, n, idx, opts) {
    if (!node) return
    var descEl = node.querySelector('.cc-guide-desc')
    node.classList.remove('is-active', 'is-done', 'is-pending', 'is-hidden')
    if (n > idx) {
      node.classList.add('is-hidden')
      if (descEl) {
        var hiddenDefault = descEl.getAttribute('data-default-desc')
        if (hiddenDefault != null) descEl.textContent = hiddenDefault
      }
      return false
    }
    if (n < idx) node.classList.add('is-done')
    else node.classList.add('is-active')
    if (descEl) {
      var defaultDesc = descEl.getAttribute('data-default-desc')
      if (n === idx && opts.desc != null) {
        descEl.textContent = opts.desc
        if (opts.persistDesc !== false) {
          descEl.setAttribute('data-default-desc', opts.desc)
        }
      } else if (defaultDesc != null) {
        descEl.textContent = defaultDesc
      }
    }
    return true
  }

  CourseContainer.prototype._syncGuideRailEnds = function () {
    var panel = this.guidePanelEl
    if (!panel) return
    var sections = panel.querySelectorAll('.cc-guide-section')
    var slots = panel.querySelectorAll('.cc-guide-slot')
    var visibleSections = []
    sections.forEach(function (section) {
      section.classList.remove('is-rail-start', 'is-rail-end')
      if (!section.classList.contains('is-hidden')) visibleSections.push(section)
    })
    slots.forEach(function (slot) {
      slot.classList.remove('is-rail-end')
    })
    // 首环只向下出茎、末环只向上接茎；中间环全高贯通。圆点叠在茎上。
    if (!visibleSections.length) return
    var first = visibleSections[0]
    var last = visibleSections[visibleSections.length - 1]
    first.classList.add('is-rail-start')
    last.classList.add('is-rail-end')
    var lastGroup = last.getAttribute('data-guide-group')
    var lastSlot = panel.querySelector('.cc-guide-slot[data-guide-group="' + lastGroup + '"]')
    if (lastSlot) lastSlot.classList.add('is-rail-end')
  }

  CourseContainer.prototype._syncInterleavedGuidancePanel = function (idx) {
    if (!this.guidePanelEl) return
    var panel = this.guidePanelEl
    var visibleCount = 0
    var slots = panel.querySelectorAll('.cc-guide-slot')
    slots.forEach(function (slot) {
      var n = parseInt(slot.getAttribute('data-guide-group'), 10)
      var showSlot = n <= idx
      slot.classList.toggle('is-hidden', !showSlot)
    })
    var sections = panel.querySelectorAll('.cc-guide-section')
    sections.forEach(function (section) {
      if (!section.classList.contains('is-hidden')) visibleCount++
    })
    panel.classList.toggle('cc-guide-panel--collapsed', visibleCount === 0)
    this._syncGuideRailEnds()
  }

  CourseContainer.prototype._setInterleavedGuidanceGroup = function (idx, opts) {
    if (!this.scrollStackEl) return
    opts = opts || {}
    var sections = this.scrollStackEl.querySelectorAll('.cc-guide-section')
    sections.forEach(function (section) {
      var n = parseInt(section.getAttribute('data-guide-group'), 10)
      var node = section.querySelector('.cc-guide-node')
      var visible = this._applyGuideNodeState(node, n, idx, opts)
      section.classList.toggle('is-hidden', !visible)
    }, this)
    this._syncInterleavedGuidancePanel(idx)
  }

  CourseContainer.prototype._syncGuidanceChainVisibility = function () {
    if (!this.guidanceChainEl) return
    var anyVisible = this.guidanceChainEl.querySelector('.cc-guide-node:not(.is-hidden)')
    this.guidanceChainEl.classList.toggle('cc-guide-chain--collapsed', !anyVisible)
  }

  function findChoiceInstance(subEl, choiceId) {
    if (!subEl || !choiceId) return null
    return subEl.querySelector('.aic-choice-card[data-choice-id="' + String(choiceId) + '"]')
  }

  function renderChoiceSub(subEl, choice, opts) {
    if (!subEl || !choice) return null
    var choiceId = choice.id || 'choice'
    var existing = findChoiceInstance(subEl, choiceId)

    if (existing && opts.append) {
      replaceChoiceBody(existing, choice)
      return existing
    }

    if (existing) existing.remove()

    var card = AIClassComponent.createChoiceCard({
      id: choiceId,
      badge: choice.badge,
      question: choice.question || choice.prompt
    })
    mountChoiceBody(card.querySelector('.aic-choice-card__body'), choice)

    if (opts.append) {
      subEl.appendChild(card)
    } else {
      subEl.innerHTML = ''
      subEl.appendChild(card)
    }
    return card
  }

  function mountChoiceBody(body, choice) {
    if (!window.AIClassComponent || typeof window.AIClassComponent.createChoiceQuestion !== 'function') return
    var gate = window.AIClassInteractionGate
    var enabled = !!(gate && typeof gate.isInteractive === 'function'
      ? gate.isInteractive(choice, { isCurrentStep: true })
      : true)
    var revealed = !!choice.revealed
    var value = choice.value != null ? choice.value : (revealed && choice.answer != null ? choice.answer : null)
    var handlers = (window.AIClassModuleRegistry && window.AIClassModuleRegistry.handlers) || window.LESSON_HANDLERS || {}
    var onSubmitFn = null
    if (choice.onSubmit && typeof handlers[choice.onSubmit] === 'function') {
      onSubmitFn = function (text, selected) { handlers[choice.onSubmit](selected, choice) }
    } else if (typeof choice.onSubmit === 'function') {
      onSubmitFn = function (text, selected) { choice.onSubmit(selected, choice) }
    }
    var c = window.AIClassComponent.createChoiceQuestion({
      options: choice.options || [],
      value: value,
      answer: choice.answer,
      multiple: !!choice.multiple,
      revealed: revealed,
      interactive: enabled && !revealed,
      required: choice.required !== false,
      variant: choice.variant || 'paper',
      actions: enabled && !revealed ? (choice.actions || ['submit']) : false,
      submitText: choice.submitText || '提交',
      resetText: choice.resetText || '重置',
      onSubmit: onSubmitFn
    })
    body.innerHTML = ''
    body.appendChild(c.el)
  }

  function replaceChoiceBody(card, choice) {
    if (!card) return
    AIClassComponent.setChoiceCardQuestion(card, choice.question || choice.prompt || '')
    var body = card.querySelector('.aic-choice-card__body')
    if (!body) return
    mountChoiceBody(body, choice)
  }

  function renderGuideTrack(opts) {
    opts = opts || {}
    var track = document.createElement('div')
    track.className = 'cc-guide-track'
    track.setAttribute('aria-hidden', 'true')
    if (opts.withDot) {
      var dot = document.createElement('span')
      dot.className = 'cc-guide-dot'
      track.appendChild(dot)
    }
    var stem = document.createElement('span')
    stem.className = 'cc-guide-stem'
    track.appendChild(stem)
    return track
  }

  function renderGuideNode(item, idx, opts) {
    opts = opts || {}
    var node = document.createElement('div')
    node.className = 'cc-guide-node is-hidden'
    node.setAttribute('data-guide-idx', String(idx))
    var title = document.createElement('div')
    title.className = 'cc-guide-title'
    title.textContent = idx + '. ' + (item.title || '')
    var desc = document.createElement('div')
    desc.className = 'cc-guide-desc'
    desc.textContent = item.desc || ''
    desc.setAttribute('data-default-desc', item.desc || '')
    node.appendChild(title)
    node.appendChild(desc)
    if (opts.withSub) {
      var sub = document.createElement('div')
      sub.className = 'cc-guide-sub'
      node.appendChild(sub)
    }
    return node
  }

  function mountInterleavedGuidance(scrollStack, chain, container) {
    container.guideSlotEls = {}
    var panel = document.createElement('div')
    panel.className = 'cc-guide-panel'
    scrollStack.appendChild(panel)
    container.guidePanelEl = panel
    ;(chain || []).forEach(function (item, i) {
      var group = i + 1
      var section = document.createElement('div')
      section.className = 'cc-guide-section is-hidden'
      section.setAttribute('data-guide-group', String(group))
      section.appendChild(renderGuideTrack({ withDot: true }))
      section.appendChild(renderGuideNode(item, group))
      panel.appendChild(section)

      var slot = document.createElement('div')
      slot.className = 'cc-guide-slot is-hidden'
      slot.setAttribute('data-guide-group', String(group))
      slot.appendChild(renderGuideTrack({ withDot: false }))
      panel.appendChild(slot)
      container.guideSlotEls[group] = slot
    })
    panel.classList.add('cc-guide-panel--collapsed')
  }

  CourseContainer.prototype.setGuidanceGroup = function (idx, opts) {
    if (idx == null) return
    opts = opts || {}
    if (this.guidanceLayout === 'interleaved') {
      this._setInterleavedGuidanceGroup(idx, opts)
      return
    }
    if (!this.guidanceChainEl) return
    var appendMode = !!opts.append || !!(opts.sub && opts.sub.append)
    var nodes = this.guidanceChainEl.querySelectorAll('.cc-guide-node')
    nodes.forEach(function (node, i) {
      var n = i + 1
      var descEl = node.querySelector('.cc-guide-desc')
      var subEl = node.querySelector('.cc-guide-sub')
      node.classList.remove('is-active', 'is-done', 'is-pending', 'is-hidden')
      if (n > idx) {
        node.classList.add('is-hidden')
        if (descEl) {
          var hiddenDefault = descEl.getAttribute('data-default-desc')
          if (hiddenDefault != null) descEl.textContent = hiddenDefault
        }
        if (subEl && !appendMode) subEl.innerHTML = ''
        return
      }
      if (n < idx) node.classList.add('is-done')
      else node.classList.add('is-active')
      if (descEl) {
        var defaultDesc = descEl.getAttribute('data-default-desc')
        if (n === idx && opts.desc != null) {
          descEl.textContent = opts.desc
          if (opts.persistDesc !== false) {
            descEl.setAttribute('data-default-desc', opts.desc)
          }
        } else if (defaultDesc != null) {
          descEl.textContent = defaultDesc
        }
      }
      if (subEl && n === idx && opts.sub) {
        if (opts.sub.oral) {
          var existingOral = subEl.querySelector('.aic-oral-card')
          if (appendMode && existingOral && opts.sub.answer) {
            AIClassComponent.setOralCardAnswer(existingOral, opts.sub.answer)
          } else if (!(appendMode && existingOral)) {
            if (!appendMode) subEl.innerHTML = ''
            subEl.appendChild(AIClassComponent.createOralCard({
              badge: opts.sub.oral.badge,
              question: opts.sub.oral.question,
              answer: opts.sub.answer
            }))
          }
        }
        if (opts.sub.choice) {
          renderChoiceSub(subEl, opts.sub.choice, { append: appendMode })
        }
      }
    })
    this._syncGuidanceChainVisibility()
    this.placeGuidanceInStack()
  }

  function renderGuidanceChain(chain) {
    var wrap = document.createElement('div')
    wrap.className = 'cc-guide-chain'
    ;(chain || []).forEach(function (item, i) {
      wrap.appendChild(renderGuideNode(item, i + 1, { withSub: true }))
    })
    return wrap
  }

  function create(options) {
    options = options || {}
    var layout = LAYOUTS.indexOf(options.layout) >= 0 ? options.layout : 'text-only'
    var mount = options.mount
    if (!mount) throw new Error('[CourseContainer] mount element required')

    var container = new CourseContainer(options)
    var el = document.createElement('div')
    el.className = 'course-container'
    el.id = container.instanceId
    el.setAttribute('data-layout', layout)
    if (options.meta && options.meta.moduleId) el.setAttribute('data-module-id', options.meta.moduleId)
    if (options.meta && options.meta.containerId) el.setAttribute('data-container-id', options.meta.containerId)
    if (options.textAccumulate) el.setAttribute('data-text-accumulate', 'true')
    el.setAttribute('data-guidance-layout', 'interleaved')

    applyParams(el, options.layoutParams, options.style)

    var body = document.createElement('div')
    body.className = 'course-body'

    var figureSlot = null
    var scroll = document.createElement('div')
    scroll.className = 'course-scroll'

    if (layout === 'top-split') {
      scroll.className = 'course-scroll course-scroll-top'

      var split = document.createElement('div')
      split.className = 'course-split'

      var splitLeft = document.createElement('div')
      splitLeft.className = 'course-split-left'

      if (options.figure) {
        figureSlot = document.createElement('div')
        figureSlot.className = 'course-figure'
        if (typeof window.AIClassFigureHost !== 'undefined') {
          container.figureHost = new window.AIClassFigureHost(figureSlot, options.figure, {})
        }
        splitLeft.appendChild(figureSlot)
      }

      var scrollLeft = document.createElement('div')
      scrollLeft.className = 'course-scroll course-scroll-left'
      splitLeft.appendChild(scrollLeft)

      var splitRight = document.createElement('div')
      splitRight.className = 'course-split-right'
      var scrollRight = document.createElement('div')
      scrollRight.className = 'course-scroll course-scroll-right'
      splitRight.appendChild(scrollRight)

      split.appendChild(splitLeft)
      split.appendChild(splitRight)
      body.appendChild(scroll)
      body.appendChild(split)

      container.scrollLeftEl = scrollLeft
      container.scrollRightEl = scrollRight
    } else if (layout === 'left-right' || layout === 'text-only') {
      scroll.className = 'course-scroll course-scroll-top'

      var mainRow = document.createElement('div')
      mainRow.className = 'course-main'

      if (layout === 'left-right' && options.figure) {
        figureSlot = document.createElement('div')
        figureSlot.className = 'course-figure'
        if (typeof window.AIClassFigureHost !== 'undefined') {
          container.figureHost = new window.AIClassFigureHost(figureSlot, options.figure, {})
        }
        mainRow.appendChild(figureSlot)
      }

      var scrollMain = document.createElement('div')
      scrollMain.className = 'course-scroll course-scroll-main'

      var scrollStack = document.createElement('div')
      scrollStack.className = 'course-scroll-stack'
      scrollMain.appendChild(scrollStack)
      container.scrollStackEl = scrollStack

      if (options.guidanceChain && options.guidanceChain.length) {
        mountInterleavedGuidance(scrollStack, options.guidanceChain, container)
      }
      mainRow.appendChild(scrollMain)

      body.appendChild(scroll)
      body.appendChild(mainRow)
      container.scrollRightEl = scrollMain
    } else {
      if (hasFigureLayout(layout)) {
        figureSlot = document.createElement('div')
        figureSlot.className = 'course-figure'
        if (options.figure && typeof window.AIClassFigureHost !== 'undefined') {
          container.figureHost = new window.AIClassFigureHost(figureSlot, options.figure, {})
        }
      }
      appendFigureBody(body, scroll, figureSlot, layout)
    }

    el.appendChild(body)
    mount.appendChild(el)

    if (container.figureHost) {
      container.figureHost.mount()
    }

    container.el = el
    container.bodyEl = body
    container.scrollEl = scroll
    container.figureSlot = figureSlot

    if ((options.head || options.difficulty) && container.scrollEl) {
      container.scrollEl.classList.add('course-scroll-top--labeled')
      var stemHead = null
      if (window.AIClassComponent &&
          typeof window.AIClassComponent.createCourseStemHead === 'function') {
        stemHead = window.AIClassComponent.createCourseStemHead({
          head: options.head || null,
          difficulty: options.difficulty,
          difficultyMax: options.difficultyMax
        })
      }
      if (!stemHead) {
        stemHead = document.createElement('div')
        stemHead.className = 'course-stem-head'
        var group = document.createElement('div')
        group.className = 'course-stem-head__group'
        if (options.head) {
          var labelNode = document.createElement('span')
          labelNode.className = 'course-label'
          labelNode.textContent = options.head
          group.appendChild(labelNode)
        }
        stemHead.appendChild(group)
      }
      container.scrollEl.appendChild(stemHead)
    }

    // 题干展开（StemExpand 组件，见 stem-zoom.js / stem-zoom.css）
    if (window.AIClassStemExpand &&
        typeof window.AIClassStemExpand.mount === 'function') {
      window.AIClassStemExpand.mount(container)
    }

    if (container.scrollRightEl &&
        window.AIClassOverlayScrollbar &&
        typeof window.AIClassOverlayScrollbar.attach === 'function') {
      window.AIClassOverlayScrollbar.attach(container.scrollRightEl, container.scrollRightEl, {
        contentEl: container.scrollStackEl || container.scrollRightEl.firstElementChild
      })
    }

    return container
  }

  window.AIClassCourseContainer = {
    create: create,
    LAYOUTS: LAYOUTS
  }
})()

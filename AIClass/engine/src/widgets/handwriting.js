// handwriting 手写块 widget — 渲染委托给 AIClassComponent.renderHandwriting
;(function () {
  AIClassWidgetRegistry.register('handwriting', function (el, block, runtime, ctx) {
    if (!window.AIClassComponent || typeof window.AIClassComponent.renderHandwriting !== 'function') {
      throw new Error('[handwriting widget] AIClassComponent.renderHandwriting is required')
    }
    var enabled = AIClassInteractionGate.isInteractive(block, runtime)
    el.classList.toggle('lf-block-handwriting--locked', !enabled)
    // 非当前步：组件内 interactive=false，禁绘/禁提交；仍渲染以便回看草稿
    window.AIClassComponent.renderHandwriting(el, block, runtime, ctx)
  })
})()

// 引擎脚本有序列表 — 新增通用组件/widget 时同步改 src/styles/engine.css
;(function () {
  window.AICLASS_ENGINE_MANIFEST = [
    // core/layout — 舞台与背景
    'core/layout/layout-stage.js',
    'core/layout/background-board.js',
    'core/layout/scene-background.js',
    'config/module-registry.js',
    'components/toast.js',
    // core/session — 早期依赖（submit / snapshot / log / gate / router）
    'core/session/submit-text.js',
    'core/session/interaction-snapshot.js',
    'core/session/execution-log.js',
    'bridge/courseware-submit.js',
    'core/session/interaction-gate.js',
    'core/session/action-router.js',
    // core/scroll
    'core/scroll/scroll-index.js',
    'core/scroll/scroll-follow.js',
    'core/scroll/scrollbar-auto-hide.js',
    // core/shell — 课容器
    'components/difficulty-stars.js',
    'components/course-stem-head.js',
    'components/overlay-scrollbar.js',
    'components/stem-zoom.js',
    'core/shell/course-container.js',
    'core/layout/stage-scroll-lock.js',
    'core/layout/overlay-mount.js',
    'screens/pre-lesson/pre-lesson.js',
    'screens/feynman/feynman-flow.js',
    'config/concept-sheet-resolver.js',
    'screens/concept-sheet/concept-sheet-flow.js',

    // widget 注册表（必须在 widget 文件之前）
    'widgets/registry.js',

    // components — 通用 UI 原语
    'components/dom.js',
    'components/option.js',
    'components/button.js',
    'components/choice.js',
    'components/viewport-scale.js',
    'components/math-keyboard.js',
    'components/fill-keyboard.js',
    'components/latex.js',
    'components/calc-tex-split.js',
    'components/calc-line-fit.js',
    'components/recognition-result.js',
    'components/hand-hint.js',
    'components/oral-input.js',
    'components/oral-card.js',
    'components/choice-card.js',
    'components/quick-qa.js',

    // widgets — 通用块渲染器
    'widgets/text.js',
    'widgets/oral.js',
    'widgets/solve-step.js',
    'widgets/fill.js',
    'widgets/intro-gallery.js',
    'widgets/latex.js',
    'widgets/choice.js',
    'widgets/chain.js',
    'widgets/read-list.js',
    'widgets/feynman-quad.js',

    // core/session — 必须在 toolkit 之后加载
    'core/shell/container-host.js',
    'core/session/course-scheduler.js'
  ]
})()

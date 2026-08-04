// Figure 骨架：业务几何与文案只放在课程实现中。
;(function () {
  var root = null

  function mount(target) {
    root = target
  }

  function setState(state) {
    if (!root) return
    root.setAttribute('data-figure-state', state || 'default')
  }

  function reset() {
    setState('default')
  }

  function teardown() {
    if (root) root.innerHTML = ''
    root = null
  }

  window.AIClassFigureRegistry.register('__FIGURE_ID__', {
    states: ['default'],
    capabilities: [],
    mount: mount,
    setState: setState,
    reset: reset,
    teardown: teardown
  })
})()

;(function () {
  function createFigure() {
    var host = null
    var svg = null

    function draw(state) {
      AIClassFigureKit.clear(svg)
      var group = AIClassFigureKit.append(svg, 'g', { id: 'shape-a' })
      AIClassFigureKit.append(group, 'rect', {
        x: 180,
        y: 110,
        width: 280,
        height: 160,
        rx: 20,
        fill: state === 'focus' ? '#dbeafe' : '#f1f5f9',
        stroke: state === 'focus' ? '#2563eb' : '#64748b',
        'stroke-width': state === 'focus' ? 5 : 3
      })
      AIClassFigureKit.append(group, 'text', {
        x: 320,
        y: 200,
        'text-anchor': 'middle',
        'font-size': 28,
        fill: '#1e293b'
      }, state === 'focus' ? '状态 B' : '状态 A')
    }

    return {
      mount: function (slot) {
        host = slot
        AIClassFigureKit.clear(host)
        svg = AIClassFigureKit.createSvg(host, {
          viewBox: '0 0 640 420',
          label: '合成测试图形'
        })
        draw('default')
      },
      setState: function (state) {
        if (svg) draw(state || 'default')
      },
      reset: function () {
        if (svg) draw('default')
      },
      teardown: function () {
        AIClassFigureKit.clear(host)
        host = null
        svg = null
      }
    }
  }

  createFigure.states = ['default', 'focus']
  createFigure.capabilities = ['synthetic']
  AIClassFigureRegistry.register('synthetic-board', createFigure)
})()

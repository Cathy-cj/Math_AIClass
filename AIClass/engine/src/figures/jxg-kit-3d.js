/**
 * JSXGraph 3D 通用模板（课件用）
 *
 * 依赖：JSXGraph CDN；建议同目录引入 view3d-animate.js 做平滑旋转/复位
 *
 * 用法：
 *   const { view } = JXGKit3D.mount('box', { home: { az: 1.05, el: 0.42, bank: 0 } });
 *   JXGKit3D.draw(view, { points, edges, faces });
 *   // 或：JXGKit3D.drawBox(view, { sx: 2, sy: 2, sz: 2 });
 *   View3DAnimate.reset(view);
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JXGKit3D = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_BOARD = {
    boundingbox: [-10, 8, 10, -8],
    axis: false,
    grid: false,
    showCopyright: false,
    showNavigation: false,
    keepAspectRatio: true,
    pan: { enabled: false }
  };

  var DEFAULT_VIEW = {
    projection: 'central',
    trackball: { enabled: true },
    depthOrder: { enabled: true },
    axesPosition: 'none',
    xPlaneRear: { visible: false },
    yPlaneRear: { visible: false },
    zPlaneRear: { visible: false },
    xPlaneFront: { visible: false },
    yPlaneFront: { visible: false },
    zPlaneFront: { visible: false }
  };

  var DEFAULT_POINT = {
    size: 2.5,
    fixed: true,
    highlight: false,
    showInfobox: false,
    withLabel: false
  };

  var DEFAULT_EDGE = {
    strokeColor: '#0f172a',
    strokeWidth: 2.4,
    fixed: true,
    highlight: false,
    straightFirst: false,
    straightLast: false,
    lineCap: 'round'
  };

  var DEFAULT_FACE = {
    fillColor: '#3b82f6',
    fillOpacity: 0.38,
    borders: { visible: false },
    vertices: { visible: false, fixed: true },
    highlight: false
  };

  function assign() {
    var out = {};
    for (var i = 0; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
      }
    }
    return out;
  }

  function applyHome(view, board, home) {
    if (typeof View3DAnimate !== 'undefined' && View3DAnimate.applyPose) {
      View3DAnimate.applyPose(view, home);
      if (View3DAnimate.setHome) View3DAnimate.setHome(view, home);
      if (View3DAnimate.captureCheckpoint) View3DAnimate.captureCheckpoint(view);
      if (View3DAnimate.setTrackballEnabled) {
        View3DAnimate.setTrackballEnabled(view, true);
      }
      return;
    }
    if (typeof view.setView === 'function') {
      view.setView(home.az, home.el, home.r);
      if (view.bank_slide && typeof home.bank === 'number') {
        view.bank_slide.setValue(home.bank);
        board.update();
      }
    }
  }

  /**
   * @param {string|HTMLElement} container
   * @param {object} [options]
   * @returns {{ board, view, home }}
   */
  function mount(container, options) {
    if (typeof JXG === 'undefined') {
      throw new Error('JXGKit3D.mount: JSXGraph (JXG) is not loaded');
    }
    options = options || {};
    var boardOpts = assign({}, DEFAULT_BOARD, options.board);
    var board = JXG.JSXGraph.initBoard(container, boardOpts);

    var bb = boardOpts.boundingbox || DEFAULT_BOARD.boundingbox;
    var frame =
      options.frame ||
      [
        [bb[0] + 0.5, bb[3] + 0.5],
        [bb[2] - bb[0] - 1, bb[1] - bb[3] - 1]
      ];
    var bounds = options.bounds || [
      [-5, 5],
      [-5, 5],
      [-5, 5]
    ];

    var viewAttrs = assign({}, DEFAULT_VIEW, options.view);
    if (options.trackball === false) viewAttrs.trackball = { enabled: false };
    if (options.trackball === true) viewAttrs.trackball = { enabled: true };

    var view = board.create('view3d', [frame[0], frame[1], bounds], viewAttrs);
    var home = options.home || { az: 1.05, el: 0.42, bank: 0 };
    applyHome(view, board, home);

    return { board: board, view: view, home: home };
  }

  function resolvePoint(map, ref) {
    if (typeof ref === 'string') {
      if (!map[ref]) throw new Error('JXGKit3D: unknown point "' + ref + '"');
      return map[ref];
    }
    return ref;
  }

  /**
   * @param {object} view
   * @param {object} figure
   * @returns {{ points, edges, faces }}
   */
  function draw(view, figure) {
    figure = figure || {};
    var points = {};
    var edges = [];
    var faces = [];

    var srcPoints = figure.points || {};
    Object.keys(srcPoints).forEach(function (name) {
      var raw = srcPoints[name];
      var coords;
      var attrs;
      if (Array.isArray(raw)) {
        coords = raw;
        attrs = {};
      } else {
        coords = raw.coords || raw.xyz;
        attrs = assign({}, raw);
        delete attrs.coords;
        delete attrs.xyz;
      }
      var withLabel = attrs.withLabel != null ? attrs.withLabel : false;
      points[name] = view.create(
        'point3d',
        coords,
        assign({}, DEFAULT_POINT, { name: name, withLabel: withLabel }, attrs)
      );
    });

    (figure.edges || figure.segments || []).forEach(function (item) {
      var from;
      var to;
      var attrs = {};
      if (Array.isArray(item)) {
        from = item[0];
        to = item[1];
        attrs = item[2] || {};
      } else {
        from = item.from;
        to = item.to;
        attrs = assign({}, item);
        delete attrs.from;
        delete attrs.to;
      }
      edges.push(
        view.create(
          'line3d',
          [resolvePoint(points, from), resolvePoint(points, to)],
          assign({}, DEFAULT_EDGE, attrs)
        )
      );
    });

    (figure.faces || figure.polygons || []).forEach(function (face) {
      var vertNames = face.vertices || face.points || [];
      var verts = vertNames.map(function (v) {
        return resolvePoint(points, v);
      });
      var attrs = assign({}, DEFAULT_FACE, face);
      delete attrs.vertices;
      delete attrs.points;
      attrs.borders = face.borders || { visible: false };
      attrs.vertices = face.vertexStyle || { visible: false, fixed: true };
      faces.push(view.create('polygon3d', verts, attrs));
    });

    return { points: points, edges: edges, faces: faces };
  }

  /**
   * 便捷：轴对齐长方体（默认六面异色）
   */
  function drawBox(view, opts) {
    opts = opts || {};
    var sx = (opts.sx != null ? opts.sx : 2) / 2;
    var sy = (opts.sy != null ? opts.sy : 2) / 2;
    var sz = (opts.sz != null ? opts.sz : 2) / 2;
    var o = opts.origin || [0, 0, 0];
    var colors = opts.colors || [
      '#3b82f6',
      '#f59e0b',
      '#22c55e',
      '#a855f7',
      '#ef4444',
      '#06b6d4'
    ];

    var P = {
      B000: [o[0] - sx, o[1] - sy, o[2] - sz],
      B100: [o[0] + sx, o[1] - sy, o[2] - sz],
      B110: [o[0] + sx, o[1] + sy, o[2] - sz],
      B010: [o[0] - sx, o[1] + sy, o[2] - sz],
      T000: [o[0] - sx, o[1] - sy, o[2] + sz],
      T100: [o[0] + sx, o[1] - sy, o[2] + sz],
      T110: [o[0] + sx, o[1] + sy, o[2] + sz],
      T010: [o[0] - sx, o[1] + sy, o[2] + sz]
    };

    return draw(view, {
      points: P,
      edges: [
        ['B000', 'B100'],
        ['B100', 'B110'],
        ['B110', 'B010'],
        ['B010', 'B000'],
        ['T000', 'T100'],
        ['T100', 'T110'],
        ['T110', 'T010'],
        ['T010', 'T000'],
        ['B000', 'T000'],
        ['B100', 'T100'],
        ['B110', 'T110'],
        ['B010', 'T010']
      ],
      faces: [
        { vertices: ['B000', 'B100', 'B110', 'B010'], fillColor: colors[0], fillOpacity: 0.4 },
        { vertices: ['T000', 'T100', 'T110', 'T010'], fillColor: colors[1], fillOpacity: 0.4 },
        { vertices: ['B000', 'B100', 'T100', 'T000'], fillColor: colors[2], fillOpacity: 0.38 },
        { vertices: ['B010', 'B110', 'T110', 'T010'], fillColor: colors[3], fillOpacity: 0.38 },
        { vertices: ['B000', 'B010', 'T010', 'T000'], fillColor: colors[4], fillOpacity: 0.38 },
        { vertices: ['B100', 'B110', 'T110', 'T100'], fillColor: colors[5], fillOpacity: 0.38 }
      ]
    });
  }

  return {
    mount: mount,
    draw: draw,
    drawBox: drawBox,
    defaults: {
      board: DEFAULT_BOARD,
      view: DEFAULT_VIEW,
      point: DEFAULT_POINT,
      edge: DEFAULT_EDGE,
      face: DEFAULT_FACE
    }
  };
});

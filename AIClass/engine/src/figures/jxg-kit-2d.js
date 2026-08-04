/**
 * JSXGraph 2D 通用模板（课件用）
 *
 * 用法：
 *   const { board } = JXGKit2D.mount('box', { boundingbox: [-5, 5, 5, -5] });
 *   JXGKit2D.draw(board, {
 *     points: { A: [0, 2], B: [-2, 0], C: [2, 0] },
 *     segments: [['A', 'B'], ['B', 'C'], ['C', 'A']],
 *     polygons: [{ vertices: ['A', 'B', 'C'], fillColor: '#3b82f6', fillOpacity: 0.25 }]
 *   });
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.JXGKit2D = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_BOARD = {
    boundingbox: [-5, 5, 5, -5],
    axis: false,
    grid: false,
    showCopyright: false,
    showNavigation: false,
    keepAspectRatio: true,
    pan: { enabled: false }
  };

  var DEFAULT_POINT = {
    size: 2.5,
    fixed: true,
    highlight: false,
    showInfobox: false
  };

  var DEFAULT_SEGMENT = {
    strokeColor: '#1e293b',
    strokeWidth: 2,
    fixed: true,
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

  /**
   * 屏幕习惯写 $...$；JSXGraph useKatex 要裸 TeX。
   * 明文符号（△ABD / cm²）保持 useKatex:false。
   * @returns {{ text: string|*, useKatex: boolean }}
   */
  function normalizeFigureText(raw) {
    if (typeof raw !== 'string') {
      return { text: raw, useKatex: false };
    }
    var text = raw;
    var useKatex = false;
    var m = text.match(/^\$\$([\s\S]*)\$\$$/) || text.match(/^\$([\s\S]*)\$$/);
    if (m) {
      text = m[1];
      useKatex = true;
    } else if (/\\[a-zA-Z]+/.test(text)) {
      useKatex = true;
    }
    return { text: text, useKatex: useKatex };
  }

  /** \\frac{a}{b} → a/b，KaTeX 不可用时的图上 label 兜底 */
  function texFractionToPlain(tex) {
    if (typeof tex !== 'string') return tex;
    var m = tex.match(/^\\frac\{([^}]*)\}\{([^}]*)\}$/);
    return m ? m[1] + '/' + m[2] : tex;
  }

  /**
   * 在 board 上创建文字标注（figure.actions label 统一入口）。
   * 去 $ 定界、按需 KaTeX；库未就绪时 \\frac 退化为 a/b，禁止原样显示 $...$。
   * @returns {object} JSXGraph text element
   */
  function createBoardLabel(board, x, y, rawText, attrs) {
    var norm = normalizeFigureText(rawText);
    var text = norm.text;
    var useKatex = norm.useKatex;
    if (useKatex && typeof katex === 'undefined') {
      text = texFractionToPlain(text);
      useKatex = false;
    }
    return board.create('text', [x, y, text], assign({
      fixed: true,
      highlight: false,
      fontSize: 14,
      useKatex: useKatex,
      anchorX: 'middle'
    }, attrs || {}));
  }

  /**
   * @param {string|HTMLElement} container
   * @param {object} [options] 传给 initBoard；可含 board 覆盖项
   * @returns {{ board: object }}
   */
  function mount(container, options) {
    if (typeof JXG === 'undefined') {
      throw new Error('JXGKit2D.mount: JSXGraph (JXG) is not loaded');
    }
    options = options || {};
    var boardOpts = assign({}, DEFAULT_BOARD, options.board || options);
    // 避免把非 board 字段误传入（如 points）
    delete boardOpts.points;
    delete boardOpts.segments;
    delete boardOpts.polygons;
    delete boardOpts.circles;
    delete boardOpts.texts;
    delete boardOpts.board;

    var board = JXG.JSXGraph.initBoard(container, boardOpts);
    return { board: board };
  }

  function resolvePoint(map, ref) {
    if (typeof ref === 'string') {
      if (!map[ref]) throw new Error('JXGKit2D: unknown point "' + ref + '"');
      return map[ref];
    }
    return ref;
  }

  /**
   * @param {object} board
   * @param {object} figure
   * @param {object} [figure.points] { name: [x,y] | { coords, ...attrs } }
   * @param {array}  [figure.segments] [ ['A','B'], { from:'A', to:'B', ... } ]
   * @param {array}  [figure.lines] 同 segments，但是无限直线 line
   * @param {array}  [figure.polygons]
   * @param {array}  [figure.circles] { center:'O', through:'A' } 或 { center, radius }
   * @param {array}  [figure.texts] { at:'A'| [x,y], text:'...' }
   * @returns {{ points, segments, lines, polygons, circles, texts }}
   */
  function draw(board, figure) {
    figure = figure || {};
    var points = {};
    var segments = [];
    var lines = [];
    var polygons = [];
    var circles = [];
    var texts = [];

    var srcPoints = figure.points || {};
    Object.keys(srcPoints).forEach(function (name) {
      var raw = srcPoints[name];
      var coords;
      var attrs;
      if (Array.isArray(raw)) {
        coords = raw;
        attrs = {};
      } else {
        coords = raw.coords || raw.xy;
        attrs = assign({}, raw);
        delete attrs.coords;
        delete attrs.xy;
      }
      var labelSrc = attrs.name != null ? attrs.name : name;
      var labelNorm = normalizeFigureText(labelSrc);
      var pointAttrs = assign(
        {},
        DEFAULT_POINT,
        { name: typeof labelNorm.text === 'string' ? labelNorm.text : name, withLabel: !!name },
        attrs,
        { name: typeof labelNorm.text === 'string' ? labelNorm.text : name }
      );
      if (labelNorm.useKatex || attrs.useKatex) {
        pointAttrs.label = assign({}, pointAttrs.label, { useKatex: true });
      }
      points[name] = board.create('point', coords, pointAttrs);
    });

    function addEdge(item, type, sink) {
      var from;
      var to;
      var attrs = {};
      if (Array.isArray(item)) {
        from = item[0];
        to = item[1];
        attrs = item[2] || {};
      } else {
        from = item.from || item[0];
        to = item.to || item[1];
        attrs = assign({}, item);
        delete attrs.from;
        delete attrs.to;
      }
      var el = board.create(
        type,
        [resolvePoint(points, from), resolvePoint(points, to)],
        assign({}, DEFAULT_SEGMENT, attrs)
      );
      sink.push(el);
    }

    (figure.segments || []).forEach(function (item) {
      addEdge(item, 'segment', segments);
    });
    (figure.lines || []).forEach(function (item) {
      addEdge(item, 'line', lines);
    });

    (figure.polygons || []).forEach(function (poly) {
      var vertNames = poly.vertices || poly.points || [];
      var verts = vertNames.map(function (v) {
        return resolvePoint(points, v);
      });
      var attrs = assign(
        {
          fillColor: '#3b82f6',
          fillOpacity: 0.25,
          borders: { strokeColor: '#1e293b', strokeWidth: 2 },
          fixed: true,
          highlight: false
        },
        poly
      );
      delete attrs.vertices;
      delete attrs.points;
      delete attrs.vertexStyle;
      attrs.vertices = poly.vertexStyle || { visible: false, fixed: true };
      polygons.push(board.create('polygon', verts, attrs));
    });

    (figure.circles || []).forEach(function (cir) {
      var parents;
      if (cir.through != null) {
        parents = [resolvePoint(points, cir.center), resolvePoint(points, cir.through)];
      } else {
        parents = [resolvePoint(points, cir.center), cir.radius];
      }
      var attrs = assign(
        { strokeColor: '#1e293b', strokeWidth: 2, fixed: true, highlight: false },
        cir
      );
      delete attrs.center;
      delete attrs.through;
      delete attrs.radius;
      circles.push(board.create('circle', parents, attrs));
    });

    var arcs = [];
    (figure.arcs || []).forEach(function (arc) {
      var center = resolvePoint(points, arc.center);
      var from = resolvePoint(points, arc.from || arc.start);
      var to = resolvePoint(points, arc.to || arc.end);
      var attrs = assign(
        { strokeColor: '#1e293b', strokeWidth: 2, fixed: true, highlight: false },
        arc
      );
      delete attrs.center;
      delete attrs.from;
      delete attrs.start;
      delete attrs.to;
      delete attrs.end;
      arcs.push(board.create('arc', [center, from, to], attrs));
    });

    (figure.texts || []).forEach(function (t) {
      var at = t.at;
      var norm = normalizeFigureText(t.text);
      var content = norm.text;
      var parents;
      if (typeof at === 'string') {
        var p = resolvePoint(points, at);
        parents = [function () { return p.X(); }, function () { return p.Y(); }, content];
      } else {
        parents = [at[0], at[1], content];
      }
      var attrs = assign(
        { fixed: true, highlight: false, fontSize: 14, useKatex: norm.useKatex },
        t,
        { useKatex: t.useKatex != null ? t.useKatex : norm.useKatex }
      );
      delete attrs.at;
      delete attrs.text;
      texts.push(board.create('text', parents, attrs));
    });

    return {
      points: points,
      segments: segments,
      lines: lines,
      polygons: polygons,
      circles: circles,
      arcs: arcs,
      texts: texts
    };
  }

  return {
    mount: mount,
    draw: draw,
    normalizeFigureText: normalizeFigureText,
    texFractionToPlain: texFractionToPlain,
    createBoardLabel: createBoardLabel,
    defaults: {
      board: DEFAULT_BOARD,
      point: DEFAULT_POINT,
      segment: DEFAULT_SEGMENT
    }
  };
});

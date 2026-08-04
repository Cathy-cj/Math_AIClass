/**
 * 从 figure-spec 绘制审图预览（构造点隐藏，线叠在填色之上）
 * 供 lesson/{id}/figure-preview.html 引用
 */
(function (root) {
  'use strict';

  function fail(errEl, message) {
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = '加载失败: ' + message;
    }
  }

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

  function hiddenPoints(raw) {
    var out = {};
    Object.keys(raw || {}).forEach(function (name) {
      var rawPoint = raw[name];
      var coords = Array.isArray(rawPoint) ? rawPoint : (rawPoint.coords || rawPoint.xy);
      out[name] = {
        coords: coords,
        visible: false,
        withLabel: false,
        size: 0,
        fixed: true,
        highlight: false
      };
    });
    return out;
  }

  function renderInfoPanel(infoList) {
    var panel = document.getElementById('figure-info-panel');
    if (!panel) return;
    if (!infoList || !infoList.length) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';
    var html = ['<h2>图形参数</h2>', '<dl class="info-grid">'];
    infoList.forEach(function (row) {
      if (!row || !row.label || row.value == null || row.value === '') return;
      html.push('<dt>' + row.label + '</dt><dd>' + row.value + '</dd>');
    });
    html.push('</dl>');
    panel.innerHTML = html.join('');
  }

  function resolvePoint(map, ref) {
    if (typeof ref === 'string') {
      if (!map[ref]) throw new Error('未知构造点: ' + ref);
      return map[ref];
    }
    return ref;
  }

  function createHiddenPointBoard(board, rawPoints) {
    var points = {};
    Object.keys(rawPoints || {}).forEach(function (name) {
      var raw = rawPoints[name];
      var coords = Array.isArray(raw) ? raw : (raw.coords || raw.xy);
      points[name] = board.create('point', coords, {
        visible: false,
        withLabel: false,
        size: 0,
        fixed: true,
        highlight: false,
        showInfobox: false
      });
    });
    return points;
  }

  function draw2d(spec) {
    if (typeof JXG === 'undefined') throw new Error('JSXGraph 未加载');
    if (typeof JXGKit2D === 'undefined') throw new Error('JXGKit2D 未加载');

    var boardOpts = assign(
      {},
      JXGKit2D.defaults && JXGKit2D.defaults.board,
      spec.board || {}
    );
    var mounted = JXGKit2D.mount('box', { board: boardOpts });
    var board = mounted.board;
    var points = createHiddenPointBoard(board, spec.points);

    (spec.polygons || []).forEach(function (poly) {
      var vertNames = poly.vertices || poly.points || [];
      var verts = vertNames.map(function (v) { return resolvePoint(points, v); });
      board.create('polygon', verts, assign({
        fillColor: poly.fillColor || '#3b82f6',
        fillOpacity: poly.fillOpacity != null ? poly.fillOpacity : 0.25,
        borders: { visible: false },
        fixed: true,
        highlight: false,
        vertices: { visible: false, fixed: true }
      }, poly, {
        borders: assign({ visible: false }, (poly.borders || {})),
        vertices: poly.vertexStyle || { visible: false, fixed: true }
      }));
    });

    var segmentStyle = assign(
      {},
      JXGKit2D.defaults && JXGKit2D.defaults.segment,
      { strokeColor: '#475569', strokeWidth: 1.5, fixed: true, highlight: false }
    );
    (spec.segments || []).forEach(function (item) {
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
      board.create(
        'segment',
        [resolvePoint(points, from), resolvePoint(points, to)],
        assign({}, segmentStyle, attrs)
      );
    });

    (spec.lines || []).forEach(function (item) {
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
      board.create(
        'line',
        [resolvePoint(points, from), resolvePoint(points, to)],
        assign({}, segmentStyle, attrs)
      );
    });

    (spec.circles || []).forEach(function (cir) {
      var parents;
      if (cir.through != null) {
        parents = [resolvePoint(points, cir.center), resolvePoint(points, cir.through)];
      } else {
        parents = [resolvePoint(points, cir.center), cir.radius];
      }
      var attrs = assign({ strokeColor: '#2563eb', strokeWidth: 2, fixed: true, highlight: false }, cir);
      delete attrs.center;
      delete attrs.through;
      delete attrs.radius;
      board.create('circle', parents, attrs);
    });

    (spec.arcs || []).forEach(function (arc) {
      var center = resolvePoint(points, arc.center);
      var from = resolvePoint(points, arc.from || arc.start);
      var to = resolvePoint(points, arc.to || arc.end);
      var attrs = assign({ strokeColor: '#2563eb', strokeWidth: 2, fixed: true, highlight: false }, arc);
      delete attrs.center;
      delete attrs.from;
      delete attrs.start;
      delete attrs.to;
      delete attrs.end;
      board.create('arc', [center, from, to], attrs);
    });

    (spec.texts || []).forEach(function (t) {
      var at = t.at;
      var content = t.text;
      var parents;
      if (typeof at === 'string') {
        var p = resolvePoint(points, at);
        parents = [function () { return p.X(); }, function () { return p.Y(); }, content];
      } else {
        parents = [at[0], at[1], content];
      }
      var attrs = assign({ fixed: true, highlight: false, fontSize: 14 }, t);
      delete attrs.at;
      delete attrs.text;
      board.create('text', parents, attrs);
    });

    (spec.functions || []).forEach(function (fn) {
      var expr = fn.expr || fn.expression;
      if (!expr) return;
      board.create(
        'functiongraph',
        [function (x) { return evalExpr(expr, x); }],
        assign({ strokeColor: '#64748b', strokeWidth: 2, fixed: true, highlight: false }, fn)
      );
    });

    // 仅 show-key-coordinates 时叠一层可见标点；hide / 未声明则保持构造点隐藏
    // （避免 V1/LBL 等同坐标多名叠字，也贴近「构造点自动隐藏」约定）
    var policy = (spec.initialState && spec.initialState.coordinatePolicy) || '';
    if (policy === 'show-key-coordinates') {
      Object.keys(spec.points || {}).forEach(function (name) {
        var raw = spec.points[name];
        var isObj = raw && !Array.isArray(raw);
        if (isObj && raw.visible === false) return;
        var coords = Array.isArray(raw) ? raw : (raw.coords || raw.xy);
        if (!points[name] || !coords) return;
        var labelName = isObj && raw.name != null ? raw.name : name;
        var showLabel = labelName !== '' && labelName != null;
        var attrs = assign(
          {
            name: showLabel ? String(labelName) : '',
            size: 3,
            fixed: true,
            highlight: false,
            withLabel: showLabel,
            showInfobox: false,
            fillColor: '#2563eb',
            strokeColor: '#1e40af'
          },
          isObj ? raw : null,
          {
            name: showLabel ? String(labelName) : '',
            withLabel: showLabel,
            visible: true
          }
        );
        delete attrs.coords;
        delete attrs.xy;
        board.create('point', coords, attrs);
      });
    }
  }

  function evalExpr(expr, x) {
    var safe = String(expr).replace(/x/g, '(' + x + ')');
    // eslint-disable-next-line no-new-func
    return Function('"use strict"; return (' + safe + ')')();
  }

  function boot(payload) {
    var errEl = document.getElementById('err');
    try {
      var spec = payload.spec || payload;
      var preview = payload.preview || spec.preview || {};
      var titleEl = document.getElementById('preview-title');
      var metaEl = document.getElementById('preview-meta');
      if (titleEl && preview.title) titleEl.textContent = preview.title;
      if (metaEl) {
        if (preview.subtitle) metaEl.textContent = preview.subtitle;
        else metaEl.style.display = 'none';
      }
      renderInfoPanel(preview.info || []);
      if (spec.pattern && spec.pattern.type) {
        if (typeof AIClassFigurePreviewPattern === 'undefined') {
          throw new Error('规律图预览需要 preview-pattern.js');
        }
        AIClassFigurePreviewPattern.drawPattern(spec, 'box');
      } else if ((spec.dimension || '2d') === '2d') draw2d(spec);
      else throw new Error('3D 预览尚未支持，请先用 2D 或扩展 preview-draw.js');
    } catch (e) {
      fail(errEl, e.message);
    }
  }

  root.AIClassFigurePreview = { boot: boot, draw2d: draw2d, hiddenPoints: hiddenPoints };
})(typeof globalThis !== 'undefined' ? globalThis : window);

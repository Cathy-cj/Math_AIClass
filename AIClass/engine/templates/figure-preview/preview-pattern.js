/**
 * 规律图（点群 / 黑三角等）审图预览 — 与课件 SVG figure 同源布局
 */
(function (root) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BOX_W = 100;
  var BOX_H = 110;
  var GAP = 16;
  var START_X = 20;
  var START_Y = 50;

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (attrs[key] != null) node.setAttribute(key, String(attrs[key]));
    });
    if (text != null) node.textContent = String(text);
    return node;
  }

  function svgAppend(parent, tag, attrs, text) {
    var node = svgEl(tag, attrs, text);
    parent.appendChild(node);
    return node;
  }

  function dotClusterPositions(count) {
    if (count <= 0) return [];
    if (count === 1) return [{ x: 0, y: 0 }];
    var perArm = (count - 1) / 3;
    var pts = [{ x: 0, y: 0 }];
    var dirs = [
      { x: 0, y: -1 },
      { x: -0.866, y: 0.5 },
      { x: 0.866, y: 0.5 }
    ];
    var spacing = 14;
    for (var a = 0; a < 3; a++) {
      for (var i = 1; i <= perArm; i++) {
        pts.push({
          x: dirs[a].x * spacing * i,
          y: dirs[a].y * spacing * i
        });
      }
    }
    return pts;
  }

  function triangleGridPositions(count) {
    var pts = [];
    var spacing = 16;
    if (count <= 0) return pts;
    if (count === 1) return [{ x: 0, y: 0 }];
    if (count === 3) {
      return [
        { x: 0, y: -spacing * 0.6 },
        { x: -spacing * 0.7, y: spacing * 0.5 },
        { x: spacing * 0.7, y: spacing * 0.5 }
      ];
    }
    if (count === 5) {
      return [
        { x: -spacing, y: -spacing },
        { x: spacing, y: -spacing },
        { x: 0, y: 0 },
        { x: -spacing, y: spacing },
        { x: spacing, y: spacing }
      ];
    }
    if (count === 7) {
      var rows = [1, 2, 2, 2];
      for (var r = 0; r < rows.length; r++) {
        var n = rows[r];
        var startX = -(n - 1) * spacing * 0.5;
        for (var c = 0; c < n; c++) {
          pts.push({ x: startX + c * spacing, y: (r - 1.5) * spacing * 0.85 });
        }
      }
      return pts.slice(0, count);
    }
    if (count === 9) {
      for (var gy = 0; gy < 3; gy++) {
        for (var gx = 0; gx < 3; gx++) {
          pts.push({
            x: (gx - 1) * spacing * 0.85,
            y: (gy - 1) * spacing * 0.75
          });
        }
      }
      return pts;
    }
    var side = Math.ceil(Math.sqrt(count));
    for (var ty = 0; ty < side; ty++) {
      for (var tx = 0; tx < side; tx++) {
        if (pts.length >= count) break;
        pts.push({
          x: (tx - (side - 1) / 2) * spacing,
          y: (ty - (side - 1) / 2) * spacing
        });
      }
    }
    return pts;
  }

  function boxOrigin(index) {
    return {
      x: START_X + index * (BOX_W + GAP),
      y: START_Y
    };
  }

  function drawDotCluster(host, groups) {
    groups.forEach(function (spec, index) {
      var origin = boxOrigin(index);
      svgAppend(host, 'rect', {
        x: origin.x,
        y: origin.y,
        width: BOX_W,
        height: BOX_H,
        rx: 6,
        fill: '#fff',
        stroke: '#64748b',
        'stroke-width': 2
      });
      svgAppend(host, 'text', {
        x: origin.x + BOX_W / 2,
        y: origin.y - 12,
        'text-anchor': 'middle',
        'font-size': 14,
        fill: '#475569'
      }, '(' + (index + 1) + ')');

      var cx = origin.x + BOX_W / 2;
      var cy = origin.y + BOX_H / 2;

      if (spec.count == null) {
        svgAppend(host, 'text', {
          x: cx,
          y: cy + 8,
          'text-anchor': 'middle',
          'font-size': 36,
          fill: '#94a3b8'
        }, spec.label || '?');
        return;
      }

      dotClusterPositions(spec.count).forEach(function (p) {
        svgAppend(host, 'circle', {
          cx: cx + p.x,
          cy: cy + p.y,
          r: 5,
          fill: '#22c55e',
          stroke: '#16a34a',
          'stroke-width': 1
        });
      });
    });
  }

  function drawTriangle(parent, x, y, size) {
    var h = size * 0.866;
    svgAppend(parent, 'polygon', {
      points: [
        x + ',' + (y - h * 0.55),
        (x - size * 0.5) + ',' + (y + h * 0.45),
        (x + size * 0.5) + ',' + (y + h * 0.45)
      ].join(' '),
      fill: '#1e293b'
    });
  }

  function drawTriangleGrid(host, groups) {
    groups.forEach(function (spec, index) {
      var origin = boxOrigin(index);
      svgAppend(host, 'rect', {
        x: origin.x,
        y: origin.y,
        width: BOX_W,
        height: BOX_H,
        rx: 6,
        fill: '#fff',
        stroke: '#64748b',
        'stroke-width': 2
      });
      svgAppend(host, 'text', {
        x: origin.x + BOX_W / 2,
        y: origin.y - 12,
        'text-anchor': 'middle',
        'font-size': 14,
        fill: '#475569'
      }, '(' + (index + 1) + ')');

      var cx = origin.x + BOX_W / 2;
      var cy = origin.y + BOX_H / 2;

      if (spec.count == null) {
        svgAppend(host, 'text', {
          x: cx,
          y: cy + 8,
          'text-anchor': 'middle',
          'font-size': 36,
          fill: '#94a3b8'
        }, spec.label || '?');
        return;
      }

      triangleGridPositions(spec.count).forEach(function (p) {
        drawTriangle(host, cx + p.x, cy + p.y, 14);
      });
    });
  }

  function drawPattern(spec, containerId) {
    var box = document.getElementById(containerId || 'box');
    if (!box) throw new Error('找不到预览容器 #' + (containerId || 'box'));
    box.innerHTML = '';
    box.classList.add('pattern-canvas');

    var pattern = spec.pattern;
    if (!pattern || !pattern.type) throw new Error('figure-spec 缺少 pattern 定义');

    var svg = svgEl('svg', {
      viewBox: '0 0 620 220',
      width: '100%',
      height: '100%',
      role: 'img',
      'aria-label': pattern.type === 'dot-cluster' ? '点群规律图' : '黑三角规律图'
    });
    var rootG = svgAppend(svg, 'g', {});

    var groups = pattern.groups || [];
    if (pattern.type === 'dot-cluster') drawDotCluster(rootG, groups);
    else if (pattern.type === 'triangle-grid') drawTriangleGrid(rootG, groups);
    else throw new Error('不支持的 pattern.type: ' + pattern.type);

    box.appendChild(svg);
  }

  root.AIClassFigurePreviewPattern = { drawPattern: drawPattern };
})(typeof globalThis !== 'undefined' ? globalThis : window);

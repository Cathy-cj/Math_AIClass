/**
 * View3D 平滑视角动画工具
 * - to / reset / spin：播放中锁 trackball；结束后记检查点并解锁
 * - 下一步动画开始前：若相机被拖偏，先瞬时恢复检查点再播
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.View3DAnimate = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var easings = {
    linear: function (t) { return t; },
    easeOutCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    easeOutQuad: function (t) { return 1 - (1 - t) * (1 - t); }
  };

  var running = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var runningFallback = [];
  var homes = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var homesFallback = [];
  var checkpoints = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var checkpointsFallback = [];
  var lockDepth = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  var lockDepthFallback = [];

  var POSE_EPS = 1e-4;

  function getRunning(view) {
    if (running) return running.get(view) || null;
    for (var i = 0; i < runningFallback.length; i++) {
      if (runningFallback[i].view === view) return runningFallback[i].job;
    }
    return null;
  }
  function setRunning(view, job) {
    if (running) {
      if (job) running.set(view, job); else running.delete(view);
      return;
    }
    runningFallback = runningFallback.filter(function (x) { return x.view !== view; });
    if (job) runningFallback.push({ view: view, job: job });
  }
  function getHome(view) {
    if (homes) return homes.get(view) || null;
    for (var i = 0; i < homesFallback.length; i++) {
      if (homesFallback[i].view === view) return homesFallback[i].pose;
    }
    return null;
  }
  function setHome(view, pose) {
    var p = copyPose(pose);
    if (homes) { homes.set(view, p); return p; }
    homesFallback = homesFallback.filter(function (x) { return x.view !== view; });
    homesFallback.push({ view: view, pose: p });
    return p;
  }
  function getCheckpoint(view) {
    if (!view) return null;
    if (checkpoints) return checkpoints.get(view) || null;
    for (var i = 0; i < checkpointsFallback.length; i++) {
      if (checkpointsFallback[i].view === view) return checkpointsFallback[i].pose;
    }
    return null;
  }
  function setCheckpoint(view, pose) {
    var p = copyPose(pose);
    if (checkpoints) { checkpoints.set(view, p); return p; }
    checkpointsFallback = checkpointsFallback.filter(function (x) { return x.view !== view; });
    checkpointsFallback.push({ view: view, pose: p });
    return p;
  }
  function getLockDepth(view) {
    if (lockDepth) return lockDepth.get(view) || 0;
    for (var i = 0; i < lockDepthFallback.length; i++) {
      if (lockDepthFallback[i].view === view) return lockDepthFallback[i].depth;
    }
    return 0;
  }
  function setLockDepth(view, depth) {
    if (lockDepth) {
      if (depth > 0) lockDepth.set(view, depth);
      else lockDepth.delete(view);
      return;
    }
    lockDepthFallback = lockDepthFallback.filter(function (x) { return x.view !== view; });
    if (depth > 0) lockDepthFallback.push({ view: view, depth: depth });
  }

  function copyPose(pose) {
    return {
      az: pose.az, el: pose.el,
      bank: typeof pose.bank === 'number' ? pose.bank : 0,
      r: typeof pose.r === 'number' ? pose.r : undefined
    };
  }
  function stopOfficialAzimuth(view) {
    if (view && typeof view.stopAzimuth === 'function') view.stopAzimuth();
  }
  function sliderRange(slide, fallbackMin, fallbackMax) {
    var min = fallbackMin, max = fallbackMax;
    if (slide) {
      if (typeof slide._smin === 'number') min = slide._smin;
      if (typeof slide._smax === 'number') max = slide._smax;
    }
    return { min: min, max: max };
  }
  function wrapToRange(value, min, max) {
    var span = max - min;
    if (!(span > 0) || !isFinite(value)) return min;
    return ((value - min) % span + span) % span + min;
  }
  function clamp(value, min, max) {
    if (!isFinite(value)) return (min + max) / 2;
    return Math.max(min, Math.min(max, value));
  }
  function sanitizePose(view, pose) {
    var azRange = sliderRange(view.az_slide, 0, Math.PI * 2);
    var elRange = sliderRange(view.el_slide, -Math.PI / 2, Math.PI / 2);
    var bankRange = sliderRange(view.bank_slide, -Math.PI, Math.PI);
    return {
      az: wrapToRange(pose.az, azRange.min, azRange.max),
      el: clamp(pose.el, elRange.min, elRange.max),
      bank: wrapToRange(typeof pose.bank === 'number' ? pose.bank : 0, bankRange.min, bankRange.max),
      r: typeof pose.r === 'number' && isFinite(pose.r) ? pose.r : undefined
    };
  }
  function readPose(view) {
    var az = 0, el = 0, bank = 0;
    var r = typeof view.r === 'number' ? view.r : undefined;
    if (view.az_slide && typeof view.az_slide.Value === 'function') az = view.az_slide.Value();
    else if (view.angles && typeof view.angles.az === 'number') az = view.angles.az;
    if (view.el_slide && typeof view.el_slide.Value === 'function') el = view.el_slide.Value();
    else if (view.angles && typeof view.angles.el === 'number') el = view.angles.el;
    if (view.bank_slide && typeof view.bank_slide.Value === 'function') bank = view.bank_slide.Value();
    else if (view.angles && typeof view.angles.bank === 'number') bank = view.angles.bank;
    return sanitizePose(view, { az: az, el: el, bank: bank, r: r });
  }
  function applyPose(view, pose) {
    var p = sanitizePose(view, pose);
    view.board._change3DView = true;
    try {
      if (typeof p.r === 'number') view.setView(p.az, p.el, p.r);
      else view.setView(p.az, p.el);
      if (view.bank_slide && typeof view.bank_slide.setValue === 'function') view.bank_slide.setValue(p.bank);
      if (view.angles) view.angles.bank = p.bank;
      view.board.update();
    } finally {
      view.board._change3DView = false;
    }
    return p;
  }
  function normalizeTarget(target) {
    if (!target) throw new Error('View3DAnimate: target/home is required');
    if (Array.isArray(target)) {
      return { az: target[0], el: target[1], r: target[2], bank: typeof target[3] === 'number' ? target[3] : 0 };
    }
    if (typeof target.az !== 'number' || typeof target.el !== 'number') {
      throw new Error('View3DAnimate: pose needs numeric az and el');
    }
    return {
      az: target.az, el: target.el,
      r: typeof target.r === 'number' ? target.r : undefined,
      bank: typeof target.bank === 'number' ? target.bank : 0
    };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpAngle(a, b, t) {
    var TWO_PI = Math.PI * 2;
    var d = ((b - a + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
    return a + d * t;
  }
  function angleNear(a, b, eps) {
    var TWO_PI = Math.PI * 2;
    var d = Math.abs(((a - b + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI);
    return d <= eps;
  }
  function poseEquals(a, b, eps) {
    if (!a || !b) return false;
    eps = eps != null ? eps : POSE_EPS;
    if (!angleNear(a.az, b.az, eps)) return false;
    if (Math.abs(a.el - b.el) > eps) return false;
    if (!angleNear(a.bank || 0, b.bank || 0, eps)) return false;
    var ar = typeof a.r === 'number' ? a.r : null;
    var br = typeof b.r === 'number' ? b.r : null;
    if (ar == null && br == null) return true;
    if (ar == null || br == null) return false;
    return Math.abs(ar - br) <= eps;
  }

  function boardContainer(view) {
    return view && view.board && (view.board.containerObj || view.board.container) || null;
  }

  function setTrackballEnabled(view, enabled) {
    if (!view) return;
    var flag = !!enabled;
    try {
      if (typeof view.setAttribute === 'function') {
        view.setAttribute({ trackball: { enabled: flag } });
      }
    } catch (e) { /* ignore */ }
    try {
      if (view.visProp) {
        if (!view.visProp.trackball || typeof view.visProp.trackball !== 'object') {
          view.visProp.trackball = { enabled: flag };
        } else {
          view.visProp.trackball.enabled = flag;
        }
      }
      if (typeof view.trackballEnabled === 'boolean') view.trackballEnabled = flag;
      if (typeof view.updateAngleSliderBounds === 'function') view.updateAngleSliderBounds();
    } catch (e2) { /* ignore */ }

    var el = boardContainer(view);
    if (el && el.style) {
      if (!flag) el.setAttribute('data-v3d-trackball-locked', '1');
      else el.removeAttribute('data-v3d-trackball-locked');
    }
  }

  function lockInteraction(view) {
    if (!view) return 0;
    var depth = getLockDepth(view) + 1;
    setLockDepth(view, depth);
    if (depth === 1) setTrackballEnabled(view, false);
    return depth;
  }

  function unlockInteraction(view) {
    if (!view) return 0;
    var depth = Math.max(0, getLockDepth(view) - 1);
    setLockDepth(view, depth);
    if (depth === 0) setTrackballEnabled(view, true);
    return depth;
  }

  function captureCheckpoint(view) {
    if (!view) throw new Error('View3DAnimate.captureCheckpoint: invalid view');
    return setCheckpoint(view, readPose(view));
  }

  function ensureRestored(view) {
    if (!view) return false;
    var cp = getCheckpoint(view);
    if (!cp) return false;
    var cur = readPose(view);
    if (poseEquals(cur, cp)) return false;
    applyPose(view, cp);
    return true;
  }

  function beginPlayback(view) {
    ensureRestored(view);
    lockInteraction(view);
  }

  function endPlayback(view, opts) {
    opts = opts || {};
    if (opts.capture !== false) {
      try { captureCheckpoint(view); } catch (e) { /* ignore */ }
    }
    unlockInteraction(view);
  }

  function cancel(view) {
    var job = getRunning(view);
    if (!job || job.done) { stopOfficialAzimuth(view); return; }
    job.done = true;
    job._finished = true;
    if (job.raf) cancelAnimationFrame(job.raf);
    setRunning(view, null);
    stopOfficialAzimuth(view);
    if (job._playbackLocked) {
      endPlayback(view, { capture: false });
      job._playbackLocked = false;
    }
    if (typeof job.onCancel === 'function') job.onCancel();
    if (typeof job._resolve === 'function') {
      job._resolve({ reason: 'cancel', pose: readPose(view) });
    }
  }

  function captureHome(view) {
    if (!view) throw new Error('View3DAnimate.captureHome: invalid view');
    return setHome(view, readPose(view));
  }

  function to(view, target, options) {
    if (!view || typeof view.setView !== 'function') throw new Error('View3DAnimate.to: invalid View3D');
    options = options || {};
    var duration = options.duration != null ? options.duration : 600;
    var easingName = options.easing || 'easeOutCubic';
    var ease = typeof easingName === 'function' ? easingName : (easings[easingName] || easings.easeOutCubic);
    cancel(view);
    beginPlayback(view);
    var from = readPose(view);
    var toPose = sanitizePose(view, normalizeTarget(target));
    if (toPose.r == null) toPose.r = from.r;
    var job = {
      raf: 0,
      done: false,
      type: 'to',
      onCancel: options.onCancel,
      _playbackLocked: true
    };
    setRunning(view, job);
    var start = null;
    var resolvePromise;
    var promise = new Promise(function (resolve) { resolvePromise = resolve; });
    job._resolve = function (payload) {
      if (resolvePromise) {
        resolvePromise(payload);
        resolvePromise = null;
      }
    };
    function finish(reason) {
      if (job._finished) return;
      job._finished = true;
      job.done = true;
      setRunning(view, null);
      if (reason === 'complete') {
        toPose = applyPose(view, toPose);
        if (typeof options.onComplete === 'function') options.onComplete(toPose);
        if (job._playbackLocked) {
          endPlayback(view, { capture: true });
          job._playbackLocked = false;
        }
      } else if (job._playbackLocked) {
        endPlayback(view, { capture: false });
        job._playbackLocked = false;
        if (typeof options.onCancel === 'function') options.onCancel();
      }
      job._resolve({ reason: reason, pose: reason === 'complete' ? toPose : readPose(view) });
    }
    function frame(now) {
      if (job.done) return;
      if (start == null) start = now;
      var t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      var k = ease(t);
      var pose = {
        az: lerpAngle(from.az, toPose.az, k),
        el: lerp(from.el, toPose.el, k),
        bank: lerpAngle(from.bank, toPose.bank, k),
        r: typeof toPose.r === 'number' && typeof from.r === 'number' ? lerp(from.r, toPose.r, k) : toPose.r
      };
      applyPose(view, pose);
      if (typeof options.onUpdate === 'function') options.onUpdate({ t: t, k: k, az: pose.az, el: pose.el, bank: pose.bank, r: pose.r });
      if (t < 1) job.raf = requestAnimationFrame(frame);
      else finish('complete');
    }
    job.raf = requestAnimationFrame(frame);
    return {
      cancel: function () {
        if (job.done) return;
        if (job.raf) cancelAnimationFrame(job.raf);
        finish('cancel');
      },
      promise: promise
    };
  }

  function reset(view, home, options) {
    var target = home;
    if (home && typeof home === 'object' && !Array.isArray(home) && home.az == null && home.duration != null) {
      options = home; target = null;
    }
    if (!target) target = getHome(view);
    if (!target) throw new Error('View3DAnimate.reset: no home. Call captureHome/setHome first, or pass home.');
    return to(view, target, options);
  }

  function spin(view, options) {
    if (!view || typeof view.setView !== 'function') throw new Error('View3DAnimate.spin: invalid View3D');
    options = options || {};
    var speed = options.speed != null ? options.speed : 0.7;
    cancel(view);
    beginPlayback(view);
    var pose = readPose(view);
    if (typeof options.el === 'number') pose.el = options.el;
    if (typeof options.bank === 'number') pose.bank = options.bank;
    var job = { raf: 0, done: false, type: 'spin', _playbackLocked: true };
    setRunning(view, job);
    var last = null;
    function frame(now) {
      if (job.done) return;
      if (last == null) last = now;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      pose.az += speed * dt;
      pose = applyPose(view, pose);
      if (typeof options.onUpdate === 'function') options.onUpdate({ az: pose.az, el: pose.el, bank: pose.bank, r: pose.r, dt: dt });
      job.raf = requestAnimationFrame(frame);
    }
    job.raf = requestAnimationFrame(frame);
    function stop() {
      if (job.done) return;
      job.done = true;
      if (job.raf) cancelAnimationFrame(job.raf);
      setRunning(view, null);
      if (job._playbackLocked) {
        endPlayback(view, { capture: true });
        job._playbackLocked = false;
      }
    }
    job._stopWithCheckpoint = stop;
    return { cancel: stop, stop: stop };
  }
  function stopSpin(view) {
    var job = getRunning(view);
    if (job && job.type === 'spin' && typeof job._stopWithCheckpoint === 'function') {
      job._stopWithCheckpoint();
      return;
    }
    cancel(view);
  }

  return {
    to: to,
    reset: reset,
    spin: spin,
    stopSpin: stopSpin,
    cancel: cancel,
    readPose: readPose,
    applyPose: applyPose,
    captureHome: captureHome,
    setHome: setHome,
    getHome: getHome,
    captureCheckpoint: captureCheckpoint,
    getCheckpoint: getCheckpoint,
    ensureRestored: ensureRestored,
    lockInteraction: lockInteraction,
    unlockInteraction: unlockInteraction,
    setTrackballEnabled: setTrackballEnabled,
    poseEquals: poseEquals,
    easings: easings
  };
});

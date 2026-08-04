// 手指引导提示 — AIClassComponent.createHandHint
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var dom = ns._dom

  if (!dom) throw new Error('[AIClassComponent.HandHint] shared/dom.js is required')

  var SVG_NS = 'http://www.w3.org/2000/svg'
  var HAND_PATH = 'M864.65 336.975v-0.079c56.91 0 98.58 45.804 98.58 102.321v204.485c0 193.26-26.94 349.932-317.283 349.932-127.055 0-187.156-25.363-239.616-68.135a103.778 103.778 0 0 1-19.377-14.966L99.249 624.64c-48.994-49.034-26.584-117.957 7.759-152.222 34.265-34.343 105.433-39.975 145.723 0l62.425 62.307V137.689a102.676 102.676 0 0 1 103.03-102.243c56.91 0 99.643 45.726 99.643 102.243v103.817a102.4 102.4 0 0 1 48.6-12.209c45.293 0 80.463 29.066 94.287 69.317 15.754-9.728 34.856-15.517 54.863-15.517 45.292 0 80.384 29.065 94.208 69.395a95.31 95.31 0 0 1 52.145-15.517h2.757z m44.19 306.727v0.158h0.236V445.755c0-50.333-47.301-48.364-47.301-48.364-26.94 0-46.986 21.661-46.986 48.364v106.417h-0.551a31.114 31.114 0 0 1 0.55 5.435 26.466 26.466 0 0 1-26.544 26.86 27.018 27.018 0 0 1-26.546-32.295h-0.55v-156.12c0-45.332-48.76-48.404-48.76-48.404-26.938 0-46.08 21.7-46.08 48.404v123.943h-0.63a26.978 26.978 0 0 1-26.505 32.295 27.018 27.018 0 0 1-26.545-32.295h-0.552V342.37c0-49.112-47.773-48.443-47.773-48.443-26.94 0-46.474 21.662-46.474 48.443v134.538h-0.512a26.978 26.978 0 0 1-26.624 32.296 27.018 27.018 0 0 1-26.545-32.296h-0.512v-328.35c0-26.702-18.432-48.442-45.371-48.442-27.018 0-48.837 21.74-48.837 48.443v516.214c-49.231-48.837-98.383-97.753-147.535-146.629-19.062-18.905-55.257-18.196-74.949 1.575-19.653 19.693-25.758 50.452-1.694 74.595l272.306 270.533c50.53 50.176 117.248 74.91 228.234 74.91 262.262 0 263.05-132.53 263.05-296.055z'

  function createSvg() {
    var svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('class', 'aic-hand-hint-icon')
    svg.setAttribute('viewBox', '0 0 1024 1024')
    svg.setAttribute('aria-hidden', 'true')
    var path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', HAND_PATH)
    svg.appendChild(path)
    return svg
  }

  // opts: { placement, animated, motion, size, text, label, className }
  function createHandHint(opts) {
    opts = opts || {}
    var root = dom.create('div', {
      className: 'aic-hand-hint' + (opts.className ? ' ' + opts.className : ''),
      attributes: {
        'data-placement': opts.placement || 'bottom-right',
        'data-animate': opts.animated === false ? 'false' : 'true',
        'data-motion': opts.motion || 'tap',
        'aria-label': opts.label || '可交互提示'
      }
    })
    if (opts.size) root.style.setProperty('--aic-hand-hint-size', String(opts.size))
    root.appendChild(createSvg())
    if (opts.text) {
      root.appendChild(dom.create('span', {
        className: 'aic-hand-hint-text',
        text: opts.text
      }))
    }
    return { el: root }
  }

  ns.createHandHint = createHandHint
})()

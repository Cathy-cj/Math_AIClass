// file:// 的 origin 为 null；将同源调试壳中的 null targetOrigin 转为通配符。
;(function () {
  if (window.location.protocol !== 'file:') return

  function patch(target) {
    if (!target || target._aicPostMessagePatched) return
    var nativePostMessage = target.postMessage
    if (typeof nativePostMessage !== 'function') return
    target.postMessage = function (message, targetOrigin, transfer) {
      if (targetOrigin === 'null') targetOrigin = '*'
      return nativePostMessage.call(target, message, targetOrigin, transfer)
    }
    target._aicPostMessagePatched = true
  }

  patch(window)
  try { patch(window.parent) } catch (e) {}

  // file:// iframe 中 MathLive 会把内置 virtual keyboard 代理到顶层窗口，
  // 以 window.origin（'null'）作 targetOrigin 调 postMessage 直接抛 SyntaxError。
  // 预置 no-op stub 使 MathLive 跳过该代理挂载；math-field 挂载/聚焦时会直接调用
  // addEventListener/connect/disconnect 等方法（无可选链保护），故必须返回对象而非 null。
  // 课件使用自有悬浮键盘，不用 MathLive 内置键盘。
  var noop = function () {}
  var mathVirtualKeyboardStub = {
    visible: false,
    isShifted: false,
    boundingRect: { x: 0, y: 0, width: 0, height: 0 },
    container: null,
    addEventListener: noop,
    removeEventListener: noop,
    connect: noop,
    disconnect: noop,
    show: noop,
    hide: noop,
    update: noop,
    updateToolbar: noop,
    setKeycap: noop,
    getKeycap: function () { return undefined },
    executeCommand: function () { return false },
    dispose: noop
  }
  Object.defineProperty(window, 'mathVirtualKeyboard', {
    get: function () { return mathVirtualKeyboardStub },
    configurable: true
  })
})()

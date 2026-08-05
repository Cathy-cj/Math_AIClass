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
})()

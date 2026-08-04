// 课程可选 OCR provider 示例。正式实现应把密钥保存在受控宿主中，而不是浏览器源码。
;(function () {
  window.AIClassProviders = window.AIClassProviders || {}
  window.AIClassProviders.ocr = {
    recognize: function () {
      return Promise.reject(new Error('Replace this example with a trusted OCR provider.'))
    }
  }
})()

// 加载 LESSON_MANIFEST 声明的本课脚本与模块，最后启动 message-bridge
;(function () {
  var boot = window.__COURSE_BOOT || {}
  var srcRoot = boot.srcRoot || 'src'
  var manifest = window.LESSON_MANIFEST
  if (!manifest) {
    throw new Error('[lesson-scripts] LESSON_MANIFEST not found — check lesson/manifest.js')
  }

  function writeScript(src) {
    document.write('<script src="' + src + '"><\/script>')
  }

  ;(manifest.scripts || []).forEach(writeScript)
  ;(manifest.modules || []).forEach(writeScript)
  writeScript(srcRoot + '/bridge/message-bridge.js')
})()

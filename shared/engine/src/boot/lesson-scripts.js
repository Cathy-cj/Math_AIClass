// 加载 LESSON_MANIFEST 声明的本课脚本与模块，最后启动 message-bridge
;(function () {
  var boot = window.__COURSE_BOOT || {}
  var srcRoot = boot.srcRoot || 'src'
  var lessonRoot = boot.lessonRoot || 'lesson'
  var manifest = window.LESSON_MANIFEST
  if (!manifest) {
    throw new Error('[lesson-scripts] LESSON_MANIFEST not found — check lesson/manifest.js')
  }

  function writeScript(src) {
    document.write('<script src="' + src + '"><\/script>')
  }

  function lessonPath(src) {
    return src.indexOf('lesson/') === 0
      ? lessonRoot + '/' + src.slice('lesson/'.length)
      : src
  }

  ;(manifest.scripts || []).map(lessonPath).forEach(writeScript)
  ;(manifest.modules || []).map(lessonPath).forEach(writeScript)
  writeScript(srcRoot + '/bridge/message-bridge.js')
})()

// 同步加载引擎脚本 → lesson manifest → lesson-scripts（file:// 兼容）
;(function () {
  var boot = window.__COURSE_BOOT || {}
  var srcRoot = boot.srcRoot || 'src'
  var lessonRoot = boot.lessonRoot || 'lesson'

  function writeScript(src) {
    document.write('<script src="' + src + '"><\/script>')
  }

  function enginePath(rel) {
    if (/^https?:\/\//i.test(rel)) return rel
    return srcRoot + '/' + rel
  }

  var manifest = window.AICLASS_ENGINE_MANIFEST
  if (!manifest) {
    throw new Error('[loader] AICLASS_ENGINE_MANIFEST not found — check engine-manifest.js')
  }

  manifest.forEach(function (rel) {
    writeScript(enginePath(rel))
  })

  writeScript(lessonRoot + '/course.meta.js')
  writeScript(lessonRoot + '/config.local.js')
  writeScript(lessonRoot + '/handlers.js')
  writeScript(lessonRoot + '/bootstrap.js')
  writeScript(lessonRoot + '/manifest.js')
  writeScript(srcRoot + '/boot/lesson-scripts.js')
})()

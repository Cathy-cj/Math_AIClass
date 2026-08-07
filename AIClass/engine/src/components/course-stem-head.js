// 题号行：题号 + 来源 + 难度胶囊，从左依次排列（不靠右撑开）
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}

  /**
   * @param {{ head?: string, difficulty?: number, difficultyMax?: number }} opts
   * @returns {HTMLElement|null}
   */
  function createCourseStemHead(opts) {
    opts = opts || {}
    if (!opts.head && !(opts.difficulty >= 1)) return null

    var root = document.createElement('div')
    root.className = 'course-stem-head'

    var group = document.createElement('div')
    group.className = 'course-stem-head__group'

    if (opts.head) {
      var labelNode = document.createElement('span')
      labelNode.className = 'course-label'
      labelNode.textContent = opts.head
      group.appendChild(labelNode)
    }

    if (opts.difficulty >= 1 && opts.difficulty <= 8 &&
        typeof ns.createDifficultyStars === 'function') {
      var diffOpts = {}
      if (opts.difficultyMax >= 1 && opts.difficultyMax <= 8) {
        diffOpts.max = opts.difficultyMax
      }
      var diffNode = ns.createDifficultyStars(opts.difficulty, diffOpts)
      if (diffNode) group.appendChild(diffNode)
    }

    root.appendChild(group)
    return root
  }

  ns.createCourseStemHead = createCourseStemHead
})()

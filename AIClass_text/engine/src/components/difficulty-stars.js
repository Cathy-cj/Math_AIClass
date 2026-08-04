// 题目难度星级（图片）— AIClassComponent.createDifficultyStars
;(function () {
  var ns = window.AIClassComponent = window.AIClassComponent || {}
  var MAX_STARS = 8
  var ASSET_BASE = 'src/assets/difficulty-stars/'

  var STAR_IMAGES = {
    gold: ASSET_BASE + 'star-gold.png',
    red: ASSET_BASE + 'star-red.png',
    dim: ASSET_BASE + 'star-dim.png'
  }

  function clampLevel(level) {
    var n = Math.round(Number(level))
    if (n < 1) return 0
    if (n > MAX_STARS) return MAX_STARS
    return n
  }

  function createDifficultyStars(level, opts) {
    opts = opts || {}
    level = clampLevel(level)
    if (!level) return null

    var tier = level >= 7 ? 'red' : 'gold'
    var max = opts.max != null ? Math.min(MAX_STARS, Math.max(1, Math.round(opts.max))) : MAX_STARS

    var root = document.createElement('span')
    root.className = 'course-difficulty'

    var label = document.createElement('span')
    label.className = 'course-difficulty__label'
    label.textContent = opts.label != null ? String(opts.label) : '难度等级'
    root.appendChild(label)

    var starsWrap = document.createElement('span')
    starsWrap.className = 'course-difficulty__stars'
    starsWrap.setAttribute('aria-hidden', 'true')

    for (var i = 0; i < max; i++) {
      var lit = i < level
      var img = document.createElement('img')
      img.className = 'course-difficulty__star' + (lit ? ' is-lit is-lit--' + tier : ' is-dim')
      img.src = lit ? STAR_IMAGES[tier] : STAR_IMAGES.dim
      img.alt = ''
      img.setAttribute('aria-hidden', 'true')
      img.draggable = false
      starsWrap.appendChild(img)
    }

    root.appendChild(starsWrap)
    return root
  }

  ns.createDifficultyStars = createDifficultyStars
  ns.DIFFICULTY_MAX_STARS = MAX_STARS
})()

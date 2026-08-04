// Figure 注册表 — lesson 容器 figure 字段可用字符串 id
;(function () {
  var figures = {}

  function register(id, def) {
    if (!id || !def) throw new Error('[AIClassFigureRegistry] invalid figure')
    if (figures[id]) throw new Error('[AIClassFigureRegistry] duplicate figure: ' + id)
    def.states = Array.isArray(def.states) ? def.states.slice() : []
    def.capabilities = Array.isArray(def.capabilities) ? def.capabilities.slice() : []
    figures[id] = def
  }

  function get(id) {
    return figures[id] || null
  }

  function resolve(value) {
    if (!value) return null
    if (typeof value === 'string') return get(value)
    return value
  }

  function list() {
    return Object.keys(figures).map(function (id) {
      return {
        id: id,
        states: figures[id].states.slice(),
        capabilities: figures[id].capabilities.slice()
      }
    })
  }

  window.AIClassFigureRegistry = {
    register: register,
    get: get,
    resolve: resolve,
    list: list
  }
})()

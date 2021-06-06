export function createAsyncComponent(defer, callback) {
  let component = null
  let deferer = null
  return function(...args) {
    if (!deferer) {
      const { view } = this
      deferer = defer().then((res) => {
        if (typeof Symbol !== 'undefined' && res && res[Symbol.toStringTag] === 'Module') {
          component = res.default
        }
        else if (res && res.__esModule) {
          component = res.default
        }
        else {
          component = res
        }
        if (callback) {
          component = callback.call(view, component, ...args) || component
        }
        view.update(true)
      })
    }
    return component
  }
}

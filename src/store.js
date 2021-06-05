import { assign, isFunction } from 'ts-fns'

/**
 *
 * @param {object} initState
 * @param {object} options
 * @param {function} options.onChange invoke when state change
 * @param {function} options.drive drive the state to be changed, i.e. (update) => { setInterval(() => update(state => state.age ++, 1000)) }
 * @returns
 */
export function createStore(initState, options) {
  const views = []
  return function() {
    const view = this
    views.push(view)
    view.on('$change', () => (e, { keyPath, value }) => {
      views.forEach((item) => {
        if (item === view) {
          if (options && isFunction(options.onChange)) {
            options.onChange(keyPath, value)
          }
          return
        }
        item.update((state) => {
          assign(state, keyPath, value)
        })
      })
    })
    view.on('$destroy', () => {
      views.forEach((item, i) => {
        if (item === view) {
          views.splice(i, 1)
        }
      })
    })

    if (options && isFunction(options.drive)) {
      options.drive((arg) => view.update(arg))
    }

    return initState
  }
}

import { assign } from 'ts-fns'

export function createStore(initState) {
  const views = []
  return function() {
    const view = this
    views.push(view)
    view.on('$change', () => (e, { keyPath, value }) => {
      views.forEach((item) => {
        if (item === view) {
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
    return initState
  }
}

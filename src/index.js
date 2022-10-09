import { useJQuery, component, directive, filter, View } from './jqvm.js'
import { createStore } from './store.js'
import { createAsyncComponent } from './async.js'
import { createRouter } from './router.js'

// use in browser
if (typeof jQuery !== 'undefined') {
  useJQuery(jQuery)
}

export {
  component,
  directive,
  filter,
  View,
  useJQuery,
  createStore,
  createAsyncComponent,
  createRouter,
}

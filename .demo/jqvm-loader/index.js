import ComponentA from './component-a.html'

import jQuery from 'jquery'
import { useJQuery } from 'jqvm'

const $ = useJQuery(jQuery)

$('#app').vm({})
  .component('comp-a', ComponentA)
  .mount()

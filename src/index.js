import $ from 'jquery'
import { Store, Model, TraceModel, Meta } from 'tyshemo'
import ScopeX from 'scopex'
import { getStringHash, isNone, each, isInheritedOf, isInstanceOf, isObject, isFunction } from 'ts-fns'

import { getOuterHTML, parseAttrs, tryParseJSON } from './utils.js'

const components = {}
const directives = {}

function component(name, link) {
  components[name] = link
}

function directive(attr, link) {
  directives[attr] = link
}

function compileDirectives($wrapper, scopex) {
  const attrs = Object.keys(directives)
  attrs.forEach((attr) => {
    const link = directives[attr]
    const els = $wrapper.find(`[${attr}]`)

    els.each(function() {
      const $el = $(this)

      const oAttrs = Array.from(this.attributes)
      const attrs = {}
      oAttrs.forEach((node) => {
        const { name, value } = node
        attrs[name] = value
      })

      const output = link.call(scopex, $el, attrs)
      if (!isNone(output) && $el !== output) {
        $el.replaceWith(output)
      }
    })
  })
}

function compileComponents($wrapper, scopex) {
  const names = Object.keys(components)
  names.forEach((name) => {
    const link = components[name]
    const els = $wrapper.find(name)

    els.each(function() {
      const $el = $(this)
      const outerHTML = this.outerHTML

      const html = outerHTML.replace(new RegExp(`<${name}([\\s\\S]*?)>[\\s\\S]*?</${name}>`, 'gm'), (component, attrsStr) => {
        const attrsArr = parseAttrs(attrsStr)
        const attrs = {}
        attrsArr.forEach(({ key, value}) => {
          attrs[key] = value
        })
        const output = link.call(scopex, $el, attrs)
        return output
      })
      const result = compile(html, scopex)
      $el.replaceWith(result)
    })
  })
}

function compile(template, scopex) {
  const $wrapper = $('<div />').html(template)
  compileDirectives($wrapper, scopex)
  compileComponents($wrapper, scopex)
  const innerHTML = $wrapper.html()
  const result = scopex.interpolate(innerHTML)
  return result
}

function vm(initState) {
  const $this = $(this)
  const el = $this[0]
  const hash = getStringHash(getOuterHTML(el))
  const container = `[jq-vm=${hash}]`
  const template = $this.html()
  const getMountNode = () => mountTo ? $(mountTo) : $this.next(container)

  let store = null
  let scope = null
  let scopex = null

  let mountTo = null
  let isMounted = false

  const callbacks = []

  const view = new View()
  Object.assign(view, {
    once(...args) {
      bind(args, true)
      return view
    },
    on(...args) {
      bind(args)
      return view
    },
    off(...args) {
      unbind(...args)
      return view
    },
    mount(el) {
      init()
      mount(el)
      return view
    },
    unmount() {
      unmount()
      destroy()
      return view
    },
  })

  function init() {
    if (isFunction(initState)) {
      initState = initState()
    }

    if (isInheritedOf(initState, Model)) {
      store = new initState()
      scope = store
      scopex = new ScopeX(scope)
    }
    else if (isInstanceOf(initState, Model)) {
      store = initState
      scope = store
      scopex = new ScopeX(scope)
    }
    else if (isInstanceOf(initState, Store)) {
      store = initState
      scope = store.state
      scopex = new ScopeX(scope)
    }
    else if (isObject(initState)) {
      store = new Store(initState)
      scope = store.state
      scopex = new ScopeX(scope)
    }
    else {
      throw new TypeError('initState is not match required type')
    }
  }

  function destroy() {
    store = null
    scope = null
    scopex = null
  }

  function render() {
    const $container = getMountNode()
    const $retainers = $container.find('[jq-hash]')

    const active = document.activeElement
    const activeStart = active.selectionStart
    const activeEnd = active.selectionEnd
    const activeTag = active.tagName.toLocaleLowerCase()
    const activeType = active.type

    const result = compile(template, scopex)
    $container.html(result)

    $retainers.each(function() {
      const $retainer = $(this)
      const $container = $(container)
      const hash = $retainer.attr('jq-hash')

      const $target = $container.find(`[jq-hash=${hash}]`)
      if ($target.length) {
        $target.replaceWith($retainer)
      }
    })

    const $active = $(active)
    const hash = $active.attr('jq-hash')
    if (hash && (activeTag === 'input' || activeTag === 'textarea')) {
      if (activeTag === 'input' && ['checkbox', 'radio', 'range', 'color'].includes(activeType)) {
        return
      }

      const $target = $(`[jq-hash=${hash}]`)

      if (!$target.length) {
        return
      }

      const target = $target[0]
      target.focus()
      target.setSelectionRange(activeStart, activeEnd)
    }
  }

  function mount(el) {
    if (isMounted) {
      return view
    }

    const $next = $this.next(container)
    let $container = null

    mountTo = el || null // cache mount node
    isMounted = true

    if (el) {
      $container = $(el)
      $container.attr('jq-vm', hash)
    }
    else if ($next.length) {
      return
    }
    else {
      $container = $('<div />', {
        'jq-vm': hash,
      })
      $this.after($container)
    }

    render()
    store.watch('*', render, true)
    $container.trigger('$mount')
  }

  function unmount() {
    if (!isMounted) {
      return view
    }

    const $container = getMountNode()

    if (!$container.length) {
      return
    }

    $container.trigger('$unmount')
    store.unwatch('*', render)

    if (mountTo) {
      $container.html('')
      $container.removeAttr('jq-vm')
    }
    else {
      $container.remove()
    }
    mountTo = null
    isMounted = false
  }

  function bind(args, once) {
    const params = [...args]
    const fn = params.pop()
    const callback = function(e) {
      const handle = fn.call(view, scope)
      return isFunction(handle) ? handle.call(this, e) : null
    }

    const $container = getMountNode()
    const action = once ? 'one' : 'on'

    $container[action](...params, callback)
    callbacks.push([fn, callback])
  }

  function unbind(args) {
    if (args.length === 1) {
      const $container = getMountNode()
      $container.off(...args)
      return
    }

    const params = [...args]
    const fn = params.pop()
    callbacks.forEach((item, i) => {
      if (fn !== item[0]) {
        return
      }

      const callback = item[1]
      const $container = getMountNode()

      $container.off(...params, callback)
      callbacks.splice(i, 1)
    })
  }

  return view
}

// register inside directives

directive('jq-id', function(el, attrs) {
  const attr = attrs['jq-id']
  const value = this.interpolate(attr)
  attrs['jq-id'] = value
})

directive('jq-if', function(el, attrs) {
  const attr = attrs['jq-if']
  const value = tryParseJSON(attr, (attr) => this.parse(attr))
  return value ? el : ''
})

directive('jq-class', function(el, attrs) {
  const attr = attrs['jq-class']
  const obj = this.parse(attr)
  each(obj, (value ,key) => {
    if (value) {
      el.addClass(key)
    }
  })
})

directive('jq-value', function(el, attrs) {
  const hash = attrs['jq-hash'] || getStringHash(getOuterHTML(el[0]))

  const attr = attrs['jq-value']
  const value = this.parse(attr)

  if (el.is('select')) {
    const option = el.find(`option[value=${value}]`)
    option.attr('selected', 'selected')
  }
  else if (el.is('input')) {
    el.attr('value', value)
  }
  else if (el.is('textarea')) {
    el.text(value)
  }

  el.attr('jq-hash', hash)
})

directive('jq-disabled', function(el, attrs) {
  const hash = attrs['jq-hash'] || getStringHash(getOuterHTML(el[0]))

  const attr = attrs['jq-disabled']
  const value = this.parse(attr)

  el.attr('disabled', value ? 'disabled' : null)
  el.attr('jq-hash', hash)
})

directive('jq-checked', function(el, attrs) {
  const hash = attrs['jq-hash'] || getStringHash(getOuterHTML(el[0]))

  const attr = attrs['jq-checked']
  const value = this.parse(attr)

  el.attr('checked', value ? 'checked' : null)
  el.attr('jq-hash', hash)
})

directive('jq-selected', function(el, attrs) {
  const hash = attrs['jq-hash'] || getStringHash(getOuterHTML(el[0]))

  const attr = attrs['jq-selected']
  const value = this.parse(attr)

  el.attr('selected', value ? 'selected' : null)
  el.attr('jq-hash', hash)
})

directive('jq-src', function(el, attrs) {
  const hash = attrs['jq-hash'] || getStringHash(getOuterHTML(el[0]))

  const attr = attrs['jq-src']
  const value = this.parse(attr)

  el.attr('jq-hash', hash)
  el.attr('src', value)
})

directive('jq-repeat', function(el, attrs) {
  const attr = attrs['jq-repeat']
  const repeatScope = attrs['repeat-scope'] || '{}'
  const repeatKey = attrs['repeat-key'] || 'key'
  const repeatValue = attrs['repeat-value'] || 'value'

  const data = this.parse(attr)
  const scope = this.parse(repeatScope)

  // make it not be able to compile again
  el.removeAttr('jq-repeat')
  el.attr('x-jq-repeat', attr)

  const template = el[0].outerHTML
  const els = []

  each(data, (value, key) => {
    const scopex = new ScopeX({
      [repeatKey]: key,
      [repeatValue]: value,
      ...scope,
    })

    const html = compile(template, scopex)
    const result = scopex.interpolate(html)
    els.push(result)
  })

  const result = els.join('')
  const output = result.replace(/x\-jq\-repeat/g, 'jq-repeat')
  el.replaceWith(output)
})

// --------------------------------

class ViewModel extends TraceModel {}
class View {}

$.fn.vm = vm
$.vm = {
  component,
  directive,
  ViewModel,
  Meta,
  Store,
  View,
}

export { vm }
export default vm

import ViewModel from 'tyshemo/src/store'
import ScopeX from 'scopex'
import { getStringHash, isNone, each, isInstanceOf, isObject, isFunction, isString, diffArray } from 'ts-fns'

import { getOuterHTML, tryParseJSON, createAttrs } from './utils.js'

let $ = null
class View {}
const globalComponents = {}
const globalDirectives = []

function component(name, link) {
  globalComponents[name] = link
}

function directive(name, link) {
  globalDirectives.forEach((item, i) => {
    if (item[0] === name) {
      globalDirectives.splice(i, 1)
    }
  })
  globalDirectives.push([name, link])
}

// ----------- compiler ---------------

const createIterator = (link, scopex) => function iterate() {
  const $el = $(this)
  const attrs = createAttrs(this.attributes)
  const output = link.call(scopex, $el, attrs)
  if (!isNone(output) && $el !== output) {
    $el.replaceWith(output)
  }
}

const compileDirectives = ($wrapper, scopex, directives) => {
  directives.forEach(([name, link]) => {
    const $els = $wrapper.find(`[${name}]`)
    $els.each(createIterator(link, scopex))
  })
}

const compileComponents = ($wrapper, scopex, components) => {
  const names = Object.keys(components)
  names.forEach((name) => {
    const link = components[name]
    const $els = $wrapper.find(name)
    $els.each(createIterator(link, scopex))
  })
}

function compile(template, scopex, components, directives) {
  const $wrapper = $('<div />').html(template)
  compileDirectives($wrapper, scopex, directives)
  compileComponents($wrapper, scopex, components)
  const innerHTML = $wrapper.html()
  const result = scopex.interpolate(innerHTML)
  return result
}

// ---------------- main ---------------

function vm(initState) {
  const $this = $(this)
  const el = $this[0]
  const hash = getStringHash(getOuterHTML(el))
  const container = `[jq-vm=${hash}]`
  const getMountNode = () => {
    return mountTo ? $(mountTo) : $this.next(container)
  }

  let vm = null
  let state = null
  let scopex = null

  let mountTo = null
  let isMounted = false

  const components = { ...globalComponents }
  const directives = { ...globalDirectives }
  const actions = []
  const view = new View()
  
  function component(name, link) {
    components[name] = link
  }

  function directive(name, link) {
    directives.forEach((item, i) => {
      if (item[0] === name) {
        directives.splice(i, 1)
      }
    })
    directives.push([name, link])
  }

  function init(initState) {
    if (isFunction(initState)) {
      initState = initState()
    }

    if (isInstanceOf(initState, ViewModel)) {
      vm = initState
      state = vm.state
      scopex = new ScopeX(state)
    }
    else if (isObject(initState)) {
      vm = new ViewModel(initState)
      state = vm.state
      scopex = new ScopeX(state)
    }
    else if (initState && typeof initState === 'object') {
      vm = initState
      state = initState
      scopex = new ScopeX(state)
    }
  }

  function listen() {
    $this.on('$mount', () => {
      const $container = getMountNode()
      actions.forEach((item) => {
        const { type, info, action } = item
        $container[type](...info, action)
      })
    })

    $this.on('$unmount', () => {
      const $container = getMountNode()
      actions.forEach((item, i) => {
        const { info, action } = item
        $container.off(...info, action)
        actions.splice(i, 1)
      })
    })
  }

  function render() {
    const $container = getMountNode()
    const $retainers = $container.find('[jq-hash]')

    const active = document.activeElement
    const activeStart = active ? active.selectionStart : 0
    const activeEnd = active ? active.selectionEnd : 0

    const template = $this.html()
    const result = compile(template, scopex, components, directives)
    diffAndPatch($container, result)

    const attrs = $this.attr('attrs')
    if (attrs) {
      const props = scopex.parse(attrs)
      each(props, (value, key) => {
        if (key === 'class') {
          const items = value.split(' ')
          items.forEach(item => $container.addClass(item))
        }
        else if (key === 'style') {
          if (isObject(value)) {
            $container.css(value)
          }
          else if (isString(value)) {
            const style = $container.attr('style') || ''
            const rules = style.split(';').concat(value.split(';')).filter(item => !!item)
            const stylesheet = rules.join(';')
            $container.attr('style', stylesheet)
          }
        }
        else {
          $container.attr(key, value)
        }
      })
    }

    $retainers.each(function() {
      const $retainer = $(this)
      const $container = getMountNode()
      const hash = $retainer.attr('jq-hash')

      const $target = $container.find(`[jq-hash=${hash}]`)
      if ($target.length) {
        const target = $target[0]
        const attrs = createAttrs(target.attributes)
        const childNodes = target.childNodes

        $retainer.attr(attrs)
        if (childNodes.length) {
          $retainer.html(childNodes)
        }
        else {
          $retainer.html($target.html())
        }

        $target.replaceWith($retainer)
      }
    })

    // recover active form elements
    if (active) {
      const $active = $(active)
      const hash = $active.attr('jq-hash')
      if (hash) {
        active.focus()
        if (activeStart) {
          active.setSelectionRange(activeStart, activeEnd)
        }
      }
    }

    $container.trigger('$render')
  }
  
  function diffAndPatch($container, nextHtml) {
    const $next = $(nextHtml)
    
    const container = $container[0]
    const next = $next[0]
    
    const containerAtrrs = creatAttrs(container)
    const nextAttrs = creatAttrs(next)
    
    const containerAttrNames = Object.keys(containerAttrs)
    const nextAttrNames = Object.keys(nextAttrs)
    
    nextAttrNames.forEach((name) => {
      const containerValue = containerAttrs[name]
      const nextValue = nextAttrs[name]
      
      if (containerValue !== nextValue) {
        $container.attr(name, nextValue)
      }
    })
    
    const diffAttrNames = diffArray(containerAtrrNames, nextAttrNames)
    diffAttrNames.forEach((name) => {
      $container.removeAttr(name)
    })
    
    const containerChildren = [...container.childNodes]
    const nextChildren = [...next.childNodes]
    
    if (!containerChildren.length) {
      nextChildren.forEach((child) => {
        container.appendChild(child)
      })
      return
    }
    
    let cursor = 0
    
    nextChildren.forEach((nextChild) => {
      const containerChild = containerChildren[cursor]
      if (nextChild.nodeName !== containerChild.nodeName) {
        container.insertBefore(nextChild, containerChild)
      }
      else {
        diffAndPatch($())
        cursor ++
      }
    })
  }

  function change(...args) {
    $container.trigger('$change', ...args)
  }
  
  function mount(el) {
    if (isMounted) {
      return view
    }

    if ($this.next(container).length) {
      return view
    }

    init(initState)

    let $container = null

    mountTo = el || null // cache mount node
    isMounted = true

    if (el) {
      $container = $(el)
      $container.attr('jq-vm', hash)
    }
    // like $('<template>aaa</template>').vm(...)
    else if (!$(document).find($this).length) {
      throw new Error('el should must be passed by view.mount')
    }
    else {
      $container = $('<div />', {
        'jq-vm': hash,
      })
      $this.after($container)
    }

    if (typeof vm.watch === 'function') {
      vm.watch('*', render, true)
      vm.watch('*', change, true)
    }

    render()
    $this.trigger('$mount')
    $container.trigger('$mount')

    return view
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
    $this.trigger('$unmount')

    if (typeof vm.unwatch === 'function') {
      vm.unwatch('*', render)
      vm.unwatch('*', change)
    }

    if (mountTo) {
      $container.html('')
      $container.removeAttr('jq-vm')
    }
    else {
      $container.remove()
    }

    mountTo = null
    isMounted = false

    return view
  }

  function destroy() {
    unmount()

    vm = null
    state = null
    scopex = null
    actions.length = 0
  }

  function update(nextState) {
    if (!isMounted) {
      return view
    }

    if (isFunction(nextState)) {
      nextState = nextState(state)
    }

    if (isObject(nextState)) {
      Object.assign(state, nextState)
    }

    render()

    return view
  }

  function bind(args, once) {
    const info = [...args]
    const fn = info.pop()
    const action = function(e) {
      const handle = fn.call(view, state)
      return isFunction(handle) ? handle.call(this, e) : null
    }
    const type = once ? 'one' : 'on'

    actions.push({ type, info, fn, action })
  }

  function unbind(args) {
    if (args.length === 1) {
      const $container = getMountNode()
      $container.off(...args)
      return
    }

    const info = [...args]
    const fn = info.pop()
    const $container = getMountNode()

    actions.forEach((item, i) => {
      const { info, action } = item
      if (fn !== item.fn) {
        return
      }

      $container.off(...info, action)
      actions.splice(i, 1)
    })
  }

  function find(selector) {
    const $container = getMountNode()
    return $container.find(selector)
  }

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
    mount,
    unmount,
    destroy,
    update,
    find,
    component,
    directive,
  })

  listen()

  return view
}

// register inside directives

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
  const output = result.replace(/x\-jq\-repeat/gm, 'jq-repeat')
  el.replaceWith(output)
})

directive('jq-if', function(el, attrs) {
  const attr = attrs['jq-if']
  const value = tryParseJSON(attr, (attr) => this.parse(attr))
  return value ? el : ''
})

directive('jq-id', function(el, attrs) {
  const attr = attrs['jq-id']
  const value = this.interpolate(attr)
  attrs['jq-id'] = value
})

directive('jq-class', function(el, attrs) {
  const hash = attrs['jq-hash'] || getStringHash(getOuterHTML(el[0]))

  const attr = attrs['jq-class']
  const obj = this.parse(attr)

  each(obj, (value ,key) => {
    if (value) {
      el.addClass(key)
    }
  })

  el.attr('jq-hash', hash)
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

  el.attr('src', value)
  el.attr('jq-hash', hash)
})

// --------------------------------

function useJQuery(jQuery) {
  $ = jQuery
  $.fn.vm = vm
  $.vm = {
    component,
    directive,
    ViewModel,
    View,
  }
  return $
}

// use in browser
if (typeof jQuery !== 'undefined') {
  useJQuery(jQuery)
}

export { component, directive, ViewModel, View, useJQuery }

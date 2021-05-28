import ScopeX from 'scopex'
import { isNone, each, isObject, isFunction, isString,
  diffArray, uniqueArray, getObjectHash, createReactive,
  isEqual, throttle, filter as filterProps, isShallowEqual } from 'ts-fns'
import { createAttrs, getPath, camelCase } from './utils.js'

let vmId = 0
let $ = null
function View() {}
const SYMBOL = {}

// ---------------

const globalComponents = []
const globalDirectives = []
const globalFilters = {}

function _push(list, name, compile, affect) {
  for (let i = 0, len = list.length; i < len; i ++) {
    const item = list[i]
    if (item.name === name) {
      list[i] = [name, compile, affect]
      return
    }
  }
  list.push([name, compile, affect])
}

function component(name, compile, affect) {
  _push(globalComponents, name, compile, affect)
}

function directive(name, compile, affect) {
  _push(globalDirectives, name, compile, affect)
}

function filter(name, fn) {
  globalFilters[name] = fn
}

// ----------- compiler ---------------

// clear and revoke effects
const prepare = ($root) => {
  const root = $root[0]
  const records = root.__jQvmCompiledRecords = root.__jQvmCompiledRecords || []

  if (!records.length) {
    return
  }

  records.forEach((record) => {
    // reset effects
    if (record.revoke) {
      record.revoke()
    }
  })

  // clear
  records.length = 0
}

const compile = (prefix = [], $root, components, directives, state, { template, scope }) => {
  const root = $root[0]
  const records = root.__jQvmCompiledRecords = root.__jQvmCompiledRecords || []

  const $element = $('<div />').html(template)

  const createIterator = (onCompile, affect, isComponent) => function() {
    const $el = $(this)
    const attrs = createAttrs(this.attributes)

    let selectors = []

    // register a view as component
    if (isComponent && onCompile instanceof View) {
      selectors = [getPath($el, $element, prefix)]
      const component = onCompile
      records.push({ selectors, affect, attrs, component, state })
      return
    }

    if (typeof onCompile === 'function') {
      // developers can recompile inside fn
      const parentPath = getPath($el.parent(), $element, prefix)
      const context = {
        scope,
        compile: compile.bind(null, parentPath, $root, components, directives, state),
      }
      const output = onCompile.call(context, $el, attrs)
      if (!isNone(output) && $el !== output) {
        const $newEls = $(output)
        $el.replaceWith($newEls)
        selectors = [...$newEls].map(el => getPath($(el), $element, prefix))
      }
    }
    else {
      selectors = [getPath($el, $element, prefix)]
    }

    records.push({ selectors, affect, attrs })
  }

  components.forEach(([name, compile, affect]) => {
    const $els = $element.find(name)
    $els.each(createIterator(compile, affect, true))
  })

  directives.forEach(([name, compile, affect]) => {
    const $els = $element.find(`[${name}]`)
    $els.each(createIterator(compile, affect))
  })

  const innerHTML = $element.html()
  const result = scope.interpolate(innerHTML)
  return result
}

const affect = ($root, scope, view) => {
  const root = $root[0]
  const records = root.__jQvmCompiledRecords = root.__jQvmCompiledRecords || []

  records.forEach((record) => {
    const { selectors, affect, attrs, component, state } = record

    if (component) {
      const $el = $root.find(selectors.join(','))
      const outside = {}
      each(attrs, (exp, attr) => {
        if (attr.indexOf(':') === 0) {
          const value = scope.parse(exp)
          const key = camelCase(attr.substring(1))
          outside[key] = value
        }
        else if (attr.indexOf('@') === 0) {
          const fn = view.fn(exp)
          const event = camelCase(attr.substring(1))
          outside[event] = (...args) => fn.call(view, state, ...args)
        }
        else {
          const key = camelCase(attr)
          outside[key] = exp
        }
      })
      component.update(outside, SYMBOL)
      if (!$el[0].__jQvmComponentRoot) {
        $el[0].__jQvmComponentRoot = true
        component.mount($el)
      }
    }

    if (typeof affect !== 'function') {
      return
    }

    const $el = $root.find(selectors.join(','))
    const revoke = affect.call({ $root, scope, view, component }, $el, attrs)
    if (typeof revoke === 'function') {
      record.revoke = revoke
    }
  })
}

// ---------------- main ---------------

function vm(initState) {
  const $template = $(this)
  const hash = $template.attr('id') || $template.attr('jq-vm-id') || (vmId ++, vmId)
  const root = `[jq-vm=${hash}]`

  let state = null
  let scope = null
  let outside = null

  let mountTo = null
  let isMounted = false
  const getMountNode = () => {
    return mountTo ? $(mountTo) : $template.next(root)
  }

  const actions = []
  const view = new View()

  // -----------

  const components = Array.from(globalComponents, component => [...component])
  const directives = Array.from(globalDirectives, directive => [...directive])
  const filters = { ...globalFilters }

  function component(name, compile, affect) {
    _push(components, name, compile, affect)
    return view
  }

  function directive(name, compile, affect) {
    _push(directives, name, compile, affect)
    return view
  }

  function filter(name, fn) {
    filters[name] = fn
    return view
  }

  // ------------

  let latestHash = null
  const nextTick = throttle(() => {
    if (!state || !latestHash) {
      return
    }

    const currentHash = getObjectHash(state)
    if (latestHash !== currentHash) {
      change()
      render(true)
    }

    latestHash = currentHash
  }, 16)
  const currTick = () => {
    latestHash = getObjectHash(state)
  }

  // -------------

  const assignOutsideState = (state, outsideState, init) => {
    const next = filterProps(outsideState, (value, key) => {
      if (!state) {
        return false
      }
      if (!(key in state)) {
        return false
      }
      if (init) {
        return true
      }
      if (outside && isShallowEqual(outside[key], value)) {
        return false
      }
      return true
    })
    Object.assign(state, next)
  }

  function init(initState) {
    if (isFunction(initState)) {
      initState = initState.call(view)
    }

    if (!initState || typeof initState !== 'object') {
      throw new Error('initState should must be an object')
    }

    if (outside) {
      assignOutsideState(initState, outside, true)
    }

    state = createReactive(initState, {
      dispatch: nextTick,
    })
    scope = new ScopeX(state, { filters })
    currTick()
  }

  function listen() {
    $template.on('$mount', () => {
      const $root = getMountNode()
      actions.forEach((item) => {
        const { type, info, action } = item
        $root[type](...info, action)
      })
    })

    $template.on('$unmount', () => {
      const $root = getMountNode()
      actions.forEach((item, i) => {
        const { info, action } = item
        $root.off(...info, action)
      })
    })
  }

  function render(isUpdating) {
    const $root = getMountNode()

    prepare($root)

    const template = $template.html()
    const html = compile([], $root, components, directives, state, { template, scope })

    if (!!isUpdating) {
      diffAndPatch($root, $('<div />').html(html), true)
    }
    else {
      $root.html(html)
    }

    affect($root, scope, view)

    const attrs = $template.attr('attrs')
    if (attrs) {
      const props = scope.parse(attrs)
      each(props, (value, key) => {
        if (key === 'class') {
          const items = value.split(' ')
          items.forEach(item => $root.addClass(item))
        }
        else if (key === 'style') {
          if (isObject(value)) {
            $root.css(value)
          }
          else if (isString(value)) {
            const style = $root.attr('style') || ''
            const rules = style.split(';').concat(value.split(';')).filter(item => !!item)
            const stylesheet = uniqueArray(rules).join(';')
            $root.attr('style', stylesheet)
          }
        }
        else {
          $root.attr(key, value)
        }
      })
    }

    $root.trigger('$render')
  }

  function diffAndPatch($current, $next, top) {
    const current = $current[0]
    const next = $next[0]

    const currentAttrs = createAttrs(current.attributes || [])
    const nextAttrs = createAttrs(next.attributes || [])

    const currentAttrNames = Object.keys(currentAttrs)
    const nextAttrNames = Object.keys(nextAttrs)

    // update/add attrs
    nextAttrNames.forEach((name) => {
      const currentValue = currentAttrs[name]
      const nextValue = nextAttrs[name]

      if (currentValue !== nextValue) {
        $current.attr(name, nextValue)
      }
    })

    // remove no use attrs
    if (!top) {
      const diffAttrNames = diffArray(currentAttrNames, nextAttrNames)
      diffAttrNames.forEach((name) => {
        // keep style and class attributes
        if (name === 'style' || name === 'class' || name === 'jq-vm') {
          return
        }
        $current.removeAttr(name)
      })
    }

    // dont diff inner component
    if (current.__jQvmComponentRoot && current.nodeName === next.nodeName) {
      return
    }

    const currentChildren = [...current.childNodes]
    const nextChildren = [...next.childNodes]

    // append all children at once if current is empty inside
    if (!currentChildren.length) {
      nextChildren.forEach((child) => {
        current.appendChild(child)
      })
      return
    }

    /**
     * diff and patch children
     */

    const $parent = $current
    const parentNode = current
    nextChildren.forEach((next, i) => {
      const $next = $(next)
      const current = parentNode.childNodes[i]
      const $current = $(current)
      const nextId = $next.attr('jq-id')

      // current index node not existing, insert the coming node directly
      if (!current) {
        parentNode.insertBefore(next, current)
      }
      // move exist element, use `jq-id` to unique element
      else if (nextId) {
        const $prev = $parent.find(`[jq-id=${nextId}]`)
        if ($prev.length) {
          const prev = $prev[0]
          // move it
          if (prev !== current) {
            parentNode.insertBefore(prev, current)
          }
          // update the node
          diffAndPatch($prev, $next)
        }
        else {
          parentNode.insertBefore(next, current)
        }
      }
      // insert coming child directly
      else if (next.nodeName !== current.nodeName) {
        parentNode.insertBefore(next, current)
      }
      // diff and patch element
      else if (next.nodeName !== '#text') {
        diffAndPatch($current, $next)
      }
      // diff and patch text
      else {
        if (next.textContent !== current.textContent) {
          current.textContent = next.textContent
        }
      }
    })

    // remove no use elements
    for (let i = nextChildren.length, len = current.childNodes.length; i < len; i ++) {
      const child = current.childNodes[i]
      if (child) {
        current.removeChild(child)
      }
    }
  }

  function change() {
    const $root = getMountNode()
    $root.trigger('$change')
  }

  function mount(el) {
    if (isMounted) {
      if (el) {
        if (el === mountTo) {
          return view
        }

        // when change a new root to mount, unmount the original one
        view.unmount()
      }
      else {
        return view
      }
    }

    if ($template.next(root).length) {
      return view
    }

    init(initState)

    let $root = null

    mountTo = el || null // cache mount node

    if (el) {
      $root = $(el)
      $root.attr('jq-vm', hash)
    }
    // like $('<template>aaa</template>').vm(...)
    else if (!$(document).find($template).length) {
      throw new Error('el should must be passed by view.mount')
    }
    else {
      $root = $('<div />', {
        'jq-vm': hash,
      })
      $template.after($root)
    }

    render()
    $template.trigger('$mount')
    $root.trigger('$mount')

    isMounted = true

    return view
  }

  function unmount() {
    if (!isMounted) {
      return view
    }

    const $root = getMountNode()

    if (!$root.length) {
      return
    }

    $root.trigger('$unmount')
    $template.trigger('$unmount')

    if (mountTo) {
      $root.html('')
      $root.removeAttr('jq-vm')
    }
    else {
      $root.remove()
    }

    mountTo = null
    isMounted = false

    return view
  }

  function destroy() {
    unmount()

    state = null
    scope = null
    actions.length = 0
  }

  function update(nextState, isOutside) {
    if (isOutside === SYMBOL) {
      if (isMounted) {
        assignOutsideState(state, outside)
        outside = nextState
      }
      else {
        outside = nextState
      }
      return
    }

    if (!isMounted) {
      return view
    }

    // force update
    if (nextState === true) {
      render(true)
      return view
    }

    // when nextState passed, assign to state will trigger rerender
    if (nextState) {
      if (isFunction(nextState)) {
        nextState = nextState(state)
      }

      if (isObject(nextState)) {
        Object.assign(state, nextState)
      }
    }
    // if not passed nextState, it means to check manually
    else {
      nextTick()
    }

    return view
  }

  function bind(args, once) {
    const info = [...args]
    const fn = info.pop()

    const action = function(e) {
      const handle = fn.call(view, state)
      const res = isFunction(handle) ? handle.call(this, e) : null
      return res
    }

    const type = once ? 'one' : 'on'

    actions.push({ type, info, fn, action })

    if (isMounted) {
      const $root = getMountNode()
      $root[type](...info, action)
    }
  }

  function unbind(args) {
    if (args.length < 3) {
      const $root = getMountNode()
      actions.forEach((item, i) => {
        const { info, action } = item
        if (args.length === 2 && isEqual(info, args)) {
          $root.off(...info, action)
          actions.splice(i, 1)
        }
        else if (args.length === 1 && info[0] === args[0]) {
          $root.off(...info, action)
          actions.splice(i, 1)
        }
      })
      return
    }

    const info = [...args]
    const fn = info.pop()
    const $root = getMountNode()

    actions.forEach((item, i) => {
      const { info, action } = item
      if (fn === item.fn) {
        $root.off(...info, action)
        actions.splice(i, 1)
      }
    })
  }

  function find(selector) {
    const $root = getMountNode()
    return $root.find(selector)
  }

  function emit(event, ...args) {
    if (!outside) {
      return
    }
    const fn = outside[event]
    if (!isFunction(fn)) {
      return
    }
    fn(...args)
  }

  const fns = {}
  function fn(name, action) {
    if (!action) {
      return fns[name]
    }
    else {
      fns[name] = action
    }
    return view
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
      unbind(args)
      return view
    },
    emit,
    mount,
    unmount,
    destroy,
    update,
    find,
    component,
    directive,
    filter,
    fn,
  })

  listen()

  return view
}

// register inside directives

directive('jq-repeat', function($el, attrs) {
  const attr = attrs['jq-repeat']

  if (!/^[a-z][a-zA-Z0-9_$]*(,[a-z][a-zA-Z0-9_$]*){0,1} in [a-z][a-zA-Z0-9_$]+ traceby [a-z][a-zA-Z0-9_$.]*/.test(attr)) {
    throw new Error('jq-repeat should match formatter `value,key in data traceby id`!')
  }

  const [kv, , dataKey, , traceBy] = attr.split(' ')
  const [valueName, keyName] = kv.split(',')

  const { scope: parentScope, compile } = this
  const data = parentScope.parse(dataKey)

  // make it not be able to compile again
  $el.removeAttr('jq-repeat')
  $el.attr('x-jq-repeat', attr)

  const template = $el[0].outerHTML
  const $els = []

  each(data, (value, key) => {
    const newScope = {
      [valueName]: value,
    }
    if (keyName) {
      newScope[keyName] = key
    }
    const scope = parentScope.$new(newScope)

    const result = compile({ template, scope })
    const html = scope.interpolate(result)
    const $item = $(html)

    $item.removeAttr('x-jq-repeat')
    $item.attr('jq-repeat', attr)
    if (traceBy) {
      const traceId = scope.parse(traceBy)
      $item.attr('jq-id', traceId)
    }

    $els.push($item)
  })

  const $commentBegin = $(`<!-- ${$el[0].nodeName.toLowerCase()} jq-repeat="${attr}" begin -->`)
  const $commentEnd = $(`<!-- ${$el[0].nodeName.toLowerCase()} jq-repeat="${attr}" end -->`)

  $el.replaceWith([$commentBegin, ...$els, $commentEnd])
})

directive('jq-if', function($el, attrs) {
  const attr = attrs['jq-if']
  const value = this.scope.parse(attr)
  return value ? $el : `<!-- ${$el[0].nodeName.toLowerCase()} jq-if="${attr}" (hidden) -->`
})

directive('jq-id', function($el, attrs) {
  const attr = attrs['jq-id']
  const value = this.scope.interpolate(attr)
  $el.attr('jq-id', value)
})

directive('jq-class', function($el, attrs) {
  const attr = attrs['jq-class']
  const obj = this.scope.parse(attr)
  each(obj, (value ,key) => {
    if (value) {
      $el.addClass(key)
    }
  })
})

directive('jq-value', null, function($el, attrs) {
  const attr = attrs['jq-value']
  const value = this.scope.parse(attr)
  $el.val(value)
})

directive('jq-disabled', null, function($el, attrs) {
  const attr = attrs['jq-disabled']
  const value = this.scope.parse(attr)
  $el.prop('disabled', !!value)
})

directive('jq-checked', null, function($el, attrs) {
  const attr = attrs['jq-checked']
  const value = this.scope.parse(attr)
  $el.prop('checked', !!value)
})

directive('jq-selected', null, function($el, attrs) {
  const attr = attrs['jq-selected']
  const value = this.scope.parse(attr)
  $el.prop('selected', !!value)
})

directive(
  'jq-bind',
  null,
  function($el, attrs) {
    const attr = attrs['jq-bind']
    const value = this.scope.parse(attr)

    const event = $el.is('[type=checkbox],[type=radio],[type=color],[type=date],[type=datetime-local],[type=week],[type=file],select') ? 'change' : 'input'
    const checkbox = $el.is('[type=checkbox]')
    const radio = $el.is('[type=radio]')

    if (checkbox) {
      $el.prop('checked', !!value)
    }
    else if (radio) {
      $el.prop('checked', value === $el.val())
    }
    else {
      $el.val(value)
    }

    const callback = (e) => {
      const value = checkbox ? $el.prop('checked') : e.target.value
      this.scope.assign(attr, value)
    }

    $el.on(event, callback)
    return () => $el.off(event, callback)
  },
)

directive('jq-src', null, function($el, attrs) {
  const attr = attrs['jq-src']
  const value = this.scope.interpolate(attr)
  $el.attr('src', value)
})

directive('jq-on', null, function($el, attrs) {
  const attr = attrs['jq-on']
  const [event, name, args] = attr.split(':')

  const { view, $root, scope } = this
  const fn = view.fn(name)
  if (!fn) {
    return
  }

  let f = fn
  if (args) {
    const params = args.split(',').map(arg => scope.parse(arg))
    f = function(state) {
      return fn.call(this, state, ...params)
    }
  }

  const path = getPath($el, $root)
  view.on(event, path, f)
  return () => view.off(event, path, f)
})

// --------------------------------

function useJQuery(jQuery) {
  $ = jQuery
  $.fn.vm = vm
  $.vm = {
    component,
    directive,
    filter,
    View,
  }
  return $
}

// use in browser
if (typeof jQuery !== 'undefined') {
  useJQuery(jQuery)
}

export { component, directive, filter, View, useJQuery }

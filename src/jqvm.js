import ScopeX from 'scopex'
import {
  isNone, each, isObject, isFunction, isString,
  diffArray, uniqueArray, getObjectHash, createReactive,
  isEqual, throttle, filter as filterProps, isShallowEqual,
} from 'ts-fns'
import { getPath, camelCase, parseKey, getNodeName, getNodeAttrs, createAttrsText } from './utils.js'

let vmId = 0
let $ = null
export function View() {}
const SYMBOL = {}
const SLOT = {}

// ---------------

const globalComponents = []
const globalDirectives = []
const globalFilters = {}

function _push(list, name, compile, affect) {
  for (let i = 0, len = list.length; i < len; i ++) {
    const item = list[i]
    if (item[0] === name) {
      list[i] = [name, compile, affect]
      return
    }
  }
  list.push([name, compile, affect])
}

export function component(name, compile, affect) {
  _push(globalComponents, name, compile, affect)
}

export function directive(name, compile, affect) {
  _push(globalDirectives, name, compile, affect)
}

export function filter(name, fn) {
  globalFilters[name] = fn
}

// ----------- compiler ---------------

// clear and revoke effects
function prepare($root) {
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

function compile($root, components, directives, state, view, [template, scope]) {
  const root = $root[0]
  const records = root.__jQvmCompiledRecords = root.__jQvmCompiledRecords || []
  const instances = root.__jQvmComponentInstances = root.__jQvmComponentInstances || []

  const $element = $(`<div />`).html(template)

  const interpolate = ($element, scope) => {
    $element.each(function() {
      const attrs = [...this.attributes]
      const $this = $(this)
      attrs.forEach(({ name, value }) => {
        // HTML standard not allow @attr
        if (name.indexOf('@') === 0) {
          return
        }
        const text = scope.interpolate(value)
        $this.attr(name, text)
      })

      const children = [...this.childNodes]
      children.forEach((child) => {
        if (child.nodeName === '#text') {
          child.textContent = scope.interpolate(child.textContent)
        }
        else if (child.nodeName.indexOf('#') !== 0) {
          interpolate($(child), scope)
        }
      })
    })
  }

  const createIterator = (onCompile, affect, isComp) => function(index) {
    const el = this
    const $el = $(el)
    const attrs = getNodeAttrs(this)
    const name = getNodeName(this)

    let els = [el]

    const attachComponent = (component) => {
      // replace component tag
      if (component.tag !== 'template') {
        const { tag, attributes } = component
        const $tag = $(`<${tag} />`)

        const attrsText = createAttrsText(attrs)
        const $commentBegin = $(`<!-- ${name} ${attrsText} begin -->`)
        const $commentEnd = $(`<!-- ${name} ${attrsText} end -->`)

        Object.assign(attrs, attributes, {
          ['data-hoist']: name,
        })
        $tag.attr(attrs)
        $el.replaceWith([$commentBegin, $tag, $commentEnd])
        els = [$tag[0]]
      }

      const record = { affect, attrs, component, state, els }

      const html = $el.html()
      if (html.trim()) {
        const $slot = $('<div />').html(html)
        interpolate($slot, scope)
        const slot = $slot.html()
        record.slot = slot
      }

      els.forEach(el => el.__jQvmCompiledRecord = record)
      records.push(record)
    }

    const generateComponent = (view) => {
      let component = null

      const instance = instances.find(item => item.name === name && item.index === index)
      if (instance) {
        component = instance.component
      }
      else {
        component = view.clone()
        const item = { name, index, component }
        instances.push(item)
      }

      return component
    }

    if (isComp) {
      const instance = instances.find(item => item.name === name && item.index === index)
      if (instance && instance.component) {
        attachComponent(instance.component)
        return
      }
    }

    // register a view as component
    if (isComp && onCompile instanceof View) {
      const component = generateComponent(onCompile)
      attachComponent(component)
      return
    }

    if (typeof onCompile === 'function') {
      // developers can recompile inside fn
      const ctx = {
        scope,
        view,
        compile: compile.bind(null, $root, components, directives, state, view),
        interpolate,
      }
      const output = onCompile.call(ctx, $el, attrs)

      if (isComp && output && output instanceof View) {
        const component = generateComponent(output)
        attachComponent(component)
        return
      }

      if (!isNone(output) && $el !== output) {
        const $newEls = $(output)
        $el.replaceWith($newEls)
        els = [...$newEls]
      }
    }

    const record = { affect, attrs, els }
    records.push(record)
    els.forEach(el => el.__jQvmCompiledRecord = record)
  }

  components.forEach(([name, compile, affect]) => {
    const $els = $element.find(name)
    $els.each(createIterator(compile, affect, true))
  })

  directives.forEach(([name, compile, affect]) => {
    const $els = $element.find(`[${name}]`)
    $els.each(createIterator(compile, affect))
  })

  interpolate($element, scope)

  const nodes = [...$element[0].childNodes]
  return nodes
}

function diffAndPatch($root, nodes) {
  // we will not use next to replace current node, so we should transform record info to old node
  const transferRecord = (current, next) => {
    const record = next.__jQvmCompiledRecord
    if (!record) {
      return
    }

    const { els } = record
    els.forEach((el, i) => {
      if (el === next) {
        els[i] = current
      }
    })
    current.__jQvmCompiledRecord = record
  }

  const diffAndPatchNode = ($current, $next) => {
    const current = $current[0]
    const next = $next[0]

    const currentAttrs = getNodeAttrs(current)
    const nextAttrs = getNodeAttrs(next)

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
    const diffAttrNames = diffArray(currentAttrNames, nextAttrNames)
    diffAttrNames.forEach((name) => {
      // keep style and class attributes
      if (name === 'style' || name === 'class' || name === 'jq-vm') {
        return
      }
      $current.removeAttr(name)
    })

    transferRecord(current, next)

    // dont diff component inner content
    if (current.__jQvmComponent && current.nodeName === next.nodeName) {
      return
    }

    if (!next.childNodes) {
      return
    }

    const nextChildren = [...next.childNodes]
    diffAndPatchChildren($current, nextChildren)
  }

  const diffAndPatchChildren = ($parent, nextChildren) => {
    const parentNode = $parent[0]

    // append all children at once if current is empty inside
    if (!parentNode.childNodes.length) {
      nextChildren.forEach((child) => {
        parentNode.appendChild(child)
      })
      return
    }

    nextChildren.forEach((next, i) => {
      const $next = $(next)
      const current = parentNode.childNodes[i]
      const $current = $(current)
      const nextId = $next.attr('id')
      const nextDataId = $next.attr('data-id')

      const move = ($prev) => {
        if ($prev.length) {
          const prev = $prev[0]
          // move it
          if (prev !== current) {
            parentNode.insertBefore(prev, current)
            transferRecord(current, next)
          }
          // update the node
          diffAndPatchNode($prev, $next)
        }
        else {
          parentNode.insertBefore(next, current)
        }
      }

      // current index node not existing, insert the coming node directly
      if (!current) {
        parentNode.appendChild(next)
      }
      // use `jq-id` to unique element
      else if (nextId) {
        const $prev = $parent.find(`[id=${nextId}]`)
        move($prev)
      }
      else if (nextDataId) {
        const $prev = $parent.find(`[data-id=${nextDataId}]`)
        move($prev)
      }
      // insert coming child directly
      else if (next.nodeName !== current.nodeName) {
        parentNode.insertBefore(next, current)
      }
      // diff and patch element
      else if (next.nodeName.indexOf('#') !== 0) {
        diffAndPatchNode($current, $next)
        transferRecord(current, next)
      }
      // diff and patch text
      else {
        if (next.textContent !== current.textContent) {
          current.textContent = next.textContent
        }
      }
    })

    // remove no use elements
    for (let i = parentNode.childNodes.length - 1, start = nextChildren.length; i >= start; i --) {
      const child = parentNode.childNodes[i]
      if (child.__jQvmComponent) {
        child.__jQvmComponent.unmount()
        delete child.__jQvmComponent
      }
      const all = $(child).find('*')
      all.each(function() {
        if (this.__jQvmComponent) {
          this.__jQvmComponent.unmount()
          delete this.__jQvmComponent
        }
      })
      parentNode.removeChild(child)
    }
  }

  diffAndPatchChildren($root, nodes)
}

function affect($root, scope, view) {
  const root = $root[0]
  const records = root.__jQvmCompiledRecords = root.__jQvmCompiledRecords || []

  records.forEach((record) => {
    const { affect, attrs, component, state, els } = record

    if (component) {
      els.forEach((el) => {
        if (!$(document).find(el).length) {
          return
        }

        const $el = $(el)
        const outside = {}
        each(attrs, (exp, attr) => {
          if (attr.indexOf(':') === 0) {
            const value = scope.parse(exp)
            const key = camelCase(attr.substring(1))
            outside[key] = value
          }
          else if (attr.indexOf('@') === 0) {
            const event = camelCase(attr.substring(1))
            const [name, params] = parseKey(exp)
            const fn = view.fn(name)
            outside[event] = (...args) => {
              let res = null
              if (params) {
                const args = params.map(arg => scope.parse(arg))
                res = fn.call(view, state, ...args)
              }
              else {
                res = fn.call(view, state)
              }
              if (isFunction(res)) {
                res.apply(null, args)
              }
            }
          }
          else {
            const key = camelCase(attr)
            outside[key] = exp
          }
        })
        component.update(outside, SYMBOL)

        if (record.slot) {
          const { slot } = record
          component.component('slot', () => slot)
          component.update(true)
        }

        if (!el.__jQvmComponent) {
          el.__jQvmComponent = component
          component.mount($el)
        }

        // let attrs has the result so that we can use them in effects
        attrs.$attrs = outside
      })

      // remove no use info
      els.forEach((el) => {
        delete el.__jQvmCompiledRecord
      })
    }

    if (typeof affect !== 'function') {
      return
    }

    els.forEach((el) => {
      const $el = $(el)
      const revoke = affect.call({ $root, scope, view, component }, $el, attrs)
      if (typeof revoke === 'function') {
        record.revoke = revoke
      }
    })
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
  let isUnmounted = false
  const getMountNode = () => {
    return mountTo ? $(mountTo) : $template.next(root)
  }

  const actions = []
  const view = new View()

  // -----------

  const components = [...globalComponents]
  const directives = [...globalDirectives]
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
  const nextTick = throttle((e) => {
    if (!state || !latestHash) {
      return
    }

    const currentHash = getObjectHash(state)
    if (latestHash !== currentHash) {
      const needToUpdate = e ? change(e) : true
      if (needToUpdate) {
        render(true)
      }
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
    const next = isFunction(initState) ? initState.call(view) : initState

    if (!next || typeof next !== 'object') {
      throw new Error('initState should must be an object')
    }

    if (outside) {
      assignOutsideState(next, outside, true)
    }

    state = createReactive(next, {
      dispatch: nextTick,
    })
    scope = new ScopeX(state, { filters })
    currTick()
  }

  function listen() {
    $template.on('$mount', function(e) {
      const $root = getMountNode()
      actions.forEach((item) => {
        const { type, info, action } = item
        $root[type](...info, action)
      })
    })

    $template.on('$unmount', (e) => {
      const $root = getMountNode()
      actions.forEach((item) => {
        const { info, action } = item
        $root.off(...info, action)
      })
    })
  }

  function render(isUpdating) {
    if (isUpdating && !isMounted) {
      return
    }

    if (!shouldUpdate()) {
      return
    }

    const $root = getMountNode()

    prepare($root)

    const nodes = compile($root, components, directives, state, view, [$template.html(), scope])

    if (isUpdating) {
      diffAndPatch($root, nodes)
    }
    else {
      $root.html(nodes)
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

  function change(e) {
    const $root = getMountNode()
    let flag = true
    const prevent = () => flag = false
    $root.trigger('$change', [e, prevent])
    return flag
  }

  function shouldUpdate() {
    const $root = getMountNode()
    let flag = true
    const prevent = () => flag = false
    $root.trigger('$update', [state, prevent])
    return flag
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

    if (!isUnmounted) {
      init(initState)
    }

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
      $root = $('<div />', { 'jq-vm': hash, })
      $template.after($root)
    }

    render()
    $template.trigger('$mount')
    $root.trigger('$mount')

    isMounted = true
    isUnmounted = false

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

    if (mountTo) {
      $root.html('')
      $root.removeAttr('jq-vm')
    }
    else {
      $root.remove()
    }

    mountTo = null
    isMounted = false
    isUnmounted = true

    return view
  }

  function destroy() {
    const $root = getMountNode()

    unmount()

    state = null
    scope = null
    actions.length = 0

    $root.trigger('$destroy')

    const root = $root[0]
    delete root.__jQvmComponentInstances
    delete root.__jQvmCompiledRecords
  }

  function update(nextState, type) {
    if (type === SYMBOL) {
      if (state) {
        assignOutsideState(state, nextState)
      }
      outside = nextState
      return view
    }

    // force update
    if (nextState === true) {
      if (isMounted) {
        render(true)
      }
      return view
    }

    // when nextState passed, assign to state will trigger rerender
    if (state && nextState) {
      if (isFunction(nextState)) {
        const res = nextState(state)
        if (isObject(res)) {
          Object.assign(state, res)
        }
        else if (isMounted) {
          nextTick()
        }
        return view
      }
      else if (isObject(nextState)) {
        Object.assign(state, nextState)
        return view
      }
    }

    // if not passed nextState, it means to check manually
    if (isMounted && nextState) {
      nextTick()
    }

    return view
  }

  function bind(args, once) {
    const info = [...args]
    const fn = info.pop()

    const action = function(e, ...params) {
      const handle = fn.call(view, state)
      const res = isFunction(handle) ? handle.call(this, e, ...params) : null
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

  const clone = () => {
    const view = vm.call(this, initState)
    each(fns, (action, name) => {
      view.fn(name, action)
    })
    each(actions, (item) => {
      const { type, info, fn } = item
      const m = type === 'one' ? 'once' : 'on'
      view[m](...info, fn)
    })
    each(components, (item) => {
      if (globalComponents.includes(item)) {
        return
      }
      view.component(...item)
    })
    each(directives, (item) => {
      if (globalDirectives.includes(item)) {
        return
      }
      view.directive(...item)
    })
    each(filters, (fn, name) => {
      view.filter(name, fn)
    })
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
    clone,
  })

  const tempEl = $template[0]
  const tag = getNodeName(tempEl)
  const attributes = getNodeAttrs(tempEl)
  Object.defineProperties(view, {
    tag: { value: tag },
    attributes: { value: attributes },
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

  const el = $el[0]
  const nodeName = getNodeName(el)

  const [kv, , dataKey, , traceBy] = attr.split(' ')
  const [valueName, keyName] = kv.split(',')

  const { scope: parentScope, compile } = this
  const data = parentScope.parse(dataKey)

  // make it not be able to compile again
  $el.removeAttr('jq-repeat')
  if (traceBy) {
    $el.attr('data-id', `{{${traceBy}}}`)
  }

  const $els = []

  const temp = el.outerHTML
  each(data, (value, key) => {
    const newScope = {
      [valueName]: value,
    }
    if (keyName) {
      newScope[keyName] = key
    }
    const scope = parentScope.$new(newScope)

    const nodes = compile([temp, scope])
    $els.push(...nodes)
  })

  const $commentBegin = $(`<!-- ${nodeName} jq-repeat="${attr}" begin -->`)
  const $commentEnd = $(`<!-- ${nodeName} jq-repeat="${attr}" end -->`)

  $el.replaceWith([$commentBegin, ...$els, $commentEnd])
})

directive('jq-if', function($el, attrs) {
  const attr = attrs['jq-if']
  const value = this.scope.parse(attr)
  return value ? $el : `<!-- ${getNodeName($el[0])} jq-if="${attr}" (hidden) -->`
})

directive('jq-id', function($el, attrs) {
  const attr = attrs['jq-id']
  const value = this.scope.parse(attr)
  $el.attr('id', value)
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
  const value = this.scope.parse(attr)
  $el.attr('src', value)
})

directive('jq-on', null, function($el, attrs) {
  const attr = attrs['jq-on']
  const [event, method] = attr.split(':')
  const [name, params] = parseKey(method)

  const { view, $root, scope } = this
  const fn = view.fn(name)
  if (!fn) {
    return
  }

  let f = fn
  if (params) {
    const args = params.map(arg => scope.parse(arg))
    f = function(state) {
      return fn.call(this, state, ...args)
    }
  }

  const path = getPath($el, $root)
  view.on(event, path, f)
  return () => view.off(event, path, f)
})

component(
  'jq-static',
  () => $('<template><slot></slot></template>')
    .vm({})
    .on('$update', () => (_, e, prevent) => prevent())
)

// --------------------------------

export function useJQuery(jQuery) {
  $ = jQuery
  $.fn.vm = vm
  return $
}

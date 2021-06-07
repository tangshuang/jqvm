import { createAttrsText, getNodeName } from './utils.js'
import { component } from './jqvm.js'

function rewriteHistory(type) {
  const origin = window.history[type]
  return function() {
    const rv = origin.apply(this, arguments)
    const e = new Event(type)
    e.arguments = arguments
    window.dispatchEvent(e)
    return rv
  }
}
window.history.pushState = rewriteHistory('pushState')
window.history.replaceState = rewriteHistory('replaceState')

function parseQuery(search) {
  if (!search) {
    return {}
  }

  const items = search.split('&').map((item) => item.split('='))
  const query = {}
  items.forEach(([key, value]) => {
    query[key] = value
  })
  return query
}

function buildSearch(query) {
  const keys = Object.keys(query)
  const items = keys.map((key) => `${key}=${query[key]}`)
  const search = items.join('&')
  return search
}

function parseUri(uri) {
  const [path, hash] = uri.split('#')
  const searchAt = path.indexOf('?')

  let pathname = path
  let search = ''
  if (searchAt > -1) {
    pathname = path.substring(1, searchAt)
    search = path.substring(searchAt + 1)
  }

  return {
    pathname,
    search,
    hash,
  }
}

function parseLocation() {
  const { hash: _hash, host, hostname, href, origin, pathname, port, protocol, search: _search } = window.location
  const hash = _hash ? _hash.substring(1) : ''
  const search = _search ? _search.substring(1) : ''
  return {
    host,
    hostname,
    href,
    origin,
    pathname,
    port,
    protocol,
    search,
    hash,
  }
}

function isMatchPath(wantPath, targetPath, exact) {
  const wantItems = wantPath.split('/')
  const targetItems = targetPath.split('/')

  if (targetItems.length < wantItems.length) {
    return false
  }

  if (exact && targetItems.length !== wantItems) {
    return false
  }

  for (let i = 0, len = wantItems.length; i < len; i ++) {
    const wantItem = wantItems[i]
    const targetItem = targetItems[i]
    if (wantItem.indexOf(':') !== 0 && targetItem !== wantItem) {
      return false
    }
  }

  return true
}

function isMatchSearch(wantSearch, targetSearch, exact) {
  const wantQuery = parseQuery(wantSearch)
  const targetQuery = parseQuery(targetSearch)

  const wantKeys = Object.keys(wantQuery)
  const targetkeys = Object.keys(targetQuery)

  if (targetkeys.length < wantKeys.length) {
    return false
  }

  if (wantKeys.some(key => !targetkeys.includes(key))) {
    return false
  }

  if (exact && wantKeys.length !== targetkeys.length) {
    return false
  }

  return true
}

function jumpTo(target, { type, key, replace }) {
  if (type === '/') {
    if (replace) {
      history.replaceState(null, null, target)
    }
    else {
      history.pushState(null, null, target)
    }
  }
  else if (type === '#') {
    const hash = '#' + target
    window.location.hash = hash
  }
  else if (type === '?') {
    const { search } = parseLocation()
    const query = parseQuery(search)
    query[key] = encodeURIComponent(target)
    const next = '?' + buildSearch(query)
    window.location.search = next
  }
}

function parseValue(str) {
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    return +str
  }
  else if (str === 'true') {
    return true
  }
  else if (str === 'false') {
    return false
  }
  else {
    return str
  }
}

function genParams(wantPath, wantSearch, targetPath, targetSearch) {
  const wantItems = wantPath.split('/')
  const targetItems = targetPath.split('/')

  const wantQuery = parseQuery(wantSearch)
  const targetQuery = parseQuery(targetSearch)

  const params = {}

  wantItems.forEach((item, i) => {
    if (item.indexOf(':') === 0) {
      const key = item.substring(1)
      params[key] = parseValue(targetItems[i])
    }
  })

  const wantKeys = Object.keys(wantQuery)
  wantKeys.forEach((key) => {
    const wantProp = wantQuery[key]
    if (wantProp && wantProp.indexOf(':') === 0) {
      const prop = wantProp.substring(1)
      params[prop] = parseValue(targetQuery[key])
    }
    else {
      params[key] = parseValue(targetQuery[key])
    }
  })

  return params
}

export function createNavigator({ route, link }) {
  const compile = function($el, attrs) {
    const { mode } = attrs
    $el.find([route, link].join(',')).each(function() {
      $(this).attr('mode', mode)
    })
  }
  // const affect = function($el, attrs) {
  //   const { mode } = attrs
  //   const listen = function() {
  //     options && options.listen && options.listen()
  //   }
  //   if (mode.indexOf('/') === 0) {
  //     window.addEventListener('popstate', listen)
  //     window.addEventListener('replaceState', listen)
  //     window.addEventListener('pushState', listen)
  //     return () => {
  //       window.removeEventListener('popstate', listen)
  //       window.removeEventListener('replaceState', listen)
  //       window.removeEventListener('pushState', listen)
  //     }
  //   }
  //   else if (mode.indexOf('#') === 0) {
  //     window.addEventListener('hashchange', listen)
  //     return () => {
  //       window.removeEventListener('hashchange', listen)
  //     }
  //   }
  //   else if (mode.indexOf('?') === 0) {
  //     const [_, key] = mode.split(/\?|=/)
  //     const { search } = parseLocation()
  //     const query = parseQuery(search)
  //     let latest = query[key] || ''
  //     const watch = () => {
  //       const { search } = parseLocation()
  //       const query = parseQuery(search)
  //       const current = query[key] || ''
  //       if (current !== latest) {
  //         listen()
  //       }
  //       latest = current
  //     }
  //     window.addEventListener('popstate', watch)
  //     window.addEventListener('replaceState', watch)
  //     window.addEventListener('pushState', watch)
  //     return () => {
  //       window.removeEventListener('popstate', watch)
  //       window.removeEventListener('replaceState', watch)
  //       window.removeEventListener('pushState', watch)
  //     }
  //   }
  // }
  return [compile]
}

export function createRoute() {
  const compile = function($el, attrs, slot) {
    const { scope } = this
    const polate = (wantPath, wantSearch, pathname, search) => {
      const params = genParams(wantPath, wantSearch, pathname, search)
      const subscope = scope.$new(params)
      return slot.compile(subscope)
    }

    const { match, exact, redirect, mode = '/' } = attrs
    if (mode.indexOf('/') === 0) {
      const { pathname, search } = parseLocation()
      const base = mode === '/' ? '' : mode
      const { pathname: wantPath, search: wantSearch } = parseUri(base + match)
      if (isMatchPath(wantPath, pathname, exact) && isMatchSearch(wantSearch, search, exact)) {
        if (redirect) {
          jumpTo(mode + redirect, { type: '/', replace: true })
          return `<!-- ${getNodeName($el[0])} ${createAttrsText(attrs)} (redirect) -->`
        }

        return polate(wantPath, wantSearch, pathname, search)
      }
      return `<!-- ${getNodeName($el[0])} ${createAttrsText(attrs)} (hidden) -->`
    }
    else if (mode.indexOf('#') === 0) {
      const { hash } = parseLocation()
      const { pathname, search } = parseUri(hash)
      const base = mode.replace('#', '')
      const { pathname: wantPath, search: wantSearch } = parseUri(base + match)
      if (isMatchPath(wantPath, pathname, exact) && isMatchSearch(wantSearch, search, exact)) {
        if (redirect) {
          jumpTo(base + redirect, { type: '#', replace: true })
          return `<!-- ${getNodeName($el[0])} ${createAttrsText(attrs)} (redirect) -->`
        }

        return polate(wantPath, wantSearch, pathname, search)
      }
      return `<!-- ${getNodeName($el[0])} ${createAttrsText(attrs)} (hidden) -->`
    }
    else if (mode.indexOf('?') === 0) {
      const [_, key, base = ''] = mode.split(/\?|=/)
      const { search: searchQuery } = parseLocation()
      const query = parseQuery(searchQuery)
      const uri = decodeURIComponent(query[key] || '')
      const { pathname, search } = parseUri(uri)
      const { pathname: wantPath, search: wantSearch } = parseUri(base + match)
      if (isMatchPath(wantPath, pathname, exact) && isMatchSearch(wantSearch, search, exact)) {
        if (redirect) {
          jumpTo(base + redirect, { type: '?', replace: true, key })
          return `<!-- ${getNodeName($el[0])} ${createAttrsText(attrs)} (redirect) -->`
        }

        return polate(wantPath, wantSearch, pathname, search)
      }
      return `<!-- ${getNodeName($el[0])} ${createAttrsText(attrs)} (hidden) -->`
    }
  }
  const affect = function($el, attrs) {
    const { redirect, mode = '/' } = attrs
    if (redirect) {
      return
    }
    if (mode.indexOf('/') === 0) {
      const update = () => this.view.update(true)
      window.addEventListener('popstate', update)
      window.addEventListener('replaceState', update)
      window.addEventListener('pushState', update)
      return () => {
        window.removeEventListener('popstate', update)
        window.removeEventListener('replaceState', update)
        window.removeEventListener('pushState', update)
      }
    }
    else if (mode.indexOf('#') === 0) {
      const update = () => {
        this.view.update(true)
      }
      window.addEventListener('hashchange', update)
      return () => {
        window.removeEventListener('hashchange', update)
      }
    }
    else if (mode.indexOf('?') === 0) {
      const [_, key] = mode.split(/\?|=/)
      const { search } = parseLocation()
      const query = parseQuery(search)
      let latest = query[key] || ''
      const update = () => {
        const { search } = parseLocation()
        const query = parseQuery(search)
        const current = query[key] || ''
        if (current !== latest) {
          this.view.update(true)
        }
        latest = current
      }
      window.addEventListener('popstate', update)
      window.addEventListener('replaceState', update)
      window.addEventListener('pushState', update)
      return () => {
        window.removeEventListener('popstate', update)
        window.removeEventListener('replaceState', update)
        window.removeEventListener('pushState', update)
      }
    }
  }
  return [compile, affect]
}

export function createLink() {
  const compile = function($el, attrs, slot) {
    const { scope } = this
    const { to, mode = '/', replace, open, ...attributes } = attrs
    const createLink = (target) => {
      const attrsText = createAttrsText(attributes)

      let link = `<a href="${target}" data-to="${to}"`
      if (attrsText) {
        link += ' ' + attrsText
      }

      if (open) {
        link += ' target="_blank"'
      }

      const inner = $('<div />').html(slot.compile(scope)).html()
      link += '>' + inner + '</a>'

      return link
    }
    if (mode.indexOf('/') === 0) {
      const base = mode === '/' ? '' : mode
      const target = base + to
      return createLink(target)
    }
    else if (mode.indexOf('#') === 0) {
      const base = mode.substring(1)
      const target = '#' + base + to
      return createLink(target)
    }
    else if (mode.indexOf('?') === 0) {
      const [_, key, base = ''] = mode.split(/\?|=/)
      const { search: searchQuery } = parseLocation()
      const query = parseQuery(searchQuery)
      query[key] = encodeURIComponent(base + to)
      const target = '?' + buildSearch(query)
      return createLink(target)
    }
  }
  const affect = function($el, attrs) {
    const { replace, open, mode } = attrs
    if (open) {
      return
    }

    const goto = (e) => {
      e.preventDefault()
      const to = $el.attr('data-to')
      if (mode.indexOf('/') === 0) {
        jumpTo(to, { type: '/', replace })
      }
      else if (mode.indexOf('#') === 0) {
        jumpTo(to, { type: '#', replace })
      }
      else if (mode.indexOf('?') === 0) {
        const [_, key] = mode.split(/\?|=/)
        jumpTo(to, { type: '?', key, replace })
      }
    }
    $el.on('click', goto)
    return () => $el.off('click', goto)
  }
  return [compile, affect]
}

component('jq-navigator', ...createNavigator({ route: 'jq-route', link: 'jq-link' }))
component('jq-route', ...createRoute())
component('jq-link', ...createLink())

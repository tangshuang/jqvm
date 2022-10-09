import { directive } from './jqvm.js'
import { getNodeName } from './utils.js'

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

class Base {
  constructor(options) {
    this.events = []
    const off = this.init(options)
    if (off) {
      this.on('$destroy', off)
    }
  }

  init() {}

  on(e, fn) {
    this.events.push({ e, fn })
    return this
  }

  off(e, fn) {
    this.events.forEach((item, i) => {
      if (item.e === e && item.fn === fn) {
        this.events.splice(i, 1);
      }
    })
    return this
  }

  emit(e, ...args) {
    this.events.forEach((item) => {
      if (item.e === e) {
        item.fn(...args)
      }
    })
  }

  destroy() {
    this.emit('$destroy')
  }
}

class Navigation extends Base {
  init() {
    this.actionType = ''
    this.latestState = window.history.state

    const onUrlChanged = (e) => {
      this.actionType = e.type
      const currentState = this.latestState
      this.latestState = window.history.state
      const nextState = this.latestState

      if (e.type === 'popstate') {
        if (currentState?.prev === nextState) {
          this.actionType = 'back'
        }
        else if (currentState?.next === nextState) {
          this.actionType = 'forward'
        }
      }

      this.emit(this.actionType, window.location.href)
      this.emit('change', window.location.href)
    }

    const onBeforeUnload = (e) => {
      if (this.events.some(item => item.e === 'protect')) {
        let prevented = false
        const resolve = () => void 0
        const reject = () => prevented = true

        this.emit('protect', resolve, reject)

        if (prevented) {
          e.preventDefault()
        }
      }
    }

    window.addEventListener('popstate', onUrlChanged)
    window.addEventListener('replaceState', onUrlChanged)
    window.addEventListener('pushState', onUrlChanged)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      window.removeEventListener('popstate', onUrlChanged)
      window.removeEventListener('replaceState', onUrlChanged)
      window.removeEventListener('pushState', onUrlChanged)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }

  back() {
    window.history.back()
  }

  forward() {
    window.history.forward()
  }

  push(url) {
    if (window.location.href === url) {
      return
    }
    const { state } = window.history
    const next = { prev: state, url }
    window.history.pushState(next, null, url)
  }

  replace(url) {
    if (window.location.href === url) {
      return
    }
    const { state } = window.history
    const prev = state?.prev?.state
    const next = { prev, url }
    window.history.replaceState(next, null, url)
  }

  open(url) {
    window.open(url)
  }
}

const navigation = new Navigation()

class Router extends Base {
  init(options) {
    this.options = options
    this.url = this.getUrl()

    const onChange = () => {
      const { baseUri = '' } = options
      const url = this.getUrl()
      const prev = this.url
      this.url = url

      // dont trigger change
      if (prev === url) {
        return
      }

      let flag = true
      if (baseUri && url.indexOf(baseUri) !== 0) {
        flag = false
      }
      if (flag) {
        this.emit('change', url)
      }
    }
    navigation.on('change', onChange)
    return () => navigation.off('change', onChange)
  }

  navigate(type, to) {
    navigation[type](to)
  }

  getUrl() {
    const { mode } = this.options
    const { hash, href, origin } = window.location
    if (mode === 'hash') {
      return hash.replace('#', '')
    }
    return href.replace(origin, '')
  }

  getLocation() {
    const url = this.getUrl()
    const [path, hash = ''] = url.split('#')
    const [pathname, search = ''] = path.split('?')
    return {
      path,
      pathname,
      search,
      hash,
    }
  }

  isMatch(uri) {
    const { pathname } = this.getLocation()
    if (uri instanceof RegExp) {
      return uri.test(pathname)
    }
    return pathname === uri
  }
}

export function createRouter(options) {
  const { mode, baseUri } = options
  const router = new Router({
    mode,
    baseUri,
  })

  return function(view) {
    view.directive('jq-route', function($el, attrs) {
      const attr = attrs['jq-route']
      const hidden = `<!-- ${getNodeName($el[0])} jq-route="${attr}" (hidden) -->`

      let toMatch = attr

      if (/^\/.+?\/[a-z]*$/.test(toMatch)) {
        const str = toMatch.substring(1)
        const items = str.split('/')
        const sym = items.pop()
        const exp = items.join('/')
        const reg = new RegExp(exp, sym)
        toMatch = reg
      }

      if (!(toMatch instanceof RegExp)) {
        toMatch = this.scope.parse(attr)
      }

      if (!router.isMatch(toMatch)) {
        return hidden
      }
    })

    view.directive(
      'jq-navigate',
      function($el, attrs) {
        const type = attrs['jq-navigate']
        if (['back', 'forward'].indexOf(type) > -1) {
          if (!$el.attr('href')) {
            $el.attr('href', '#')
          }
        }
        else if (type === 'open') {
          if ($el.attr('target') !== '_blank') {
            $el.attr('target', '_blank')
          }
        }
      },
      function($el, attrs) {
        const type = attrs['jq-navigate']
        const navigate = (e) => {
          if (['back', 'forward'].indexOf(type) > -1) {
            e.preventDefault()
            router.navigate(type)
          }
          else if (['push', 'replace'].indexOf(type) > -1) {
            e.preventDefault()
            const href = $el.attr('href')
            router.navigate(type, href)
          }
        }
        $el.on('click', navigate)
        return () => $el.off('click', navigate)
      },
    )

    const forceUpdate = () => {
      view.update(true)
    }

    return {
      $init: () => {
        router.on('change', forceUpdate)
      },
      $destroy: () => {
        router.off('change', forceUpdate)
        router.destroy()
      },
    }
  }
}
export function getOuterHTML(el) {
  const nodeName = el.nodeName.toLowerCase()
  const attrs = [...el.attributes].map((a) => {
    if (a.value === '') {
      return a.name
    }
    else if (a.value.indexOf('"') > -1) {
      return `${a.name}='${a.value}'`
    }
    else {
      return `${a.name}="${a.value}"`
    }
  }).join(' ')
  const str = `<${nodeName} ${attrs}></${nodeName}>`
  return str
}

export function parseAttrs(source) {
  const separator = /\s/
	const str = source.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ')
	const length = str.length
	const attrs = []

	let cursor = ''

	let current = null
	let type = 'key'

  const reset = () => {
		current = {
			key: '',
			value: ''
		}
		cursor = ''
  }

	reset()

	for (let i = 0; i < length; i ++) {
		let char = str.charAt(i)
		let needPush = true

		if (char === '"' || char === "'") {
			if (!cursor) {
				cursor = char
				type = 'value'
				needPush = false
			}
			else if (cursor === char) {
				cursor = ''
				type = 'key'
				needPush = false
			}
		}

		if (char === '=' && type === 'key') {
			needPush = false
		}

		if (/[\w\W]/.test(char) && needPush) {
			current[type] += type === 'key' && char === ' ' ? '' : char
		}

		if ((separator.test(char) && cursor === '') || i === length - 1) {
			attrs.push(current)
			reset()
		}
	}

	return attrs
}

export function tryParseJSON(v, callback) {
  try {
    const value = JSON.parse(v)
    return value
  }
  catch (e) {
    return callback(v)
  }
}

export function getStringHash(str) {
  let hash = 5381
  let i = str.length

  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i)
  }

  return hash >>> 0
}

export function isNone(value) {
  return typeof value === 'undefined' || value === null || isNaN(value)
}

export function each(obj, fn) {
	const keys = Object.keys(obj)
	keys.forEach((key) => {
		const value = obj[key]
		fn(value, key)
	})
}

export function isInstanceOf(value, Constructor, real = false) {
  if (!value || typeof value !== 'object') {
    return false
  }
  if (real) {
    return value.constructor === Constructor
  }
  else {
    return value instanceof Constructor
  }
}

export function isInheritedOf(SubConstructor, Constructor, strict) {
  const ins = SubConstructor.prototype
  return isInstanceOf(ins, Constructor, strict)
}

export function isObject(value) {
  return value && typeof value === 'object' && value.constructor === Object
}

export function isFunction(value) {
  return typeof value === 'function'
		&& (value + '') !== `function ${value.name}() { [native code] }` // String, Number
		&& (value + '').indexOf('class ') !== 0 // class
		&& (value + '').indexOf('_classCallCheck(this,') === -1 // babel transformed class
}
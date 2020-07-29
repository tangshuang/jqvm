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

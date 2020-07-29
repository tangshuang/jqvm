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

export function createAttrs(attributes) {
	const oAttrs = Array.from(attributes)
  const attrs = {}
  oAttrs.forEach((node) => {
    const { name, value } = node
    attrs[name] = value
	})
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

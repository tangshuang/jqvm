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

export function getAttrs(el) {
  return [...el.attributes].map(item => ({
    name: item.name,
    value: item.value,
  }))
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

export function getPath($element, $root, prefix = []) {
  let $parent = $element.parent()

  const index = [...$parent.children()].findIndex(child => child === $element[0])
  const name = $element[0].nodeName.toLowerCase()
  const path = [`${name}:nth-child(${index + 1})`]

  let level = 0
  while ($parent[0] !== $root[0]) {
    const $element = $parent
    $parent = $parent.parent()

    const index = [...$parent.children()].findIndex(child => child === $element[0])
    const name = $element[0].nodeName.toLowerCase()

    path.unshift(`${name}:nth-child(${index + 1})`)

    level ++
    if (level > 20) {
      throw new Error('Cant get $element path in given $root.')
    }
  }

  const items = [].concat(prefix).concat(path)
  return items.join('>')
}
import { isString, each } from 'ts-fns'

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

export function getNodeAttrs(el) {
  const attributes = el.attributes || []
  const oAttrs = [...attributes]
  const attrs = {}
  oAttrs.forEach((node) => {
    const { name, value } = node
    attrs[name] = value
  })
  return attrs
}

export function createAttrsText(attrs) {
  const attrsTexts = []
  each(attrs, (value, key) => {
    attrsTexts.push(`${key}="${value}"`)
  })
  const attrsText = attrsTexts.join(' ')
  return attrsText
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

  if (!$parent.length) {
    return []
  }

  const findIndex = ($parent, $child) => {
    const children = $parent[0].childNodes
    const child = $child[0]
    let index = 0
    for (let i = 0, len = children.length; i < len; i ++) {
      const item = children[i]
      if (item.nodeName === child.nodeName) {
        index ++
      }
      if (item === child) {
        return index
      }
    }
  }

  const index = findIndex($parent, $element)
  const name = $element[0].nodeName.toLowerCase()
  const path = [`${name}:nth-of-type(${index})`]

  let level = 0
  while ($parent[0] !== $root[0]) {
    const $element = $parent
    $parent = $parent.parent()

    const index = findIndex($parent, $element)
    const name = $element[0].nodeName.toLowerCase()

    path.unshift(`${name}:nth-of-type(${index})`)

    level ++
    if (level > 20) {
      throw new Error('Cant get $element path in given $root.')
    }
  }

  const items = [].concat(prefix).concat(path)
  return '>' + items.join('>')
}

export function camelCase(str) {
  const items = str.split(/\W|_/).filter(item => !!item)
  const texts = items.map((item, i) => {
    if (i === 0) {
      return item
    }
    return item.replace(item[0], item[0].toUpperCase())
  })
  return texts.join('')
}

export function parseKey(str) {
  const matched = str.match(/([a-zA-Z0-9_$]+)(\((.*?)\))?/)
  const [, name, , _params] = matched
  const params = isString(_params)
    ? _params
      .split(',')
      .map(item => item.trim())
      .filter(item => !!item)
    : void 0
  return [name, params]
}

export function getNodeName(node) {
  return node.nodeName.toLowerCase()
}
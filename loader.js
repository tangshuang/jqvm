function compile(content, options = {}) {
  const [_t, template] = content.match(/<template>([\s\S]+)<\/template>/m) || []
  const [_h, hoist] = content.match(/<template hoist>([\s\S]+)<\/template>/m) || []
  const [_s, script] = content.match(/<script>([\s\S]+)<\/script>/m) || []
  const [_y, style] = content.match(/<style>([\s\S]+)<\/style>/m) || []

  const fn = script.replace(/export\s+default/, '').trim()

  const useStyle = () => {
    if (!style) {
      return ''
    }

    return `
const style = document.createElement('style')
style.textContent = \`${style}\`
document.head.appendChild(style)
`
  }

  let contents = ''

  if (!options.$) {
    contents += `
import jQuery from 'jquery'
import { useJQuery } from 'jqvm'

const $ = useJQuery(jQuery)
`
  }
  else if (typeof options.$ === 'string') {
    contents += `
const $ = ${options.$}
`
  }

  contents += useStyle()

  const tpl = hoist ? hoist : `<template>${template}</template>`
  contents += `
const fn = ${fn}

const component = fn($(\`${tpl}\`))
`

  if (!options.export || options.export === 'default') {
    contents += `
export default component
`
  }
  else {
    contents += `
window['${options.export}'] = component
`
  }

  return contents.trim()
}

function loader(content) {
  const options = this.getOptions()
  return compile(content, options)
}

// so that we can compile the file independent
loader.compile = compile

module.exports = loader

function compile(content, options = {}) {
  const [_t, template] = content.match(/<template>([\s\S]+)<\/template>/m) || []
  const [_h, hoist] = content.match(/<template hoist>([\s\S]+)<\/template>/m) || []
  const [_s, script] = content.match(/<script>([\s\S]+)<\/script>/m) || []
  const [_y, style] = content.match(/<style>([\s\S]+)<\/style>/m) || []

  const lines = script.split('\n')
  const globalScripts = []
  const exportScripts = []
  lines.forEach((line) => {
    if (line.indexOf('export default') > -1) {
      exportScripts.push(line)
    }
    else if (exportScripts.length) {
      exportScripts.push(line)
    }
    else {
      globalScripts.push(line)
    }
  })

  const globalContents = globalScripts.join('\n').trim()
  const exportContents = exportScripts.join('\n').trim()

  const fn = exportContents.replace(/export\s+default/, '').trim()
  const tpl = hoist ? hoist : `<template>${template}</template>`

  let contents = ''

  if (globalContents) {
    contents += `
${globalContents}
`
  }

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

  if (style) {
    const css = options.css ? options.css(style) : style
    contents += `
const style = document.createElement('style')
style.textContent = \`${css}\`
document.head.appendChild(style)
`
  }

  const t = options.template ? options.template(tpl) : tpl
  contents += `
const fn = ${fn}

const component = fn($(\`${t}\`), $)

export default component
`

  return contents.trim()
}

function loader(content) {
  const options = this.getOptions()
  return compile(content, options)
}

// so that we can compile the file independent
loader.compile = compile

module.exports = loader

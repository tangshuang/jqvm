function compile(content, options = {}) {
  const [_t, template] = content.match(/<template>([\s\S]+)<\/template>/m)
  const [_t, hoist] = content.match(/<template hoist>([\s\S]+)<\/template>/m)
  const [_s, script] = content.match(/<script>([\s\S]+)<\/script>/m)

  const fn = script.replace(/export\s+default/, '').trim()

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

  const tpl = hoist ? hoist : `<template>${template}</template>`

  contents += `
const fn = ${fn}

const component = fn($(\`${tpl}\`))

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

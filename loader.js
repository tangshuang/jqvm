function compile(content, options = {}) {
  const [_t, template] = content.match(/<template>([\s\S]+)<\/template>/m)
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

  contents += `
const fn = ${fn}

const component = fn($(\`<template>${template}</template>\`))

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

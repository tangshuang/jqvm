const { compile } = require('../../loader')
const fs = require('fs')

const content = fs.readFileSync(__dirname + '/component-a.html').toString()
const output = compile(content, { $: 'jQuery' })
fs.writeFileSync(__dirname + '/component-a.js', output)

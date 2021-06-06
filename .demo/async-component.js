const template = `
  <div data-async>
    <div>{{title}}</div>
    <div>{{content}}</div>
  </div>
`
export default $(template)
  .vm(() => ({ title: 'Title', content: 'Content' }))

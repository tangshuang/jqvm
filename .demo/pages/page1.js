const template = `
  <article>
    <h3>{{title}}</h3>
    <main><slot></slot></main>
  </article>
`

const page = $(template)
  .vm(() => {
    return {
      title: '',
    }
  })

export default page

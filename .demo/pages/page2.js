const template = `
  <article>
    <h3>{{title}}</h3>
    <main>{{content}}</main>
  </article>
`

const page = $(template)
  .vm(() => {
    return {
      title: '',
      content: '',
    }
  })

export default page

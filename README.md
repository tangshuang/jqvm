# JQVM

A reactive frontend view-model framework based on jQuery.

## Install

```
npm i jqvm
```

You can use cdn of unpkg.

```html
<script src="https://unpkg.com/jquery/dist/jquery.min.js"></script>
<script src="https://unpkg.com/jqvm/dist/jqvm.min.js"></script>
```

## Usage

**step 1: template**

You should define your template in your html.

```html
<!DOCTYPE html>

<template id="app">
  <div class="title">{{title}}</div>
</template>
```

**step 2: initialize**

You should create scripts like this:

```html
<script src="jquery.js"></script>
<script src="jqvm.js"></script>

<script>
  $('#app')
    .vm({ title: 'Default Title' })
    .mount()
</script>
```

**step 3: bind event listeners**

Unlike vue.js, you should must bind event listeners in script, not in template.

```html
<script>
  $('#app')
    .vm({ title: 'Default Title' })
    .on('click', '.title', vm => () => {
      vm.title = 'New Title'
    })
    .mount()
</script>
```

Here, you call the `on` method and pass a callback function to change `vm`, and the view will be rerendered.

## API

### $.vm

`$.vm` is a set of jqvm static services. It contains:

- component(name, link): component register function
- directive(name, link): directive register function
- Store: store constructor
- ViewModel: vm base constructor, you should use `extends` to create a new sub ViewModel

### $.fn.vm

JQVM is a jQuery plugin first at all, you should use code like this:

```js
$('#app').vm(initState)
```

The return value is a `view` object which has methods:

- on(events, selector?, callback): bind listener, notice, callback is different from jQuery.fn.on, I will show detail later
- off(events, selector?, callback): unbind listener which is bound by `on`
- mount(): mount view into DOM
- unmount(): destroy view in DOM, `vm` is unusable until you invoke `mount` again

Now, let look into `callback` detail.

```js
// a function which return a inner function
// vm is the core `vm` object
function callback(vm) {
  const view = this // view.unmount()

  // handle function is used to be put into jQuery.fn.on as you did in `$('#app').on('click', handle)
  // handle function is optional, when you do not return handle function, callback will be invoked when the event happens, but you have no idea to receive DOM event
  return function handle(e) {
    const el = this
    const $el = $(this)
  }
}
```

When you do not pass `selector`, it is different from jQuery.fn.on, this way bind listener to inside events:

- mount: when you invoke `view.mount()` this event will be triggered
- unmount: when you invoke `view.unmount()`

```js
$('#app').vm({ name: 'some' })
  .on('mount', vm => {
    vm.name = 'new name'
  })
  .mount()
```

The `vm` object you receive in callback function is a reactive object which is like vue's vm. So you can change properties of it directly to trigger rerendering.
And the scope in template is `vm`, so when you write a `{{title}}` in template, you are calling `vm.title` in fact.
`vm` is only available in `on` callback function.

It is from `initState` which is received by `$('#app').vm(initState)`, It can be:

- object: a normal object which is used to be initialize vm's backend state.
- store: an instance of `Store`
- vm: an instance of `ViewModel`
- ViewModel: a class extended from `ViewModel`
- function: which returns one of above

When you pass a normal object, the original object will be changed by vm. This make it shared amoung different mounting. To prevent this, you can use a function to return a independent object in the function.

```js
const view = $('#app').vm(function init() {
  return { title: 'xxx' }
})

view.mount()
view.unmount() // destory DOM
view.mount() // use `init` to generate independent initState
```

I will detail `Store` and `ViewModel` in following parts.

## Store/ViewModel

First at all, you should read [tyshemo](https://tyshemo.js.org) to know how to use `Store` and `Model`.
The only thing you should know is `ViewModel` is extended from `TraceModel`.

To use a ViewModel, you can provide more information in `on` callback.

```js
const { ViewModel, Meta } = $.vm

class Name extends Meta {
  static default = 'tomy'
  static type = String
}
class Age extends Meta {
  static default = 0
  static type = Number
}

class Person extends ViewModel {
  static name = Name
  static age = Age

  state() {
    return {
      books: []
    }
  }

  grow() {
    this.age ++
  }

  study(book) {
    this.books.push(book)
  }
}

$('#app')
  .vm(Person)
  .on('click', '.grow', vm => () => vm.grow())
  .on('study', '.study', vm => (e) => {
    const book = {}
    vm.study(book)
  })
  .mount()
```

This is what you can do with JQVM.

## License

MIT.

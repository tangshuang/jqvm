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

There is a small [demo](https://unpkg.com/jqvm/index.html), you can try it online.

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

### $.fn.vm

JQVM is a jQuery plugin first at all, you should use code like this:

```js
const view = $('#app').vm(initState)
```

The return value is a `view` object which has methods:

- on(events, selector?, callback): bind listener, notice, callback is different from jQuery.fn.on, I will show detail later
- off(events, selector?, callback): unbind listener which is bound by `on`
- mount(el?): mount view into DOM
- unmount(): destroy view in DOM, `vm` is unusable until you invoke `mount` again
- update(nextState): rerender
- find(selector): same as `$.fn.find`, select elements in view container

The `mount` method can receive a selector or a jquery element.

```js
const template = `
  <template>
    <div>{{title}}</div>
  </template>
`
$(template)
  .vm({ title: 'xxx' })
  .mount('#app')
```

When `el` is passed, the view will be rendered in the target element (replace the innerHTML). If `el` is not passed, you should select a element in DOM and the view will be rendered after the selected element (as the beginning code do).

Now, let look into `callback` detail.

```js
// a function which return a inner function
function callback(state) {
  const view = this // view.unmount()

  // handle function is used to be put into jQuery.fn.on as you did in `$('#app').on('click', handle)
  // handle function is optional, when you do not return handle function, callback will be invoked when the event happens, but you have no idea to receive DOM event
  return function handle(e) {
    const el = this
    const $el = $(this)
  }
}

view.on('click', '.some', callback)
```

Inside events:

- $mount: when you invoke `view.mount()` this event will be triggered
- $unmount: when you invoke `view.unmount()`
- $update: when invoke `view.update()`

```js
$('#app')
  .vm({ name: 'some' })
  .on('mount', state => {
    state.name = 'new name'
  })
  .mount()
```

The `state` object you receive in callback function is a reactive object which is like vue's state. So you can change properties of it directly to trigger rerendering.
And the scope in template is `state`, so when you write a `{{title}}` in template, you are calling `state.title` in fact.
`state` is only available in `on` callback function.

It is from `initState` which is received by `$('#app').vm(initState)`, It can be:

- object: a normal object which is used to be initialize vm's state.
- store: an instance of `Store`
- function: which returns one of above or other objects

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

## Store

```js
const { Store } = $.vm
const store = new Store({
  ...
})
$('#app')
  .vm(store)
  .on('click', 'button', state => (e) => {
    state.name = 'new name'
  })
  .mount()
```

This make vm shared, the `store` will be used again amoung mountings.

```js
$('#app')
  .vm(function() {
    const { Store } = $.vm
    const store = new Store({
      ...
    })
    return store
  })
  .mount()
```

This make vm independent, it will create new one `store` in each mounting.

You can know more about `Store` from [tyshemo](https://tyshemo.js.org).

## ViewModel

First at all, you should read [tyshemo](https://tyshemo.js.org) to know how to use `Model`.

To use a ViewModel, you can provide more information in `on` callback.

```js
import { ViewModel, Meta } from 'tyshemo'

class Name extends Meta {
  static default = 'tomy'
  static type = String
}
class Age extends Meta {
  static default = 0
  static type = Number
}

class Person extends ViewModel {
  schema() {
    return {
      name: Name,
      age: Age,
    }
  }

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
  .vm(new Person()) // shared vm, or .vm(() => new Person()) as indenpendent vm
  .on('click', '.grow', model => () => model.grow())
  .on('study', '.study', model => (e) => {
    const book = {}
    model.study(book)
  })
  .mount()
```

This is what you can do with JQVM.

## Component

You can invoke `component` to create a new tag.

```js
const { component } = $.vm

component('icon', function(el, attrs) {
  // notice the el is a copy from template
  const { type } = attrs
  // return new html to render
  return `<i class="icon icon-${type}"></i>`
})
```

Now you can use this `icon` component in template:

```html
<template id="app">
  <icon type="search"></icon>
</template>
```

## Directive

You can invoke `directive` to create a new attribute.

```js
const { directive } = $.vm

directive('jq-link', function(el, attrs) {
  const link = attrs['jq-link']
  el.attr('href', link)
  // if you return a string, it will be used as this tag's new content
  // if you do not return anthing, el will be used as content
})
```

```html
<template id="app">
  <a jq-link="xxx">link</a>
</template>
```

*Notice that, `el` is a copy element in `directive` and `component`, it is not in real DOM, so you should not bind events on it, binding will not work!*

**BuiltIn Directives**

Here are builtin directives:

- jq-if="!!exp" | whehter to show this tag
- jq-class="{ 'some-class': !!some }" | whether patch classes to tag
- jq-value="prop" | only used on `input[type=text]` `select` `textarea`
- jq-disabled | only used on `input` `select` `textarea` `button`
- jq-checked | only used on `input[type=checkboxe]` `input[type=radio]`
- jq-selected | only used on `select > option`
- jq-src | only used on `img`, you should always use jq-src instead of `src`
- jq-repeat | print serval times

The `jq-repeat` usage is a little complex:

```html
<div jq-repeat="data" repeat-value="item" repeat-scope="{
  some: some,
  any: any
}">
  <span>{{item.name}}</span>
  <span>{{some.time}}</span>
  <span>{{any.num}}</span>
</div>
```

You can use `repeat-key` `repeat-value` `repeat-scope` together with `jq-repeat`.

## License

MIT.

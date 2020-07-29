<p align="center"><img src="jqvm.png" alt="jqvm" width="120" height="120"/></p>
<h1 align="center">jQvm</h1>
<p align="center">The world's easiest reactive frontend view-model framework based on jQuery.</p>

<br />
<br />
<br />

<p align="center"><img src="https://camo.githubusercontent.com/3b69fdf3e874a6cc64012c5a1a858767155a95d9/687474703a2f2f72616e646f6a732e636f6d2f696d616765732f64726f70536861646f772e706e67" width="100%"/></p>

<br />
<br />
<br />
<br />

## :hear_no_evil:  What's all the jQvm?

JQvm is a library, a jQuery plugin, a frontend reactive view-model framework, which helps JavasScript developers who are familiar with jQuery code more quickly. Boring with React, Vue? Want to taste reactive programming in frontend? Believe me, if you have learned jQuery, you can setup a small application in 10 seconds!

## :rocket: Install

```
npm i jqvm
```

You can use cdn of unpkg.

```html
<script src="https://unpkg.com/jquery/dist/jquery.min.js"></script>
<script src="https://unpkg.com/jqvm/dist/jqvm.min.js"></script>
```

## :zap: Fast implementation

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
    .on('click', '.title', state => {
      state.title = 'New Title'
    })
    .mount()
</script>
```

Here, you call the `on` method and pass a callback function to change `state`, and the view will be rerendered.

## :tada: API

### $.vm

`$.vm` is a set of jqvm static services. It contains:

- component(name, link): component register function
- directive(name, link): directive register function
- ViewModel: vm constructor
- View: view constructor

### $.fn.vm

JQVM is a jQuery plugin first at all, you should use code like this:

```js
const view = $('#app').vm(initState)
```

JQVM will treat html in #app as template, so, it is recommended to use `template` tag to define template.

The return value is a `view` object which has methods:

- on(events, selector?, callback): bind listeners, notice that callback is different from jQuery.fn.on, I will detail later
- off(events, selector?, callback): unbind listener which is bound by `on`
- mount(el?): mount view into DOM
- unmount(): destroy view in DOM, `vm` is unusable until you invoke `mount` again
- update(nextState): rerender, you can pass new state into `update()`, the new state will be merge into old state like react setState does.
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
  .mount('div#app') // mount view to div#app
```

When selector is passed into `mount`, the view will be rendered in the target element (replace with innerHTML). If selector is not passed, you should select a element in DOM and the view will be rendered after the selected element (as the beginning code does).

Now, let's look into `callback` detail.

```js
// a function which return a inner function
function callback(state) {
  const view = this // view.unmount()

  // handle function which is put into jQuery.fn.on as you did like `$('#app').on('click', handle)`
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
  .on('$mount', state => {
    state.name = 'new name'
  })
  .mount()
```

The `state` object you receive in callback function is a reactive object which is like what vue does. So you can change properties of it directly to trigger rerendering.
And the scope in template is `state`, so when you write a `{{title}}` syntax in template, you are calling `state.title` in fact.
`state` is only available in `on` callback functions.

It is created from `initState` which is received by `$('#app').vm(initState)`, `innitState` can be one of:

- object: a normal object which is used to be vm's default state.
- vm: an instance of `ViewModel`
- function: which returns one of above

*Notice, an instance of some class, for example `new Some()`, is not recommeded to pass in.*

When you pass a normal object, the original object will be changed by vm. This make it shared amoung different mounting.
To prevent this, you can use a function to return an independent object in the function.

```js
const view = $('#app').vm(function init() {
  return { title: 'xxx' }
})

view.mount()
view.unmount() // destory DOM
view.mount() // use `init` function to generate independent initState
```

I will detail `ViewModel` in following parts.

## :truck: ViewModel

```js
const { ViewModel } = $.vm
const vm = new ViewModel({
  ...
})

$('#app')
  .vm(vm)
  .on('click', 'button', state => (e) => {
    state.name = 'new name'
  })
  .mount()
```

This make vm shared, the `vm` will be used again amoung mountings.

```js
$('#app')
  .vm(function() {
    const { ViewModel } = $.vm
    const vm = new ViewModel({
      ...
    })
    return vm
  })
  .mount()
```

This make vm independent, it will create one new `vm` in each mounting.

`ViewModel` is extended from tyshemo's `Store`, you can know more from [tyshemo](https://tyshemo.js.org).

## :bulb: Model

First at all, you should read [tyshemo](https://tyshemo.js.org) to know how to use `Model`.

To use a Model, you can provide more information in `on` callback.

```js
import { Model, Meta } from 'tyshemo'

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
  .vm(new Person()) // shared, or .vm(() => new Person()) for indenpendent
  .on('click', '.grow', model => {
    model.grow()
  })
  .on('study', '.study', model => {
    const book = new Book() // define Book somewhere
    model.study(book)
  })
  .mount()
```

This is what you can do with `Model`.

## :clown_face: Component

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

## :dizzy: Directive

You can invoke `directive` to create a new attribute.

```js
const { directive } = $.vm

directive('jq-link', function(el, attrs) {
  const link = attrs['jq-link']
  el.attr('href', link)
  // if you return a string, it will be used as this tag's new content
  // if you do not return anthing, `el` will be used as content
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

- `jq-if="!!exp"` whehter to show this tag
- `jq-class="{ 'some-class': !!exp }"` whether patch classes to tag
- `jq-value="exp"` only used on `input[type=text]` `select` `textarea`
- `jq-disabled="!!exp"` only used on `input` `select` `textarea` `button`
- `jq-checked="!!exp"` only used on `input[type=checkbox]` `input[type=radio]`
- `jq-selected="!!exp"` only used on `select > option`
- `jq-src="exp"` only used on `img`, you should always use jq-src instead of `src`
- `jq-repeat` print serval times

The `jq-repeat` usage is a little complex:

```html
<div jq-repeat="data" repeat-value="item" repeat-key="index" repeat-scope="{
  some: some,
  any: any
}">
  <span>{{index + 1}}</span>
  <span>{{item.name}}</span>
  <span>{{some.time}}</span>
  <span>{{any.num}}</span>
</div>
```

You can use `repeat-key` `repeat-value` `repeat-scope` together with `jq-repeat`.

## :see_no_evil: License

MIT.

<h1 align="center"><a href="https://github.com/tangshuang/jqvm"><img src="jqvm.png" alt="jqvm" width="120" height="120"/></a></h1>
<p align="center">The world's easiest reactive frontend view-model framework based on jQuery.</p>

<br />
<br />
<br />

<p align="center"><a href="https://github.com/tangshuang/jqvm"><img src="https://camo.githubusercontent.com/3b69fdf3e874a6cc64012c5a1a858767155a95d9/687474703a2f2f72616e646f6a732e636f6d2f696d616765732f64726f70536861646f772e706e67" width="100%"/></a></p>

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

With modules system.

```js
import jQuery from 'jquery'
import { useJQuery } from 'jqvm'

const $ = useJQuery(jQuery)
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

Or

```js
import jQuery from 'jquery'
import { useJQuery } from 'jqvm'

const $ = useJQuery(jQuery)
$('#app')
  .vm({ title: 'Default Title' })
  .mount()
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

Here, you call the `on` method and pass a action function to change `state`, and the view will be rerendered.

## :tada: API

### $.vm

`$.vm` is a set of jqvm static services. It contains:

- component(name:string, compile:function, affect:function): global component register function
- directive(name:string, compile:function, affect:function): global directive register function
- filter(name:string, formatter:function): global filter register function
- View: view constructor

### $.fn.vm

JQVM is a jQuery plugin first at all, you should use code like this:

```js
const view = $('#app').vm(initState)
```

JQVM will treat html string in #app as template, so, it is recommended to use `template` tag to define template.

The return value is a `view` object which has methods:

- on(events, selector?, action): bind an action, notice that action function is different from jQuery.fn.on callback function, I will detail later
- off(events, selector?, action?): unbind listener which is bound by `on`
- mount(el?): mount view into DOM
- unmount(): unmount view from DOM, `vm` is unusable until you invoke `mount` again
- destroy(): unmount and clear bound actions, after you destroy, you can mount again, but actions should be bound again
- update(nextState): rerender, you can pass new state into `update()`, the new state will be merge into old state like react setState does.
- find(selector): same as `$.fn.find`, select elements in view container
- component(name, compile, affect): register component only for this vm
- directive(name, compile, affect): register directive only for this vm
- filter(name, formatter): register formatter only for this vm
- fn(name, action?): register a function on `view`, when you not pass `func`, it means you want to get the function, `action` is the same usage as `on`

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

Now, let's look into `action` detail.

```js
// a function which return a inner function
// state: the current state in vm
function action(state) {
  const view = this // you can do like `view.unmount()`

  state.some = 'next' // `some` should be exisiting in state, and this will trigger rerendering later
  // if `some` is not in state, you should MUST use `state.$set('some', 'next')
  // async works, i.e. setTimeout(() => state.some = 'next', 1000)
  // if you change some instances which is not a plain object, you should invoke `view.update()` manually,
  // i.e. `state.myIns.name = 'new name'; view.update()`

  // handle function which is put into jQuery.fn.on as you did like `$('#app').on('click', handle)`
  // handle function is optional, when you do not return handle function, action will still be invoked when the event happens, but you have no idea to receive DOM event
  return function handle(e) {
    const el = this
    const $el = $(this)
  }
}

view.on('click', '.some', action)
```

Inside events:

- $mount: when you invoke `view.mount()` this event will be triggered
- $unmount: when you invoke `view.unmount()`
- $render: when inner content rendered
- $change: when state change

```js
$('#app')
  .vm({ name: 'some' })
  .on('$mount', state => {
    state.name = 'new name'
  })
  .mount()
```

The changing of `state` object you receive in action function will trigger rerendering.
And the scope in template is `state`, so when you write a `{{title}}` syntax in template, you are calling `state.title` in fact.
`state` is only available in `on` action functions.

*You should always change `state` instead of changing DOM to trigger UI changing. You should not change DOM in `action` function unless you know what you are doing!*

It is created from `initState` which is received by `$('#app').vm(initState)`, `initState` can be one of:

- object: a normal object which is used to be vm's default state.
- function: which returns one of above

*Notice, an instance of some class, for example `new Some()`, should not be passed in, only normal object supported.*

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

## :dizzy: Directive

You can invoke `directive` to create a new attribute.

```
directive(name:string, compile:function, affect:function)
```

- name: the tag name of the directive
- compile($el, attrs): how to compile this component, should return undefined|$el|htmlstring
- affect($el, attrs): do some side effects after whole template have been compiled, should return a function to abolish side effects, will be invoke after each compilation

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

Example of `affect`:

```js
directive('jq-src', null, function($el, attrs) {
  // here $el is real DOM element referer
  const attr = attrs['jq-src']
  const value = this.scope.interpolate(attr)
  $el.attr('src', value)
})
```

This is the source code of `jq-src`, by this operation, image will not be loaded when compiling, and will be loaded after insert into DOM.

```html
<img jq-src="/xxx/{{id}}.jpg" />
```

You can even bind event listeners to $el:

```js
directive('jq-on-click', null, function($el, attrs) {
  const callback = () => console.log('click')
  $el.on('click', callback)
  return () => $el.off('click', callback) // notice, you should must return function to abolish side effects
})
```

**BuiltIn Directives**

Here are builtin directives:

- `jq-if="!!exp"` whehter to show this tag
- `jq-class="{ 'some-class': !!exp }"` whether patch classes to tag
- `jq-value="exp"` only used on `input` `select` `textarea`
- `jq-disabled="!!exp"` only used on `input` `select` `textarea` `button`
- `jq-checked="!!exp"` only used on `input[type=checkbox]` `input[type=radio]`
- `jq-selected="!!exp"` only used on `select > option`
- `jq-bind="keyPath"` two way binding, only used on `input` `select` `textarea`, when user type in, the `keyPath` value of vm will be update automaticly
- `jq-src="{{exp}}"` only used on `img`, you should always use jq-src instead of `src`
- `jq-repeat` print serval times
- `jq-on="event:fn"` bind event callback function

The `jq-repeat` usage is a little complex:

```html
<div jq-repeat="value,index in data traceby value.id">
  <span>{{index + 1}}</span>
  <span>{{value.name}}</span>
  <span>{{value.time}}</span>
</div>
```

Notice, `value,index` should have NO space inside, `,index` is optional.

The `jq-on` directive should must work with `view.fn`, for example:

```html
<button jq-on="click:handleSubmit">submit</button>

<script>
  $('..').vm({}).fn('handleSubmit', state => function(e) {
    ...
  })
</script>
```

## :clown_face: Component

You can invoke `component` to create a new tag.

```
component(name:string, view:View)
```

- name: the tag name of the component
- view: another view created by $.fn.vm

```js
const { component } = $.vm

const icon = $(`<i class="icon icon-{{type}}"></i>`).vm({ type: '' })

component('icon', icon)
```

Now you can use this `icon` component in template:

```html
<template id="app">
  <icon type="search"></icon>
</template>
```

When the component rendered, it will use `type="search"` to replace `type` state, so the final html is:

```
<i class="icon icon-search"></i>
```

## :bread: Filter

A filter is a string formatter which used in template.

```html
<template>
  <div>{{ price | number:2 }}</div>
</template>
```

```js
function number(value, fixed) {
  return value.toFixed(fixed)
}

view.filter('number', number)
```

The first paramter of the function is the value receive from the previous before `|`.

## :see_no_evil: License

MIT.

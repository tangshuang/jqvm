<h1 align="center"><a href="https://github.com/tangshuang/jqvm"><img src="jqvm.png" alt="jqvm" width="120" height="120"/></a></h1>
<p align="center">基于jQuery的超简单响应式开发框架</p>

<br />
<br />
<br />

<p align="center"><a href="https://github.com/tangshuang/jqvm"><img src="https://camo.githubusercontent.com/3b69fdf3e874a6cc64012c5a1a858767155a95d9/687474703a2f2f72616e646f6a732e636f6d2f696d616765732f64726f70536861646f772e706e67" width="100%"/></a></p>

<br />
<br />
<br />
<br />

[中文文档](./README_zh.md)
[English](./README.md)

## :hear_no_evil:  什么是jQvm?

jQvm是一个jQuery插件，同时也是一个MVVM响应式视图层框架。它帮助熟悉jQuery的开发者实现更便捷的开发。你可能用过其他前端框架，但是，如果你的系统是基于jQuery的老系统，那么根本没法迁移，而使用这个插件，你就既能在原有系统基础上升级，同时又享受现代响应式编程的乐趣。相信我，如果你用过jQuery，你会在10秒内学会jQvm！

## :rocket: 安装

```
npm i jqvm
```

```js
import jQuery from 'jquery'
import { useJQuery } from 'jqvm'

const $ = useJQuery(jQuery)
```

或者直接使用CDN引入：

```html
<script src="https://unpkg.com/jquery/dist/jquery.min.js"></script>
<script src="https://unpkg.com/jqvm/dist/jqvm.min.js"></script>
```

## :zap: 快速上手

这里有一个小[demo](https://unpkg.com/jqvm/index.html)，你可以提前在线试试。

**第1步：模板**

你可以在HTML中定义好模板。

```html
<!DOCTYPE html>

<template id="app">
  <div class="title">{{title}}</div>
</template>
```

**第3步：实例化**

接下来，你需要在脚本中实例化视图。

```html
<script src="jquery.js"></script>
<script src="jqvm.js"></script>

<script>
  $('#app')
    .vm({ title: 'Default Title' })
    .mount()
</script>
```

或者：

```js
import jQuery from 'jquery'
import { useJQuery } from 'jqvm'

const $ = useJQuery(jQuery)
$('#app')
  .vm({ title: 'Default Title' })
  .mount()
```

**第3步：事件监听**

你可以像使用jQuery的on一样，对视图内部的元素进行监听。

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

在这段代码里面，你用`on`方法监听了`click`事件，同时在回调函数中，直接修改`state`触发界面更新。

你也可以使用内部指令`jq-on`来完成事件监听：

```html
<template>
  <div>{{title}}</div>
  <button jq-on="click:change"></button>
</template>

<script>
  $('#app')
    .vm({ title: 'Title' })
    .fn('change', state => {
      state.title = 'New Title'
    })
    .mount()
</script>
```

使用内置的`jq-on`指令，再配合通过`fn`方法定义的一个内部函数，就可以完成对`button`的点击事件监听。

## :tada: API

> jQvm里面有两个概念：View和VM。我们调用`$('#app').vm({ a: 1 })`时会在上下文中建立一个VM，返回的是一个View的实例。VM对开发者不可见，它有一个state作为渲染界面的数据，这个state可在事件监听或方法调用时作为函数的参数被拿到。View实例是开发者使用的主要的对象，这个view提供了一堆方法，在大部分情况下都可以被获取，具体看下文。

### 导出接口

如果你在模块系统中使用，那么如下引入需要的接口：

```js
import {
  component,
  directive,
  filter,
  View,
  useJQuery,
  createStore,
  createAsyncComponent,
} from 'jqvm'
```

如果在浏览器中使用，可以快速的按下面的方法引入：

```js
const {
  component,
  directive,
  filter,
  View,
  useJQuery,
  createStore,
  createAsyncComponent,
} = window.jqvm
```

`jqvm`是挂载在window对象上的一个静态属性，它提供了一系列的对象给你使用。其中包含了:

- component(name:string, compile:function, affect:function): 注册全局组件
- directive(name:string, compile:function, affect:function): 注册全局指令
- filter(name:string, formatter:function): 注册全局过滤器
- View: View构造器。基本上不会用到，只会用来作为一些判断依据。
- useJQuery: 你可以使用另外一个版本的jQuery，一般只在模块系统中使用
- createStore: 用于创建一个store的函数
- createAsyncComponent: 用于创建一个异步组件的函数

### $.fn.vm

jQvm是一个jQuery插件，所以使用的时候，像其他插件一样，你可以这么用：

```js
const view = $('#app').vm(initState)
```

jQvm把`#app`内部的HTML字符串当作模板，用它们来构建界面。但是，如果你直接在HMTL中写标签，会被渲染到界面上，所以，jQvm强制你用`<template>`来写模板，这样就不会在html文件加载好时渲染模板元素。

`.vm`方法返回一个`view`，这个view包含来如下方法：

- on(event, selector?, action): 绑定事件，传入对应的行为函数
- once(event, selector?, action): 对应jQuery的one绑定
- off(event, selector?, action?): 解除通过`on`或`once`绑定的事件回调
- mount(el?): 将view挂载到某个节点上，当不传el的时候，挂载到`<template>`后面
- unmount(): 将view从DOM中卸载, 但是需要注意，卸载后view并没有被销毁，你可以再次执行mount来挂载
- destroy(): 销毁，卸载并且释放内存，之后不能再调用mount或其他方法进行操作
- update(nextState?): 更新，你可以传入一个对象，这个对象将被合并到当前state上，作为下一次渲染的数据
- find(selector): 和jQuery的find一样的效果，用于找到view渲染出来的DOM内部的节点，一般在回调函数action内使用
- component(name, compile, affect): 注册组件到当前vm
- directive(name, compile, affect): 注册指令到当前vm
- filter(name, formatter): 注册过滤器到当前vm
- fn(name, action): 在当vm上定义一个名为name的行为函数

接下来我们来看下mount接收参数的使用方法：

```js
const template = `
  <template>
    <div>{{title}}</div>
  </template>
`
// 这里是jQuery的用法，支持传入字符串作为模板
$(template)
  .vm({ title: 'xxx' })
  .mount('div#app') // 将view挂载到div#app
```

如果你采用了这种字符串模板的形式，那么mount的时候必须挂载到一个具体的节点。但是，如果你是基于HTML中的`<template>`标签创建模板，那么可以不用传，mount会把渲染结果挂载在对应的那个`<template>`标签后面，这样可以根据你页面中template的位置来决定布局。

jQvm试图保留jQuery的编程风格，并在其基础上增加一些灵活性，因此，对于事件绑定的函数会和jQuery中的函数稍有不同。在jQvm中，我们多了vm这个部分，因此，我们进行事件处理时，常常是为了修改state，通过state的变化来触发界面的更新。因此，在jQvm的事件绑定函数中，我们首先暴露出state，在函数中任何对state的变更都会引起重新渲染。我们把这个函数称为“行为函数”。*行为函数将在下文“事件系统”中详细讲解。*

```js
$().vm({ time: Date.now() })
  .on('click', '.button', (state) => {
    state.time = Date.now()
  })
```

> 你应该通过修改state来达到界面更新的效果，而非通过直接在方法内操作DOM的方式来更新界面。

通过`fn`定义的函数，往往只会配合事件来使用，而不是真的定义了一个函数。如果你需要复用某个逻辑，应该考虑将函数在vm之外定义，然后在具体的某个action中调用该函数，例如：

```js
function check(x, y) {
  return x > y
}
$(...).vm(...)
  .fn('submit', (state) => () => {
    if (check(state.x, state.y)) {
      ...
    }
  })
```

## :dizzy: 指令

你需要调用`directive`来注册指令。指令是指特殊的一些元素属性。例如内置的指令`jq-on`，就是让你的某个元素拥有特定能力的指令。

```
directive(name:string, compile:function, affect?:function)
```

- name: 指令名称
- compile($el, attrs): 编译期对节点的处理方法，必须返回undefined|$el|htmlstring
- affect($el, attrs): 渲染结束后对节点的处理方法，你可以在这里绑定事件，但是注意，如果你绑定了事件，必须返回一个函数，这个函数用于解除事件绑定

```html
<template id="app">
  <a jq-link="xxx">link</a>
</template>

<script>
directive('jq-link', function($el, attrs) {
  const link = attrs['jq-link']
  $el.attr('href', link)
})
</script>
```

```html
<img jq-src="/xxx/{{id}}.jpg" />

<script>
directive('jq-src', null, function($el, attrs) {
  const attr = attrs['jq-src']
  const value = this.scope.interpolate(attr)
  $el.attr('src', value)
})
</script>
```

**内置指令**

- `jq-if="!!exp"` 根据条件渲染当前节点
- `jq-class="{ 'some-class': !!exp }"` 根据条件决定当前节点是否要加入某些class
- `jq-value="exp"` 动态设定值，仅限`input` `select` `textarea`使用
- `jq-disabled="!!exp"` 动态设定disabled属性，仅限`input` `select` `textarea` `button`
- `jq-checked="!!exp"` 动态设定checked属性，仅限`input[type=checkbox]` `input[type=radio]`
- `jq-selected="!!exp"` 动态设定selected属性，仅限`select > option`
- `jq-bind="keyPath"` 双向数据绑定，仅限 `input` `select` `textarea`, 当用户在输入框输入时，state上的这个属性自动更新值，当state的这个属性值在另外一个地方被修改时，输入框的内容也跟随变化
- `jq-src="exp"` 动态加载src，仅限`img`，而且你应该尽可能的使用`jq-src`替代原始的`src`属性，因为原始的`src`会立即加载图片，但很可能此时你的state上还没有给出正确的值
- `jq-id="exp"` 动态设定id属性
- `jq-repeat` 循环输出，下文详细讲
- `jq-on="event:fn"` 绑定事件

循环输出指令`jq-repeat`使用起来比较复杂:

```html
<div jq-repeat="value,index in data traceby value.id">
  <span>{{index + 1}}</span>
  <span>{{value.name}}</span>
  <span>{{value.time}}</span>
</div>
```

*注意，`value,index`中间不能有空格，`,index`和`traceby value.id`是可选的。*

## :clown_face: 组件

你需要调用`component`来注册组件。组件是指具有自定义名称的元素。例如你可以自定义一个`my-icon`标签。

```html
<template id="app">
  <my-icon type="search"></my-icon>
</template>
```

那么要怎么来实现呢？先看下`component`的用法。

```
component(name:string, compile:Function|view:View, affect?)
```

- name: 新标签的名字
- compile: 编译期处理函数
  - view: 不传compile函数，而是传一个view实例，那么这个组件将在标签内完成view对应的vm规定的渲染逻辑
- affect: 渲染结束后的处理函数

我们先来看下`my-icon`怎么实现吧：

```js
component('my-icon', ($el, attrs) => {
  const { type } = attrs
  return `<i class="icon icon-${type}"></i>`
})
```

这样就实现了一个简单的组件。对于那种静态的简单组件而言，使用compile非常有用。但是，如果是动态的，有内部状态的，就需要使用view作为组件。

```js
const component = $(`
  <template>
    <div>name: {{name}}</div>
    <div>
      age: {{age}}
      <button jq-on="click:grow">Grow</button>
    </div>
    <div>color: {{color}}</div>
    <div><button jq-on="click:change">emit</button></div>
  </template>
`)
  .vm(() => ({ name: 'tidy', age: 1, color: 'white' }))
  .fn('grow', state => state.age ++)
  .fn('change', function(state) {
    const color = ['blue', 'yellow', 'red', 'white'].filter(item => item !== state.color)[parseInt(Math.random() * 100) % 3]
    this.emit('change', color)
  })
$('#component')
  .vm({ show: true, color: 'none' })
  .component('my-dog', component) // <-- 注册view为组件
  .fn('toggle', state => state.show = !state.show)
  .fn('change', (state) => (color) => {
    state.color = color
  })
  .mount()
```

上面这段代码中，我们通过`$().vm()`创建了一个view，注意，我没有在这个view的末尾调用.mount进行挂载，另外`.vm()`处，我们传入了一个返回initState的函数，因为作为组件，可能会被实例化多次，所以需要有独立的state数据。如果你这里不使用函数，而是直接传入对象的话，你会发现多个组件实例会相互影响，这是我们不愿意看到的。

**props**

组件接收外部通过属性的方式传入数据，有3种形式：

- `type="search"` 接收到普通的字符串
- `:type="'search'"` :开头，表达式，组件接收到的是计算后的值
- `@change="fn"` @开头，组件事件系统的回调函数，前文讲过

其中，第一种和第二种有可能会覆盖组件内部vm的state上的属性值。但是需要注意，只有那些在内部initState声明的属性，会被覆盖，没有在initState中声明的属性，不会被传入到组件内部。举个例子：

```js
const box = $(`...`).vm({ a: 1, b: 2 })

const view = $(`
  <my-box :a="2" c="xxx" @change="change(a,b)"></my-box>
`)
  .vm(() => ({ ... }))
  .component('my-box', box)
// :a="2" 正常工作，但是c="xxx"没有任何作用（对内部而言）
```

*需要注意，`:`开头的属性，仅限于自定义组件，普通HTML元素不支持。`type="{{type}}"`这种形式也可以基于状态动态设定值，但是它和`:type="type"`不同的是，前者传递给组件内部的是纯字符串，而后者传递进去的是表达式的结果，也就可能是数字或对象。*

**hoist组件**

前面的组件定义方法，会让最终的渲染结果被放置在组件标签内部。例如最终渲染为`<my-tag><div>...</div></my-tag>`，如果你想让渲染结果直接替换`<my-tag>`需要怎么办呢？你需要在template上添加一个`hoist`属性，例如下面这样做：

```js
const component = $(`
  <div>
    ...
  </div>
`).vm({ ... })
```

你只需要在模板中，直接使用非template作为顶层标签，它就会在渲染时替换组件标签`<my-tag>`完成渲染。

## 事件系统

jQvm内部存在两套事件系统，不过在用法上它们是一致的，在使用时不用担心写错，但是你必须理解这两套事件系统之后，才能避免在使用过程中出现不可预期的结果。

### 使用方法

```js
// 第一种：通过view.on()绑定
$().vm()
  // 回调函数是可选的
  .on('事件名', '子元素选择器', 行为函数(state) => 回调函数?(e))

// 第二种：通过jq-on绑定
// 先在模板中调用
<button jq-on="事件名:行为函数(参数列表)"></button>
// 然后使用view.fn对行为函数进行定义
$().vm()
  // 回调函数是可选的
  .fn('行为函数', (state, 参数列表) => 回调函数?(e))

// 第三种：通过@对组建进行事件绑定
// 在调用组件时绑定事件
// 这里的行为函数，在当前调用该组件的视图里面定义
<my-component @事件名="行为函数(参数列表)"></my-component>
// 然后在组件内部（注意是组件内部）进行事件抛出
$().vm()
  // 在组件内部可能会使用jq-on来使用下面这个定义的行为函数
  // 注意，此处的函数必须是function函数，而不能是箭头函数，因为内部要使用this
  .fn('某个内部行为函数', function() {
    // 要抛出的事件名，对应@后面的事件名
    // 参数列表对应@后面的参数列表
    this.emit('事件名', 参数列表)
  })
```

上面列举了jQvm中的三种事件使用场景，只有这三种！

### 行为函数

和jQuery的事件回调函数不同，jQvm的行为函数由两层柯里函数组成。具体如下：

```js
// state: 当前vm中对应的state
// ...args: 参数列表，对应上面行为函数后面的参数列表
function action(state, ...args) {
  // this指向view
  // 你可以在这里执行类似`view.unmount()`这样的操作
  const view = this

  state.some = 'next' // `some`必须在initState中定义好，否则不会有响应式更新界面效果
  // 当然，jQvm提供了解决办法，你可以通过调用`state.$set('some', 'next')`来添加那些没有在initState中定义的属性
  // 修改state触发更新支持异步，例如setTimeout(() => state.some = 'next', 1000)也是正常工作的
  // 如果你自己写了一个类，并且把它的实例作为state上的属性，那么修改这个实例是没有办法触发更新的，你需要手动调用`view.update()`来触发更新，
  // 例如`state.myIns.name = 'new name'; view.update()`

  // 如果是用于事件绑定，action的返回值也必须是一个函数，这个函数将被作为事件的回调函数，你可以在它里面接收event对象作为参数
  // 不过，handle函数是可选的，不返回任何内容也是可以的，只是这样你就无法拿到event对象。
  // 可以对接jquery的事件系统，你甚至可以通过jquery的trigger来触发它
  return function handle(e) {
    const el = e.target
    const $el = $(this) // el === this
  }
}
```

### 举例说明

**第一种**

```html
<template id="app">
  <div class="title">{{title}}</div>
  <button>change</button>
</template>

<script>
  $('#app')
    .vm({ title: 'Default Title' })
    .on('click', 'button', (state) => {
      state.title = 'New Title'
      // 这里的handle函数是可选的可以不返回也行
      // 如果返回的情况下，将会按照jquery的方式进行执行，类似于在jquery里面 .on('click', 'button', (e) => e.preventDefault)
      return (e) => {
        e.preventDefault()
      }
    })
    .mount()
</script>
```

上面的这种方式通过类似jquery的事件绑定形式，直接接管DOM的点击事件。

**第二种**

```html
<template id="app">
  <div>{{title}}</div>
  <button jq-on="click:change(id)"></button>
</template>

<script>
  $('#app')
    .vm({ title: 'Title' })
    .fn('change', (state, id) => {
      state.title = 'Title of ' + id
    })
    .mount()
</script>
```

上面这种方式通过在模板中使用jq-on进行事件绑定，可以比较好的传递一些局部的参数进来。

**第三种**

```html
<template id="app">
  <div>{{title}}</div>
  <some-component @change="handleChange(id)"></some-component>
</template>

<template id="component">
  <button jq-on="click:handleClick(id)"></button>
</template>

<script>
  const component = $('#comonent').vm({ id: 1 })
    .fn('handleClick', function(state, id) {
      this.emit('change', id)
    })

  $('#app')
    .vm({ title: 'Title' })
    .component('some-component', component)
    .fn('handleChange', (state, id) => {
      state.title = 'Title of ' + id
    })
    .mount()
</script>
```

上面这种方式演示了使用@来承接组件抛出的事件。它其实有两个部分，第一个部分是component的部分，其中核心代码是`this.emit('change', id)`，用来抛出change事件；另一部分是app中使用`@change`来接住component中抛出的该事件，承接时，通过handleChange(id)接住了由emit抛出来的id值。


### 内置事件

除了组件的自定义的事件和DOM事件，jQvm的vm内也有一些事件，它们是：

- $init: 实例化view时被触发，整个生命周期只会被触发一次
- $mount: 调用`view.mount()`时触发
- $unmount: 调用`view.unmount()`时触发
- $render: view的内容被完全渲染后触发
- $change: state变化后触发
- $destroy: view被销毁时触发（仅支持手动调用view.destroy来销毁view）

这些内置事件需要使用`on`来监听：

```js
$('#app')
  .vm({ name: 'some' })
  .on('$mount', state => {
    state.name = 'new name'
  })
  .mount()
```

*另外，需要注意，凡是以`$`开头的事件名将被认为是内部的特殊事件，其回调函数将被丢弃，你也不能自己在DOM节点上通过on, once等自行注册此类事件。*

## :bread: 过滤器

过滤器是用来在模板中处理输出结果的处理器。

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

`|`是管道标识符，在很多系统中都有这种用法。简单说，|前面的值，将被|后面的过滤器处理，处理结果又会被再后面的过滤器处理。最后一个过滤器处理输出的结果就是最终的结果。

## :construction: 插件

我们可以通过view的plugin方法来完成一些复杂的集合处理，可以让我们把一些逻辑复杂的但关系紧密的操作，集合在一起，提供给view使用。你可以理解为插件就是多个view方法调用的封装。

```js
function somePlugin(context) {
  // 返回生命周期事件的集合，在这些事件节点上，对view作统一处理
  return {
    $init: () => {
      const { view, state } = context
      ...
    },
    $destroy: () => {
      ...
    },
  }
}

$(...).vm({ ... })
  .plugin(somePlugin)
```

插件本身是一个函数，返回一个以view生命周期事件（以$开头的内置事件）为key的对象，并规定对应生命周期事件要做的事情。

## 状态管理

有些情况下，你不想通过props传递的方式把状态从上往下传递，你希望通过一个桥梁，方便的在多个组件之间共享状态。此时，你可以借助`createStore`来创建一个状态管理器。具体如下使用：

```js
import { createStore } from 'jqvm'
```

或者

```js
const { createStore } = window.jqvm
```

然后创建一个状态管理器：

```js
const store = createStore({ count: 0 }, {
  onChange(keyPath, value) {
    // 此处用于收集
  },
  drive(update) {
    // 此处用于回放
    update(state => state.count ++)
  },
})
```

它有两个参数：

- initState: object 初始状态
- options:
  - onChange(keyPath:string[], value:any) 当状态发生变化时被调用执行
  - drive(update:Function) 当一个组件被第一次挂载时执行，参数update用法和view.update一致。通过drive参数，你可以实现根据收集到的变化进行回放。

通过上面的步骤，你创建了一个store，接下来，将该store作为`.vm(store)`参数进行使用。

```js
const componentA = $('<span>{{count}}</span>')
  .vm(store)
const componentB = $('<div>count: {{count}}</div>')
  .vm(store)
```

经过上面步骤，componentA和componentB拥有同一个state的引用，也就是说，它们内部操作state时，两个组件都会被同时更新。

最后，就是在其他地方使用这两个组件。


## 异步组件

通过异步组件，你可以很好的实现代码分割，起到一定的提升性能的效果。
你需要使用`createAsyncComponent`来实现一个异步组件。

```
createAsyncComponent(loader:Function, callback:Function) -> compile
```

- loader: 函数，用于返回一个含有`.then`方法的异步对象，可以是原生的`Promise`对象，也可以是`jQuery.Deferred`对象。在`then`中返回的结果可以是一个ES模块（必须包含`default`接口，并且`default`将被作为结果使用），或者是一个普通的结果。无论是`default`接口，还是结果对象本身，都必须是一个`View`的实例。通过下面的例子你可以理解这一描述。
- callback: 异步模块加载完成后调用执行。你可以在该函数内通过`this`访问当前vm中的view。

例子:

```js
// https://xxx/some-component.js
export default $(`<span>{{title}}</span>`)
  .vm(() => ({ title: '' }))

// main.js
$('#app').vm(...)
  .component('some-component', createAsyncComponent(() => import('https://xxxx/some-component.js')))
  .mount()
```

```js
// main.js
$('#app').vm({ loading: true })
  .component(
    'my-box',
    createAsyncComponent(
      () => $.get('https://xxxx/some-component.template.html')
        .then((html) => $(html).vm(() => ({ title: '' }))),
      function() {
        this.update({ loading: false })
      },
    ),
  )
```

通过上面的代码，你可以发现，关键在于你需要异步返回一个View实例给createAsyncComponent。

通过这样的操作，你可以把某些组件单独放到系统外给系统使用，从而减少当前系统代码量，提升性能。
除了上面使用`import()`之外，其实，你也可以利用AMD模块系统来达到同样的效果（AMD兼容较低版本的浏览器）。

## slot

你可以通过slot来实现内容穿越。简单说，你在组件内模板中使用`<slot></slot>`，那么当你在外面使用该组件时，可以让组件渲染结果包含传递结果。举个例子：

我们在组件内如此定义模板：

```html
<template>
  <article>
    <h1>{{title}}</h1>
    <div><slot></slot></div>
  </article>
</template>
```

在外部这样使用组件：

```html
<my-article title="文章标题">文章内容</my-article>
```

此时，`<slot></slot>`将被替换为"文章内容"。

在外部传递内容为外部编译的结果。例如：

```html
<my-article title="标题">内容：{{content}}</my-article>
```

此时，`content`为外部vm中state的content属性值，而非组件内的state属性值。但是，因为开发者可以自己在定义组件时对组件进行编译，所以在不同的组件中，这一效果会稍有不同，部分组件的编译逻辑不同，会同时使组件内和组件外的state对传递的内容生效，这根据组件的开发者自己决定。

## jqvm-loader

利用jqvm-loader，你可以实现SFC（单文件组件），结合异步组件，你可以将一些复杂的组件拆分出去。例如，你可以这样写一个组件

```html
<template hoist>
  <div>
    <h2>{{title}}</h2>
    <main>{{content}}</main>
  </div>
</template>

<script>
  export default ($template) => $template
    .vm(() => {
      return {
        title: '组件标题',
        content: '组件内容',
      }
    })
</script>
```

template上的`hoist`表示组件将作为hoist组件，最终渲染结果中，直接用模板内容替换组件标签。如果传入hoist，那么内部只允许一个顶层标签。*注意，`template`上的`hoist`属性仅在loader编译系统中有用，在运行时定义组件时无效。*

将这个htm/html文件放置在你的项目目录下，然后在webpack中如下使用：

```
{
  module: {
    rules: [
      {
        test: /\.html$/,
        resourceQuery: /jqvm/, // 可选的，当你使用这个规则，那么只有 import .. from './some.html?jqvm' 才走jqvm/loader编译
        use: [
          {
            loader: 'babel-loader', // 这个loader的功能很简单，就是把一个html文件解析出来之后，编译为一个ESModule，这个ESModule就是一个jqvm的组件，再交给babel去进行编译。
          },
          {
            loader: 'jqvm/loader', // jqvm-loader的位置在jqvm包下面
            options: {
              $: true, // 可选，如果$为true，那么生成的组件代码中，不会引入jquery和jqvm，直接使用全局的$对象，如果传入一个字符串，比如'jQuery'，那么会用这个字符串作为全局变量赋值给$作为jquery的引用
            },
          },
        ],
      }
    ]
  }
}
```

你可以通过webpack的能力如下实施：

```js
import { createAsyncComponent } from 'jqvm'
const SomeComponent = createAsyncComponent(() => import('./components/some-component.html'))
```

这样既可以在html中撰写一个组件，同时又可以把这个组件代码拆分出去。
如果你不想使用webpack，而是想把html编译成独立的js文件，可以这样：

```js
const { compile } = require('jqvm/loader')
const content = compile(fs.readFileSync(__dirname + '/component.html'), options) // options.$ = false|true|'jQuery'
fs.writeFileSync(.., content)
```

这样就可以获得一个独立的js文件了。

## 路由

```js
const { createRouter } = window.jqvm
const router = createRouter({ mode: 'history' })

$(`
  <template>
    <div jq-route="'/'">
      home
      <a href="/admin?id={{$route.params.id}}" jq-navigate>admin</a>
    </div>
    <div jq-route="/^\/admin\?id=\d+/">
      admin
      <a jq-navigate="back">back</a>
    </div>
  </template>
`).vm({})
  .plugin(router) // <-- 以插件的形式挂载路由
  .mount('#app')
```

注意点：

- `createRouter({ mode: 'history' | 'hash', baseUri: '/xxx' })` mode 默认是 hash，可以都不传
- `view.plugin(router)`
- `{{$route.params.id}}` state上会多出一个$route，可以在视图内使用
- `jq-route="exp"` 用于匹配路由的指令，由于它是表达式，因此你可以传入正则表达式进行匹配
- `jq-navigate` 用于规定跳转方法的指令，只能作用于a标签上，可选方法有：`push | replace | open | back | forward` 默认是 `push`
- `this.$router` view上会多出一个$router，用于在视图内的函数里面读取当前router
- `.on('$route', (state, url) => ...)` 监听 `$route` 事件来感知路由变化

对于`this.$router`，它拥有以下方法：

- getUrl(): string 获取当前路由指向的url
- getLocation(): { pathname: string, search: string, params: object } 其中params是对search解析后得到的对象
- setParams(params): void 调整当前search参数，没有涉及的不发生任何变化
- isMatch(regexp): boolean 用于判断当前路由的url是否匹配某个路径
- navigate(type: push | replace | open | back | forward, to: string): void 导航到一个新地址

我们提供的是及其微小的路由导航系统，没有复杂的逻辑，也没有考虑复杂的url设计，只提供了通过search部分来传参，如果你想要传递某些对象的id，必须通过search部分传递。

## :see_no_evil: 开源协议

MIT.

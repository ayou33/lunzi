/**
 * File: DemoApplication.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/17 15:43
 */
import Application from '../Application'
import { createEffect } from '../reactive'

const kernel = {
  render (dom: string, Component: any) {
    document.querySelector(dom)!.innerHTML = Component()
  },
}

const router = {
  push (path: string) {
    console.log(path)
  }
}

export default class DemoApplication<K extends typeof kernel, R extends typeof router, I> extends Application<K, R, I> implements Application<K, R, I> {
  async start (beforeStart?: () => void) {
    await beforeStart?.()
    this.kernel.render('#app', APP)
  }
  
  readonly flags = {
    ...super.flags,
  }
  
  ready () {}
}

const app = new DemoApplication(kernel, router)

createEffect(() => {
  if (app.logged()) {
    app.router!.push('/')
  } else {
    app.router!.push('/login')
  }
})

// 模拟
function onMounted (fn: () => void) {
  fn()
}

function APP () {
  onMounted(() => {
    app.ready()
  })
  
  return `<div>App</div>`
}

function check () {
}

app.start(async function () {
  await check()
})

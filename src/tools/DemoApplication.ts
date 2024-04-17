/**
 * File: DemoApplication.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/17 15:43
 */
import Application from '../Application'

function APP () {
  return `<div>App</div>`
}

const kernel = {
  render (dom: string, Component: any) {
    document.querySelector(dom)!.innerHTML = Component()
  },
}

export default class DemoApplication<K extends typeof kernel, R, I> extends Application<K, R, I> implements Application<K, R, I> {
  async start (beforeStart?: () => void) {
    await beforeStart?.()
    this.kernel.render('#app', APP)
  }
}

const app = new DemoApplication(kernel)

function checkVersion () {
}

function checkBlackList () {
}

function anyOtherCheck () {
}

app.start(async function () {
  await checkVersion()
  await checkBlackList()
  await anyOtherCheck()
})

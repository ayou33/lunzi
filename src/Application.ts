/**
 * File: Application.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/16 10:33
 */
enum Mode {
  GUEST,
  USER,
  REVIEWER,
  MANAGER,
}

export default abstract class Application<K, R, I> {
  readonly kernel: K
  readonly router?: R
  readonly i18n?: I
  mode: Mode = Mode.USER
  
  protected constructor (kernel: K, router?: R, i18n?: I) {
    this.kernel = kernel
    this.router = router
    this.i18n = i18n
  }
  
  static isDev () {
    return process.env.NODE_ENV === 'development'
  }
  
  static isTest () {
    return process.env.NODE_ENV === 'test'
  }
  
  static isPreview () {
    return process.env.NODE_ENV === 'preview'
  }
  
  createSignal () {}
  
  createEffect () {}
  
  static isProd () {
    return process.env.NODE_ENV === 'production'
  }
  
  abstract start (beforeStart?: () => Promise<boolean>): void
}

class MyApplication<K, R, I> extends Application<K, R, I> implements Application<K, R, I> {
  constructor (kernel: K, router: R, i18n: I) {
    super(kernel, router, i18n)
    
    this.mode = Mode.USER
  }
  
  start () {}
}

const app = new MyApplication({}, {}, {})

app.start()

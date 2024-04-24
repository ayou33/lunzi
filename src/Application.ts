/**
 * File: Application.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/16 10:33
 */
import { createSignal } from './reactive'

export enum Mode {
  GUEST,
  USER,
  REVIEWER,
  MANAGER,
}

function isMobile () {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)
}

export default abstract class Application<K, R, I> {
  readonly href: string
  
  readonly kernel: K
  readonly router?: R
  readonly i18n?: I
  
  readonly logged: () => boolean
  readonly login: () => void
  readonly logout: () => void
  
  readonly mode: () => Mode
  readonly setMode: (mode: Mode) => void
  
  flags = {
    get isDev () {
      return process.env.NODE_ENV === 'development'
    },
    get isTest () {
      return process.env.NODE_ENV === 'test'
    },
    get isPreview () {
      return process.env.NODE_ENV === 'preview'
    },
    get isProd () {
      return process.env.NODE_ENV === 'production'
    },
    get isAndroid () {
      return /Android/i.test(navigator.userAgent)
    },
    get isIOS () {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    },
    get isMobile () {
      return isMobile()
    },
    get isPC () {
      return !isMobile()
    },
  }
  
  constructor (kernel: K, router?: R, i18n?: I) {
    this.href = location.href
    this.kernel = kernel
    this.router = router
    this.i18n = i18n
    
    const [mode, setMode] = createSignal(Mode.GUEST)
    this.mode = mode
    this.setMode = setMode
    
    const [logged, setLogged] = createSignal(false)
    this.logged = logged
    this.login = () => setLogged(true)
    this.logout = () => setLogged(false)
  }
  
  abstract start (beforeStart?: () => void): void
}

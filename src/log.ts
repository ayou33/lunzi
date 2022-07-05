/*
 * @Author: 阿佑[ayooooo@petalmail.com] 
 * @Date: 2022-07-05 10:19:01 
 * @Last Modified by: 阿佑
 * @Last Modified time: 2022-07-05 15:28:51
 */
interface Printer {
  (...args: any[]): void;
  warn (...args: any[]): void;
  error (...args: any[]): void;
  badge (badge: string, style?: string): void;
  if (pred: () => boolean): void;
}

function createPrinter (log: Log): Printer {
  const context = log

  let badge = ''
  let style = ''
  let pred = () => true

  function print (method: 'log' | 'warn' | 'error', ...args: any[]) {
    if (context.isEnable() && context.isMatch(badge, args.toString()) && pred()) {
      if (badge.trim()) {
        console[method](`%c${badge}`, style, ...args)
        context.report(method, badge, ...args)
      } else {
        console[method](...args)
        context.report(method, ...args)
      }
    }
  }

  function printer (...args: any[]) {
    print('log', ...args)
  }

  printer.warn = (...args: any[]) => print('warn', ...args)

  printer.error = (...args: any[]) => print('error', ...args)

  printer.badge = (name: string, cssText = '') => {
    badge = name
    style = cssText
  }

  printer.if = (predFn: () => boolean) => {
    pred = predFn
  }

  return printer
}

class Log {
  #available = true
  #pred: () => boolean = () => true
  #pattern: RegExp = /.*/
  #badgeParttern: RegExp = /.*/
  #callback: null | ((...args: any[]) => void) = null

  on () {
    this.#available = true
  }

  off () {
    this.#available = false
  }

  if (pred: () => boolean) {
    this.#pred = pred
  }

  isEnable () {
    return this.#available && this.#pred()
  }

  filter (pattern: RegExp) {
    this.#pattern = pattern
  }

  fitlerBadge (pattern: RegExp) {
    this.#badgeParttern = pattern
  }

  isMatch (badge: string, text: string) {
    return this.#badgeParttern.test(badge) && this.#pattern.test(text)
  }

  create (cb?: (...args: any[]) => void) {
    if ('function' === typeof cb) this.#callback = cb

    return createPrinter(this)
  }

  report (method: string, ...args: any[]) {
    this.#callback?.(method, ...args)
  }
}

const log = new Log()

export const create = log.create

export default log

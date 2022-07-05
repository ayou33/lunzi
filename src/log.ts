/*
 * @Author: 阿佑[ayooooo@petalmail.com] 
 * @Date: 2022-07-05 10:19:01 
 * @Last Modified by: 阿佑
 * @Last Modified time: 2022-07-05 18:57:38
 */
interface Printer {
  (...args: any[]): void;
  warn (...args: any[]): void;
  error (...args: any[]): void;
  badge (badge: string, style?: string): void;
  if (pred: any): (...args: any[]) => void;
}

function createPrinter (log: Log, name?: string, cssText?: string): Printer {
  const context = log

  let badge = name ?? ''
  let style = cssText ?? ''

  function print (method: 'log' | 'warn' | 'error', ...args: any[]) {
    if (context.isEnable() && context.isMatch(badge, args.toString())) {
      if (badge.trim()) {
        console[method](`%c${badge}`, style, ...args)
        context.report(method, badge, ...args)
      } else {
        console[method](...args)
        context.report(method, ...args)
      }
    }
  }

  function output (...args: any[]) {
    print('log', ...args)
  }

  output.warn = (...args: any[]) => print('warn', ...args)

  output.error = (...args: any[]) => print('error', ...args)

  output.badge = (name: string, cssText = '') => {
    badge = name

    if (undefined !== cssText) {
      style = cssText
    }

    return output
  }

  output.if = (mix: any) => {
    return (...args: any[]) => {
      const result = 'function' === typeof mix ? mix() : Boolean(mix)
      if (result) {
        return output(...args)
      }
    }
  }

  return output
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

  create (badge?: string, style?: string) {
    return createPrinter(this, badge, style)
  }

  report (method: string, ...args: any[]) {
    this.#callback?.(method, ...args)
  }

  bindCallback (cb: ((...args: any[]) => void) | null) {
    this.#callback = cb
  }
}

const log = new Log()

export const create = log.create.bind(log)

export default log

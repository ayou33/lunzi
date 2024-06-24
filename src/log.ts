/*
 * @Author: 阿佑[ayooooo@petalmail.com]
 * @Date: 2022-07-05 10:19:01
 * @Last Modified by: 阿佑
 * @Last Modified time: 2022-07-07 18:50:14
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
        console[method](`%c<${badge}>`, style, ...args)
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
  
  /**
   * 单次日志过滤
   * @param mix
   */
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
  private _available = true
  private _pred: () => boolean = () => true
  private _pattern: RegExp = /.*/
  private _badgePattern: RegExp = /.*/
  private _callback: null | ((...args: any[]) => void) = null
  
  /**
   * 日志打开
   */
  on () {
    this._available = true
  }
  
  /**
   * 日志关闭
   */
  off () {
    this._available = false
  }
  
  /**
   * 日志按逻辑打开/关闭
   * @param pred
   */
  if (pred: () => boolean) {
    this._pred = pred
  }
  
  /**
   * 检查日志是否打开状态
   */
  isEnable () {
    return this._available && this._pred()
  }
  
  /**
   * 过滤日志输出内容
   * @param pattern
   */
  filter (pattern: RegExp) {
    this._pattern = pattern
  }
  
  /**
   * 过滤日志badge
   * @param pattern
   */
  filterBadge (pattern: RegExp) {
    this._badgePattern = pattern
  }
  
  /**
   * 执行过滤条件
   * @param badge
   * @param text
   */
  isMatch (badge: string, text: string) {
    return this._badgePattern.test(badge) && this._pattern.test(text)
  }
  
  /**
   * 创建新的日志对象
   * @param badge
   * @param style
   */
  create (badge?: string, style?: string) {
    return createPrinter(this, badge, style)
  }
  
  /**
   * 关注日志打印
   * @param method
   * @param args
   */
  report (method: string, ...args: any[]) {
    this._callback?.(method, ...args)
  }
  
  /**
   * 响应日志打印
   * @param cb
   */
  bindCallback (cb: ((...args: any[]) => void) | null) {
    this._callback = cb
  }
}

export const log = new Log()

export const create = log.create.bind(log)

export default log

export const _ = {
  _: '_',
}

function isPlaceholder (a: any) {
  return a === _ && a._ === _._ 
}

type AnyFunction = (...args: any[]) => any

/**
 * 
 * @param required 本次柯里化需要的实参数量
 * @param receieved 本次传入的实参
 * @param fn 柯里化函数对象
 * @returns 
 */
function _curryN (required: number, receieved: any[], fn: AnyFunction): AnyFunction {
  return function () {
    /**
     * 该数组中可能存在placeholder元素
     */
    const combind: any[] = []

    let left = required
    let combindIndex = 0
    let argIndex = 0

    while (combindIndex < receieved.length || argIndex < arguments.length) {
      let argument: any

      /**
       * 利用arguments替换received中的placeholder
       */
      if (
        combindIndex < receieved.length &&
        (!isPlaceholder(receieved[combindIndex]) || argIndex >= arguments.length)
      ) {
        argument = receieved[combindIndex]
      } else {
        argument = arguments[argIndex]
        argIndex++
      }

      combind[combindIndex] = argument

      if (!isPlaceholder(argument)) {
        left--
      }

      combindIndex++
    }

    if (left <= 0) return fn(...combind)
    return _curryN(required, combind, fn)
  }
}

export const curryN = _curryN(2, [], (required: number, fn: AnyFunction) => _curryN(required, [], fn))

function curry (fn: AnyFunction) {
  return _curryN(fn.length, [], fn)
}

export default curry

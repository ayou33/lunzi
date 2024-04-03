export const _ = {
  _: '_',
}

function isPlaceholder (a: { _?: string }) {
  return a === _ && a._ === _._
}

type AnyFunction = (...args: any[]) => any

/**
 *
 * @param required 本次柯里化需要的实参数量
 * @param received 本次传入的实参
 * @param fn 柯里化函数对象
 * @returns
 */
function _curryN (required: number, received: any[], fn: AnyFunction): AnyFunction {
  return function () {
    /**
     * 该数组中可能存在placeholder元素
     */
    const combined: any[] = []

    let left = required
    let combinedIndex = 0
    let argIndex = 0

    while (combinedIndex < received.length || argIndex < arguments.length) {
      let argument: any

      /**
       * 利用arguments替换received中的placeholder
       */
      if (
        combinedIndex < received.length &&
        (!isPlaceholder(received[combinedIndex]) || argIndex >= arguments.length)
      ) {
        argument = received[combinedIndex]
      } else {
        argument = arguments[argIndex]
        argIndex++
      }

      combined[combinedIndex] = argument

      if (!isPlaceholder(argument)) {
        left--
      }

      combinedIndex++
    }

    if (left <= 0) return fn(...combined)
    return _curryN(required, combined, fn)
  }
}

export const curryN = _curryN(2, [], (required: number, fn: AnyFunction) => _curryN(required, [], fn))

export function curry (fn: AnyFunction) {
  return _curryN(fn.length, [], fn)
}

export default curry

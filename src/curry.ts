export const _ = {
  _: '_',
}

/**
 * Returns true only for the unique `_` placeholder sentinel.
 * Using `unknown` + type predicate avoids accepting arbitrary objects.
 */
function isPlaceholder (a: unknown): a is typeof _ {
  return a === _
}

type AnyFunction = (...args: any[]) => any

/**
 * Core recursive curry implementation.
 *
 * @param required  Number of non-placeholder arguments still needed before
 *                  the wrapped function can be invoked.
 * @param fn        The original function to curry.
 * @param received  Arguments accumulated so far (may contain placeholders).
 */
function _curryN (required: number, fn: AnyFunction, received: any[] = []): AnyFunction {
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
    return _curryN(required, fn, combined)
  }
}

export const curryN = _curryN(2, (required: number, fn: AnyFunction) => _curryN(required, fn))

export function curry (fn: AnyFunction) {
  return _curryN(fn.length, fn)
}

export default curry

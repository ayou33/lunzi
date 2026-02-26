/**
 * File: controlledPromise.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/8 14:29
 */
export function controlledPromise<T> (
  executor?: (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: string | Error) => void,
  ) => void,
  controller?: AbortController,
) {
  const ctrl = controller ?? new AbortController()
  
  const promise = new Promise<T>((resolve, reject) => {
    // If the controller was already aborted before this promise was created,
    // the 'abort' event will never fire — reject eagerly in that case.
    if (ctrl.signal.aborted) {
      reject(new Error('Promise aborted'))
      return
    }

    // { once: true } automatically removes the listener after it fires,
    // so no manual removeEventListener is needed.
    ctrl.signal.addEventListener(
      'abort',
      () => reject(new Error('Promise aborted')),
      { once: true },
    )

    executor?.(resolve, reject)
  })
  
  function abort () {
    ctrl.abort()
  }
  
  return [promise, abort] as const
}

export default controlledPromise

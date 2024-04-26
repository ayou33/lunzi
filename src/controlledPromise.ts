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
    ctrl.signal.addEventListener('abort', () => {
      reject(new Error('Promise aborted'))
    })
    
    executor?.(resolve, reject)
  })
  
  function abort () {
    ctrl.abort()
  }
  
  return [promise, abort] as const
}

export default controlledPromise

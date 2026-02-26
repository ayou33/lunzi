/**
 * File: controlledPromise.test.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/8 17:20
 */
import controlledPromise from '../src/controlledPromise'

describe('controlledPromise', () => {
  it('should be a function', () => {
    expect(controlledPromise).toBeInstanceOf(Function)
  })
  
  it('should return a promise', () => {
    const [promise] = controlledPromise()
    expect(promise).toBeInstanceOf(Promise)
  })
  
  it('should resolve with the value passed to the resolve function', async () => {
    const value = 'value'
    const [promise] = controlledPromise(resolve => {
      resolve(value)
    })
    const result = await promise
    expect(result).toBe(value)
  })
  
  it('should reject with the value passed to the reject function', async () => {
    const value = 'value'
    const [promise] = controlledPromise((_, reject) => {
      reject(value)
    })
    try {
      await promise
    } catch (error) {
      expect(error).toBe(value)
    }
  })
  
  it('should be able to resolve after a delay', async () => {
    const value = 'value'
    const [promise] = controlledPromise(resolve => {
      setTimeout(() => {
        resolve(value)
      }, 100)
    })
    const result = await promise
    expect(result).toBe(value)
  })
  
  it('should be able to reject after a delay', async () => {
    const value = 'value'
    const [promise] = controlledPromise((_, reject) => {
      setTimeout(() => {
        reject(value)
      }, 100)
    })
    try {
      await promise
    } catch (error) {
      expect(error).toBe(value)
    }
  })
  
  it('should not be able to resolve multiple times', async () => {
    const value1 = 'value1'
    const value2 = 'value2'
    const [promise] = controlledPromise(resolve => {
      resolve(value1)
      resolve(value2)
    })
    const result = await promise
    expect(result).toBe(value1)
  })
  
  it('should not be able to reject multiple times', async () => {
    const value1 = 'value1'
    const value2 = 'value2'
    const [promise] = controlledPromise((_, reject) => {
      reject(value1)
      reject(value2)
    })
    try {
      await promise
    } catch (error) {
      expect(error).toBe(value1)
    }
  })
  
  it('should be able to resolve and reject', async () => {
    const value1 = 'value1'
    const value2 = 'value2'
    const [promise] = controlledPromise((resolve, reject) => {
      resolve(value1)
      reject(value2)
    })
    const result = await promise
    expect(result).toBe(value1)
  })
  
  it('should be able to abort the promise', async () => {
    const value = 'value'
    const [promise, abort] = controlledPromise(resolve => {
      setTimeout(() => {
        resolve(value)
      }, 100)
    })
    abort()
    try {
      await promise
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('Promise aborted')
    }
  })

  it('should work without an executor (stays pending until aborted)', async () => {
    const [promise, abort] = controlledPromise()
    const settled = jest.fn()
    promise.catch(settled)
    // Not yet settled
    expect(settled).not.toHaveBeenCalled()
    abort()
    await promise.catch(() => {})
    expect(settled).toHaveBeenCalledTimes(1)
  })

  it('should accept an external AbortController', async () => {
    const controller = new AbortController()
    const [promise] = controlledPromise(resolve => {
      setTimeout(() => resolve('late'), 100)
    }, controller)
    controller.abort()
    await expect(promise).rejects.toThrow('Promise aborted')
  })

  it('should reject immediately when a pre-aborted controller is passed', async () => {
    const controller = new AbortController()
    controller.abort()
    const [promise] = controlledPromise<string>(resolve => {
      setTimeout(() => resolve('late'), 100)
    }, controller)
    await expect(promise).rejects.toThrow('Promise aborted')
  })

  it('should be safe to call abort multiple times', async () => {
    const [promise, abort] = controlledPromise()
    abort()
    // Second call must not throw
    expect(() => abort()).not.toThrow()
    await promise.catch(() => {})
  })
})

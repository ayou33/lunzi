/**
 * File: fetch.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/7 18:46
 */
jest.mock('axios', () => {
  function fn (options: { signal: AbortSignal }) {
    return new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        reject(new Error('abort'))
      })
      
      setTimeout(() => {
        resolve(true)
      }, 1000)
    })
  }
  
  fn.interceptors = {
    request: {
      use: jest.fn(),
    },
  }
  
  return fn
})

import { get, cancel } from '../../src/tools/fetch.axios'

const getLocal = get('/api/test', {
  id: 'get',
})

describe('fetch', () => {
  afterAll(() => {
    jest.clearAllMocks()
  })
  
  test('should get request can be abort', () => {
    const cb = jest.fn()
    const ecb = jest.fn()
    
    const p = getLocal()
      .then(cb)
      .catch(ecb)
      .finally(() => {
        expect(cb).not.toBeCalled()
        expect(ecb).toBeCalledTimes(1)
        expect(ecb.mock.lastCall[0].message).toBe('abort')
      })
    
    cancel('get')
    
    return p
  })
})

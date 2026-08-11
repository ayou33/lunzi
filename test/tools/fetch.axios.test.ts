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
        resolve({ data: { ok: 1 } })
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

import axios from 'axios'
import { get, post, cancel, configFetchAxios } from '../../src/tools/fetch.axios'

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
        expect(ecb.mock.lastCall[0].message).toBe('Request aborted')
      })
    
    cancel('get')
    
    return p
  })
})

// ─── configFetchAxios（_t 时间戳可配置） ─────────────────────────────────────

describe('configFetchAxios', () => {
  // 模块导入时注册的请求拦截器
  const requestInterceptor = (axios.interceptors.request.use as jest.Mock).mock.calls[0][0] as (config: Record<string, any>) => any

  afterEach(() => {
    configFetchAxios({ cacheBust: true })
  })

  test('默认给 GET 请求追加 _t 时间戳', () => {
    const cfg = requestInterceptor({ method: 'get', params: { a: 1 } })
    expect(cfg.params._t).toBeDefined()
    expect(cfg.params.a).toBe(1)
  })

  test('默认给 POST 请求追加 _t 字段', () => {
    const cfg = requestInterceptor({ method: 'post', data: { b: 2 } })
    expect(cfg.data._t).toBeDefined()
    expect(cfg.data.b).toBe(2)
  })

  test('非 GET/POST 方法不追加 _t', () => {
    const cfg = requestInterceptor({ method: 'delete', params: { a: 1 } })
    expect(cfg.params).toEqual({ a: 1 })
  })

  test('cacheBust: false 时不追加 _t', () => {
    configFetchAxios({ cacheBust: false })
    const cfg = requestInterceptor({ method: 'get', params: { a: 1 } })
    expect(cfg.params).toEqual({ a: 1 })
  })

  test('configFetchAxios 返回当前配置', () => {
    expect(configFetchAxios({ cacheBust: true })).toEqual({ cacheBust: true })
  })
})
describe('receive / get 解析', () => {
  test('get 请求走 axios 并解析 resp.data（默认解析器）', async () => {
    const result = await get('/api/ok')()
    expect(result).toEqual({ ok: 1 })
  })

  test('post 请求走 axios 并解析 resp.data', async () => {
    const result = await post('/api/post')()
    expect(result).toEqual({ ok: 1 })
  })

  test('自定义解析器替换默认 dftParser', async () => {
    const { receive } = await import('../../src/tools/fetch.axios')
    const request = jest.fn().mockResolvedValue({ data: { n: 7 }, status: 200 })
    const getCustom = receive(request)('/api/custom')
    const result = await getCustom()
    expect(result).toEqual({ n: 7 })
  })
})
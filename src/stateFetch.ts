/**
 * File: xhr.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/7 15:15
 */
import stateQueue from './stateQueue'

type Data = Record<string, unknown>

type XHR = {
  following?: Array<(err: Error | null, resp?: unknown) => void>
  abort: () => void
}

export type StateFetchConfig = {
  id?: string; // for cancel control
  label?: string; // for batch cancel control
  priority?: number; // for queue order control
  expireIn?: number; // for cache control; cache duration(ms)
}

type StateConfig = {
  url: string; // for repeat control
  data?: Data // optional for repeat control
} & StateFetchConfig

/**
 * 利用url和data来生成唯一的请求id
 * @param config
 */
function parseRequestId (config: StateConfig) {
  const searchParams = new URLSearchParams(config.data as Record<string, string>)
  searchParams.sort()
  return config.url + searchParams.toString()
}

export default function stateFetch (parallel = 3) {
  const queue = stateQueue(parallel)
  const running = new Map<string, XHR>()
  const cache = new Map<string, {
    expires: number
    resp: unknown | null
  }>()
  
  function send<T, C extends StateConfig> (fetch: (config: C) => Promise<T>, config: C) {
    return new Promise<T>((resolve, reject) => {
      const requestId = parseRequestId(config)
      
      if (!requestId) return reject(new Error('Invalid request url'))
      
      queue.enqueue({
        id: config.id,
        label: config.label,
        priority: config.priority,
        run: controller => {
          if (running.has(requestId)) {
            if (!running.get(requestId)!.following) running.get(requestId)!.following = []
            
            running.get(requestId)!.following!.push((err, resp) => {
              if (err) reject(err)
              else resolve(resp as T)
            })
            
            return
          }
          
          if (cache.has(requestId)) {
            const { expires, resp } = cache.get(requestId)!
            // 缓存命中 直接返回
            if (resp && Date.now() < expires) {
              return resolve(resp as T)
            }
          }
          
          return fetch({
            ...config,
            signal: controller.signal,
          })
            .then(resp => {
              resolve(resp)
              running.get(requestId)?.following?.forEach(cb => cb(null, resp))
              
              // 复写缓存
              if (config.expireIn) {
                cache.set(requestId, {
                  expires: Date.now() + config.expireIn,
                  resp,
                })
              }
            })
            .catch((err) => {
              reject(err)
              running.get(requestId)?.following?.forEach(cb => cb(err))
            })
            .finally(() => {
              running.delete(requestId)
            })
        },
      })
    })
  }
  
  function cancel (idOrLabel: string | string[]) {
    queue.cancel(idOrLabel)
  }
  
  return {
    send,
    cancel,
    on: queue.on,
  }
}

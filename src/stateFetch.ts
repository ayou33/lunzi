/**
 * File: xhr.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/7 15:15
 */
import { create } from './log'
import stateQueue from './stateQueue'

type Data = Record<string, unknown>

type Following = Array<(err: Error | null, resp?: unknown) => void>

const log = create('stateFetch')

export type StateFetchConfig = {
  id?: string; // for cancel control
  label?: string; // for batch cancel control
  priority?: number; // for queue order control
  expireIn?: number; // for cache control; cache duration(ms)
  individual?: boolean; // for repeat control
}

type StateConfig = {
  url: string; // for repeat control
  data?: Data; // optional for repeat control
} & StateFetchConfig

/**
 * 利用url和data来生成唯一的请求id。
 * data的值统一序列化为JSON字符串，以确保数字、布尔值和对象产生明确且稳定的key。
 * @param config
 */
function parseRequestId (config: StateConfig): string {
  if (!config.url) return ''
  if (!config.data) return config.url
  // Sort keys for a deterministic ID regardless of insertion order.
  const params = new URLSearchParams(
    Object.keys(config.data)
      .sort()
      .map(k => [k, JSON.stringify(config.data![k])]),
  )
  return config.url + '?' + params.toString()
}

export function stateFetch (parallel = 3) {
  const queue = stateQueue(parallel)
  /**
   * requestId相同的请求会被合并处理
   */
  const processing = new Map<string, Following>()
  const cache = new Map<string, {
    expires: number
    resp: unknown | null
  }>()
  
  function respond (requestId: string, error: Error | null = null, result?: unknown) {
    processing.get(requestId)?.forEach(cb => cb(error, result))
    processing.delete(requestId)
  }
  
  function send<T, C extends StateConfig> (fetch: (config: C) => Promise<T>, config: C) {
    return new Promise<T>((resolve, reject) => {
      const requestId = parseRequestId(config)

      if (!requestId) return reject(new Error('Invalid request url'))

      // settled flag shared between the abort handler and the fetch callbacks
      // so that only the first settlement wins (avoids double-rejection).
      let settled = false

      const taskId = queue.enqueue({
        id: config.id,
        label: config.label,
        priority: config.priority,
        run: controller => {
          // Register the abort listener as soon as the task starts running.
          // For tasks that are cancelled *before* they start, the controller is
          // aborted by stateQueue.cancel() and the pre-registered listener
          // below (attached after enqueue) handles the rejection.
          controller.signal.addEventListener('abort', onAbort, { once: true })

          log('run task', requestId)
          if (!config.individual) {
            if (processing.has(requestId)) {
              processing.get(requestId)!.push((err, resp) => {
                if (err) reject(err)
                else resolve(resp as T)
              })

              return
            } else {
              processing.set(requestId, [])
            }
          }

          if (cache.has(requestId)) {
            const { expires, resp } = cache.get(requestId)!
            // 缓存命中 直接返回
            if (resp && Date.now() < expires) {
              settled = true
              controller.signal.removeEventListener('abort', onAbort)
              respond(requestId, null, resp)
              return resolve(resp as T)
            }
          }

          return fetch({
            ...config,
            signal: controller.signal,
          })
            .then(resp => {
              settled = true
              controller.signal.removeEventListener('abort', onAbort)
              resolve(resp)
              respond(requestId, null, resp)

              // 复写缓存
              if (config.expireIn) {
                cache.set(requestId, {
                  expires: Date.now() + config.expireIn,
                  resp,
                })
              }
            })
            .catch((err) => {
              settled = true
              controller.signal.removeEventListener('abort', onAbort)
              reject(err)
              respond(requestId, err)
            })
        },
      })

      // Obtain the controller for the enqueued task so we can register the
      // abort listener eagerly — this covers the case where the task is
      // cancelled while still waiting in the queue (run() is never called).
      const taskController = queue.getTasks().find(t => t.id === taskId)?.controller
        ?? queue.getRunningTasks().find(t => t.id === taskId)?.controller

      function onAbort () {
        log('abort task', requestId)
        if (settled) return
        settled = true
        const error = new Error('Request aborted')
        reject(error)
        respond(requestId, error)
      }

      if (taskController) {
        // If already aborted (pre-aborted controller edge case), fire immediately.
        if (taskController.signal.aborted) {
          onAbort()
        } else {
          taskController.signal.addEventListener('abort', onAbort, { once: true })
        }
      }
    })
  }
  
  function cancel (idOrLabel: string | string[], reason?: string) {
    queue.cancel(idOrLabel, reason)
  }
  
  return {
    send,
    cancel,
    on: queue.on,
  }
}

export default stateFetch

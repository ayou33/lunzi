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

export type StateFetchOptions = {
  /** Max cache entries; the least-recently-used entry is evicted when exceeded */
  maxCacheSize?: number
  /** Interval in ms to clean up expired cache entries, 0 to disable auto cleanup */
  cleanupInterval?: number
  /** Enable auto cleanup (default: true) */
  autoCleanup?: boolean
}

export function stateFetch (parallel = 3, options: StateFetchOptions = {}) {
  const {
    maxCacheSize = 1000,
    cleanupInterval = 60000,
    autoCleanup = true,
  } = options

  const queue = stateQueue(parallel)
  /**
   * requestId相同的请求会被合并处理
   */
  const processing = new Map<string, Following>()
  const cache = new Map<string, {
    expires: number
    resp: unknown | null
  }>()

  /** Cleanup timer for expired cache entries */
  let cleanupTimer: ReturnType<typeof setInterval> | null = null

  /**
   * Cleanup expired cache entries
   */
  function cleanupExpiredCache () {
    const now = Date.now()
    for (const [key, value] of cache) {
      if (now >= value.expires) {
        cache.delete(key)
      }
    }
  }

  /**
   * Enforce the cache size limit using LRU eviction. The Map preserves
   * insertion order and send() refreshes recency on every cache hit, so
   * evicting from the head removes the least-recently-used entries.
   */
  function enforceCacheLimit () {
    if (cache.size <= maxCacheSize) return

    const entriesToRemove = cache.size - maxCacheSize
    const keys = cache.keys()
    for (let i = 0; i < entriesToRemove; i++) {
      const key = keys.next().value
      if (key !== undefined) {
        cache.delete(key)
      }
    }
  }

  function respond (requestId: string, error: Error | null = null, result?: unknown) {
    processing.get(requestId)?.forEach(cb => cb(error, result))
    processing.delete(requestId)
  }

  /**
   * Start the cleanup timer lazily after the first cache write.
   */
  function startCleanupTimer () {
    if (cleanupTimer === null && cleanupInterval > 0 && autoCleanup) {
      cleanupTimer = setInterval(cleanupExpiredCache, cleanupInterval)
      // Don't block process exit in Node.js environments
      if (typeof cleanupTimer.unref === 'function') {
        cleanupTimer.unref()
      }
    }
  }

  /**
   * Stop the cleanup timer.
   */
  function stopCleanupTimer () {
    if (cleanupTimer !== null) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
    }
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
              // Refresh recency so LRU eviction keeps recently used entries
              cache.delete(requestId)
              cache.set(requestId, { expires, resp })
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
                enforceCacheLimit()
                startCleanupTimer()
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
      const taskController = queue.getTask(taskId)?.controller

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

  function clearCache (urlPrefix?: string) {
    if (urlPrefix) {
      for (const key of cache.keys()) {
        if (key.startsWith(urlPrefix)) cache.delete(key)
      }
    } else {
      cache.clear()
    }
  }

  /**
   * Destroy the stateFetch instance, cleaning up all resources.
   */
  function destroy () {
    stopCleanupTimer()
    cache.clear()
    queue.destroy()
  }

  return {
    send,
    cancel,
    clearCache,
    destroy,
    on: queue.on,
  }
}

export default stateFetch

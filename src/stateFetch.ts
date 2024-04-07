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

function parseRequestId (config: { url: string; data?: Data }) {
  return (config.url)
}

export default function stateFetch (parallel = 3) {
  const labels = new Map<Symbol, string>()
  const queue = stateQueue(parallel)
  const running = new Map<string, XHR>()
  
  function isRepeatRequest (id: string) {
    return running.has(id)
  }
  
  function send<T, C extends { url: string, data?: Data }> (fetch: (config: C) => Promise<T>, config: C) {
    return new Promise<T>((resolve, reject) => {
      queue.enqueue(() => {
        const id = parseRequestId(config)
        
        if (isRepeatRequest(id)) {
          (running.get(id)?.following ?? []).push((err, resp) => {
            if (err) reject(err)
            else resolve(resp as T)
          })
          return
        }
        
        const controller = new AbortController()
        
        running.set(id, {
          abort: controller.abort,
        })
        
        return fetch({
          ...config,
          signal: controller.signal,
        })
          .then(resp => {
            resolve(resp)
            running.get(id)?.following?.forEach(cb => cb(null, resp))
          })
          .catch((err) => {
            reject(err)
            running.get(id)?.following?.forEach(cb => cb(err))
          })
          .finally(() => {
            running.delete(id)
          })
      })
    })
  }
  
  function cancel (label: Symbol) {
    const labelValue = labels.get(label)
    
    if (labelValue) {
      labels.delete(label)
      queue.cancel(labelValue)
    }
  }
  
  return {
    send,
    cancel,
  }
}

export type EventName<T extends string = string> = T | T[]

export type EventType = {
  name: string;
  type: string;
}

/**
 * 解析事件名字符串，支持多事件和命名空间
 * @param name 事件名或事件名数组
 * @returns 解析后的事件类型数组
 */
export function parseEventName (name: EventName): EventType[] {
  if (!name) return []
  
  if (Array.isArray(name)) {
    return name.flatMap(n => parseEventName(n))
  }
  
  const trimmedName = name.trim()
  if (!trimmedName) return []
  
  return trimmedName
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(n => {
      const parts = n.split('.').map(s => s.trim()).filter(Boolean)
      if (parts.length === 0) return []
      
      const [eventName, ...types] = parts
      if (!eventName) return []
      
      if (types.length === 0) {
        return [{ name: eventName, type: '' }]
      }
      return types.map(type => ({ name: eventName, type }))
    })
}

/**
 * 使用事件名执行回调函数
 * @param event 事件名
 * @param use 回调函数
 */
export function useEventName (event: EventName, use: (name: string, type: string) => void): void {
  if (!event || !use) return
  
  parseEventName(event).forEach(eventType => {
    if (eventType.name) {
      try {
        use(eventType.name, eventType.type)
      } catch (error) {
        console.error('Error in useEventName callback:', error)
      }
    }
  })
}

export type EventListener = (e: Event, ...dataSet: any[]) => void

export type EventOptions = AddEventListenerOptions & {
  priority?: number; // 事件优先级，数值越大优先级越高
} | boolean

/**
 * 创建监听器包装函数
 * @param listener 原始监听器
 * @returns 包装后的监听器
 */
export function makeListener (listener: EventListener): EventListener {
  if (typeof listener !== 'function') {
    throw new TypeError('Listener must be a function')
  }
  return listener
}

export type EventRecord = {
  name: string;
  type: string;
  listener: EventListener;
  rawListener: EventListener;
  options?: EventOptions;
  priority: number;
  addTime: number; // 添加时间戳
}

const DEFAULT_MAX_LISTENERS = 1000

/**
 * 事件管理器
 * @param onSub 订阅事件回调
 * @param onRemove 移除事件回调
 * @param onPub 发布事件回调
 */
export function useEvent<T extends string = string> (
  onSub?: (event: string, listener: EventListener, options?: EventOptions) => void,
  onRemove?: (event: string, listener: EventListener, options?: EventOptions) => void,
  onPub?: (event: string, ...dataSet: any[]) => void,
) {
  const __events: EventRecord[] = []
  let MAX_LISTENERS = DEFAULT_MAX_LISTENERS
  let __eventStats: Map<string, { count: number; lastEmit: number }> = new Map()
  
  /**
   * 获取事件优先级
   */
  function getPriority (options?: EventOptions): number {
    if (typeof options === 'object' && options && 'priority' in options) {
      return typeof options.priority === 'number' ? options.priority : 0
    }
    return 0
  }
  
  /**
   * 添加事件绑定
   * @param event 事件名
   * @param listener 监听器函数
   * @param options 选项
   * @returns 取消订阅函数
   */
  function on (event: EventName<T>, listener: EventListener, options?: EventOptions) {
    if (!listener) {
      throw new TypeError('Listener is required')
    }
    
    const scopedListener = makeListener(listener)
    const priority = getPriority(options)
    const addTime = Date.now()
    
    useEventName(event, (name, type) => {
      let replaced = false
      for (let i = 0; i < __events.length; i++) {
        const record = __events[i]
        if (
          record.name === name &&
          record.type === type &&
          record.rawListener === listener
        ) {
          onRemove?.(record.name, record.listener, record.options)
          record.listener = scopedListener
          record.options = options
          record.priority = priority
          record.addTime = addTime
          onSub?.(record.name, scopedListener, options)
          replaced = true
          break
        }
      }
      
      if (!replaced) {
        const newRecord: EventRecord = {
          name,
          type,
          listener: scopedListener,
          rawListener: listener,
          options,
          priority,
          addTime,
        }
        
        // 按优先级插入，优先级高的在前面
        let insertIndex = __events.length
        for (let i = 0; i < __events.length; i++) {
          if (__events[i].priority < priority) {
            insertIndex = i
            break
          }
        }
        __events.splice(insertIndex, 0, newRecord)
        
        onSub?.(name, scopedListener, options)
        
        if (__events.length > MAX_LISTENERS) {
          throw new Error(`Reached the maximum events count: ${MAX_LISTENERS}`)
        } else if (__events.length / MAX_LISTENERS > 0.9) {
          console.warn(`The number of events is too large: ${__events.length}`)
        }
      }
    })
    
    return () => {
      off(event, listener)
    }
  }
  
  /**
   * 一次性绑定
   * @param event 事件名
   * @param listener 监听器函数
   * @param options 选项
   * @returns 取消订阅函数
   */
  function once (event: EventName<T>, listener: EventListener, options?: EventOptions) {
    if (!listener) {
      throw new TypeError('Listener is required')
    }
    
    function handler (e: Event, ...dataSet: any[]) {
      try {
        listener(e, ...dataSet)
      } finally {
        off(event, handler)
      }
    }
    
    return on(event, handler, options)
  }
  
  /**
   * 解绑事件
   * @param event 事件名
   * @param listener 监听器函数（可选）
   */
  function off (event: EventName<T>, listener?: EventListener): void {
    if (event === '*') {
      __events.forEach(record => {
        try {
          onRemove?.(record.name, record.listener, record.options)
        } catch (error) {
          console.error('Error in onRemove callback:', error)
        }
      })
      __events.length = 0
      __eventStats.clear()
      return
    }
    
    useEventName(event, (name, type) => {
      let j = 0
      for (let i = 0; i < __events.length; i++) {
        const record = __events[i]
        const shouldRemove = (
          (name === '*' || record.name === name) &&
          (type === '' || record.type === type) &&
          (!listener || record.rawListener === listener)
        )
        
        if (shouldRemove) {
          try {
            onRemove?.(record.name, record.listener, record.options)
          } catch (error) {
            console.error('Error in onRemove callback:', error)
          }
        } else {
          __events[j++] = record
        }
      }
      __events.length = j
    })
  }
  
  /**
   * 触发事件
   * @param event 事件名
   * @param dataSet 传递的数据
   */
  function emit (event: EventName<T>, ...dataSet: any[]): void {
    useEventName(event, (name, type) => {
      const e = new CustomEvent(name, { detail: dataSet })
      
      // 更新统计信息
      const stat = __eventStats.get(name) || { count: 0, lastEmit: 0 }
      stat.count++
      stat.lastEmit = Date.now()
      __eventStats.set(name, stat)
      
      // 拷贝一份，防止 once 事件导致遍历出错
      const records = __events.slice()
      
      for (const record of records) {
        if (
          record.name === '*' ||
          (record.name === name && (type === '' || record.type === type))
        ) {
          try {
            record.listener(e, ...dataSet)
            onPub?.(name, e, ...dataSet)
          } catch (error) {
            console.error(`Error in event listener for "${name}":`, error)
          }
        }
      }
    })
  }
  
  /**
   * 获取事件监听数量
   * @param event 事件名（可选）
   * @returns 监听器数量
   */
  function listenerCount (event?: EventName<T>): number {
    if (!event) {
      return __events.length
    }
    
    const parsed = parseEventName(event)
    return __events.filter(record =>
      parsed.some(ev => ev.name === record.name && (ev.type === '' || ev.type === record.type)),
    ).length
  }
  
  /**
   * 获取所有事件名
   * @returns 事件名数组
   */
  function eventNames (): string[] {
    const names = new Set<string>()
    __events.forEach(record => names.add(record.name))
    return Array.from(names)
  }
  
  /**
   * 获取指定事件的监听器
   * @param event 事件名
   * @returns 监听器数组
   */
  function listeners (event: EventName<T>): EventListener[] {
    const parsed = parseEventName(event)
    return __events
      .filter(record =>
        parsed.some(ev => ev.name === record.name && (ev.type === '' || ev.type === record.type)),
      )
      .map(record => record.rawListener)
  }
  
  /**
   * 设置最大监听数
   * @param max 最大数量
   */
  function setMaxListeners (max: number): void {
    if (max < 0) {
      throw new TypeError('Max listeners must be a non-negative number')
    }
    MAX_LISTENERS = Math.max(DEFAULT_MAX_LISTENERS, max)
  }
  
  /**
   * 获取最大监听数
   * @returns 最大监听数
   */
  function getMaxListeners (): number {
    return MAX_LISTENERS
  }
  
  /**
   * 获取事件统计信息
   * @param event 事件名（可选）
   * @returns 统计信息
   */
  function getEventStats (event?: string) {
    if (event) {
      return __eventStats.get(event) || { count: 0, lastEmit: 0 }
    }
    return Object.fromEntries(__eventStats)
  }
  
  /**
   * 清理所有事件
   */
  function clear (): void {
    off('*' as EventName<T>)
  }
  
  /**
   * 获取调试信息
   */
  function debug () {
    return {
      totalListeners: __events.length,
      maxListeners: MAX_LISTENERS,
      eventNames: eventNames(),
      events: __events.map(record => ({
        name: record.name,
        type: record.type,
        priority: record.priority,
        addTime: record.addTime,
        options: record.options,
      })),
      stats: getEventStats(),
    }
  }
  
  return {
    on,
    once,
    off,
    emit,
    listenerCount,
    eventNames,
    listeners,
    setMaxListeners,
    getMaxListeners,
    getEventStats,
    clear,
    debug,
  }
}

export default useEvent

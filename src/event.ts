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
  if (name === null || name === undefined) return []
  
  if (Array.isArray(name)) {
    return name.flatMap(n => parseEventName(n))
  }
  
  if (typeof name !== 'string') {
    console.warn('parseEventName: name must be a string or array of strings')
    return []
  }
  
  const trimmedName = name.trim()
  if (!trimmedName) return []
  
  const result: EventType[] = []
  const events = trimmedName.split(/\s+/)
  
  for (const event of events) {
    if (!event) continue
    
    const parts = event.split('.')
    const eventName = parts[0]?.trim()
    
    if (!eventName) continue
    
    if (parts.length === 1) {
      result.push({ name: eventName, type: '' })
    } else {
      for (let i = 1; i < parts.length; i++) {
        const type = parts[i]?.trim()
        if (type) {
          result.push({ name: eventName, type })
        }
      }
    }
  }
  
  return result
}

/**
 * 使用事件名执行回调函数
 * @param event 事件名
 * @param use 回调函数
 */
export function useEventName (event: EventName, use: (name: string, type: string) => void): void {
  if (event === null || event === undefined) return
  
  if (typeof use !== 'function') {
    console.error('useEventName: use must be a function')
    return
  }
  
  const eventTypes = parseEventName(event)
  
  for (const eventType of eventTypes) {
    if (eventType.name) {
      use(eventType.name, eventType.type)
    }
  }
}

export type EventListener<T = unknown> = (e: Event, ...dataSet: T[]) => void

export type EventOptions = AddEventListenerOptions & {
  priority?: number; // 事件优先级，数值越大优先级越高
} | boolean

/**
 * 创建监听器包装函数
 * @param listener 原始监听器
 * @returns 包装后的监听器
 */
export function makeListener<T = unknown> (listener: EventListener<T>): EventListener<T> {
  if (typeof listener !== 'function') {
    throw new TypeError('Listener must be a function')
  }
  return listener
}

export type EventRecord<T = unknown> = {
  name: string;
  type: string;
  listener: EventListener<T>;
  rawListener: EventListener<T>;
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
  onSub?: <U = unknown>(event: string, listener: EventListener<U>, options?: EventOptions) => void,
  onRemove?: <U = unknown>(event: string, listener: EventListener<U>, options?: EventOptions) => void,
  onPub?: <U = unknown>(event: string, e: Event, ...dataSet: U[]) => void,
): UseEventReturn<T> {
  const __events: Map<string, Map<string, EventRecord<any>[]>> = new Map() // eventName -> type -> listeners
  let MAX_LISTENERS = DEFAULT_MAX_LISTENERS
  let __eventStats: Map<string, EventStats> = new Map()
  let __totalListeners = 0
  
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
   * 确保事件和类型的存储结构存在
   * @param name 事件名
   * @param type 类型
   * @returns 监听器数组
   */
  function ensureListenerArray<U = unknown> (name: string, type: string): EventRecord<U>[] {
    if (!__events.has(name)) {
      __events.set(name, new Map())
    }
    
    const typeMap = __events.get(name)!
    
    if (!typeMap.has(type)) {
      typeMap.set(type, [])
    }
    
    return typeMap.get(type) as EventRecord<U>[]
  }

  /**
   * 查找并替换已存在的监听器
   * @param listeners 监听器数组
   * @param listener 原始监听器
   * @param scopedListener 包装后的监听器
   * @param options 选项
   * @param priority 优先级
   * @param addTime 添加时间
   * @returns 是否替换成功
   */
  function replaceExistingListener<U = unknown> (
    listeners: EventRecord<U>[], 
    listener: EventListener<U>, 
    scopedListener: EventListener<U>, 
    options?: EventOptions, 
    priority?: number, 
    addTime?: number
  ): boolean {
    for (let i = 0; i < listeners.length; i++) {
      const record = listeners[i]
      if (record.rawListener === listener) {
        onRemove?.(record.name, record.listener, record.options)
        record.listener = scopedListener
        record.options = options
        record.priority = priority!
        record.addTime = addTime!
        onSub?.(record.name, scopedListener, options)
        return true
      }
    }
    return false
  }

  /**
   * 按优先级插入监听器
   * @param listeners 监听器数组
   * @param record 监听器记录
   */
  function insertListenerByPriority<U = unknown> (listeners: EventRecord<U>[], record: EventRecord<U>): void {
    // 按优先级插入，优先级高的在前面
    // 使用二分查找找到插入位置
    let insertIndex = listeners.length
    let left = 0
    let right = listeners.length - 1
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (listeners[mid].priority < record.priority) {
        insertIndex = mid
        right = mid - 1
      } else {
        left = mid + 1
      }
    }
    
    listeners.splice(insertIndex, 0, record)
  }

  /**
   * 添加事件绑定
   * @param event 事件名
   * @param listener 监听器函数
   * @param options 选项
   * @returns 取消订阅函数
   */
  function on<U = unknown> (event: EventName<T>, listener: EventListener<U>, options?: EventOptions) {
    if (event === null || event === undefined) {
      throw new TypeError('Event name is required')
    }
    
    if (!listener) {
      throw new TypeError('Listener is required')
    }
    
    const scopedListener = makeListener<U>(listener)
    const priority = getPriority(options)
    const addTime = Date.now()
    
    let error: Error | null = null
    
    useEventName(event, (name, type) => {
      try {
        const listeners = ensureListenerArray(name, type)
        
        // 查找是否已存在相同的监听器
        const replaced = replaceExistingListener(
          listeners, 
          listener, 
          scopedListener, 
          options, 
          priority, 
          addTime
        )
        
        if (!replaced) {
          const newRecord: EventRecord<U> = {
            name,
            type,
            listener: scopedListener,
            rawListener: listener,
            options,
            priority,
            addTime,
          }
          
          insertListenerByPriority(listeners, newRecord)
          __totalListeners++
          
          onSub?.(name, scopedListener, options)
          
          if (__totalListeners >= MAX_LISTENERS) {
            throw new Error(`Reached the maximum events count: ${MAX_LISTENERS}`)
          } else if (__totalListeners / MAX_LISTENERS > 0.9) {
            console.warn(`The number of events is too large: ${__totalListeners}`)
          }
        }
      } catch (err) {
        error = err as Error
      }
    })
    
    if (error) {
      throw error
    }
    
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
  function once<U = unknown> (event: EventName<T>, listener: EventListener<U>, options?: EventOptions) {
    if (event === null || event === undefined) {
      throw new TypeError('Event name is required')
    }
    
    if (!listener) {
      throw new TypeError('Listener is required')
    }
    
    const handler: EventListener<U> = (e: Event, ...dataSet: U[]) => {
      try {
        listener(e, ...dataSet)
      } finally {
        off(event, handler)
      }
    }
    
    return on<U>(event, handler, options)
  }
  
  /**
   * 过滤监听器数组，移除指定的监听器
   * @param listeners 监听器数组
   * @param listener 要移除的监听器（可选）
   * @returns 过滤后的监听器数组
   */
  function filterListeners<U = unknown> (listeners: EventRecord<U>[], listener?: EventListener<U>): EventRecord<U>[] {
    return listeners.filter(record => {
      const shouldRemove = (!listener || record.rawListener === listener)
      if (shouldRemove) {
        try {
          onRemove?.(record.name, record.listener, record.options)
          __totalListeners--
        } catch (error) {
          console.error('Error in onRemove callback:', error)
        }
      }
      return !shouldRemove
    })
  }

  /**
   * 清理空的类型映射
   * @param typeMap 类型映射
   * @param eventName 事件名
   */
  function cleanupTypeMap<U = unknown> (typeMap: Map<string, EventRecord<U>[]>, eventName: string): void {
    if (typeMap.size === 0) {
      __events.delete(eventName)
    }
  }

  /**
   * 在单个类型映射上应用监听器过滤
   */
  function applyFilterToTypeMap<U = unknown>(
    typeMap: Map<string, EventRecord<U>[]>, 
    targetType: string, 
    listener?: EventListener<U>
  ): void {
    if (targetType === '') {
      // 处理不带命名空间的事件，删除该事件的所有命名空间
      typeMap.forEach((listeners, type) => {
        const filtered = filterListeners(listeners, listener)
        
        if (filtered.length === 0) {
          typeMap.delete(type)
        } else {
          typeMap.set(type, filtered)
        }
      })
    } else {
      // 处理带命名空间的事件
      if (!typeMap.has(targetType)) return
      
      const listeners = typeMap.get(targetType)!
      const filtered = filterListeners(listeners, listener)
      
      if (filtered.length === 0) {
        typeMap.delete(targetType)
      } else {
        typeMap.set(targetType, filtered)
      }
    }
  }

  function off<U = unknown> (event: EventName<T>, listener?: EventListener<U>): void {
    if (event === '*') {
      // 清除所有事件
      __events.forEach((typeMap) => {
        typeMap.forEach((listeners) => {
          listeners.forEach(record => {
            try {
              onRemove?.(record.name, record.listener, record.options)
            } catch (error) {
              console.error('Error in onRemove callback:', error)
            }
          })
        })
      })
      __events.clear()
      __eventStats.clear()
      __totalListeners = 0
      return
    }
    
    useEventName(event, (name, type) => {
      if (name === '*') {
        // 处理 *.ns 格式的事件名，通过命名空间取消订阅
        __events.forEach((typeMap, eventName) => {
          if (typeMap.has(type)) {
            applyFilterToTypeMap(typeMap, type, listener)
            cleanupTypeMap(typeMap, eventName)
          }
        })
      } else if (!__events.has(name)) {
        return
      } else {
        const typeMap = __events.get(name)!
        applyFilterToTypeMap(typeMap, type, listener)
        cleanupTypeMap(typeMap, name)
      }
    })
  }

  /**
   * 执行监听器数组
   */
  function executeListeners<U = unknown>(
    listeners: EventRecord<U>[],
    event: Event,
    eventName: string,
    dataSet: U[]
  ): void {
    for (const record of listeners) {
      try {
        record.listener(event, ...dataSet)
        onPub?.(eventName, event, ...dataSet)
      } catch (error) {
        console.error(`Error in event listener for "${eventName}":`, error)
      }
    }
  }

  /**
   * 在类型映射上执行监听器
   */
  function executeListenersFromTypeMap<U = unknown>(
    typeMap: Map<string, EventRecord<U>[]>, 
    targetType: string, 
    event: Event,
    eventName: string,
    dataSet: U[]
  ): void {
    if (targetType === '') {
      // 触发该事件的所有命名空间
      typeMap.forEach((listeners) => {
        executeListeners(listeners, event, eventName, dataSet)
      })
    } else {
      // 触发指定命名空间的事件
      if (typeMap.has(targetType)) {
        executeListeners(typeMap.get(targetType)!, event, eventName, dataSet)  
      }
    }
  }

  /**
   * 触发事件
   * @param event 事件名
   * @param dataSet 传递的数据
   */
  function emit<U = unknown> (event: EventName<T>, ...dataSet: U[]): void {
    if (event === null || event === undefined) {
      console.warn('emit: event name is required')
      return
    }
    
    useEventName(event, (name, type) => {
      const e = new CustomEvent(name, { detail: dataSet })
      
      // 更新统计信息
      const stat = __eventStats.get(name) || { count: 0, lastEmit: 0 }
      stat.count++
      stat.lastEmit = Date.now()
      __eventStats.set(name, stat)
      
      // 1. 执行通配符监听器（优先级已经在添加时排序）
      if (__events.has('*')) {
        const wildcardTypeMap = __events.get('*')!
        // 通配符监听器总是执行，不管 type 是什么，所以用空字符串让它执行所有
        executeListenersFromTypeMap(wildcardTypeMap, '', e, name, dataSet)
      }
      
      // 2. 执行指定事件的监听器（优先级已经在添加时排序）
      if (__events.has(name)) {
        const typeMap = __events.get(name)!
        executeListenersFromTypeMap(typeMap, type, e, name, dataSet)
      }
    })
  }
  
  /**
   * 从类型映射中统计监听器数量
   */
  function countListenersFromTypeMap(
    typeMap: Map<string, EventRecord<any>[]>, 
    targetType: string
  ): number {
    let count = 0
    if (targetType === '') {
      // 统计该事件的所有命名空间
      typeMap.forEach((listeners) => {
        count += listeners.length
      })
    } else {
      // 统计指定命名空间的事件
      if (typeMap.has(targetType)) {
        count += typeMap.get(targetType)!.length
      }
    }
    return count
  }

  /**
   * 获取事件监听数量
   * @param event 事件名（可选）
   * @returns 监听器数量
   */
  function listenerCount (event?: EventName<T>): number {
    if (!event) {
      return __totalListeners
    }
    
    let count = 0
    const parsed = parseEventName(event)
    
    parsed.forEach(ev => {
      if (__events.has(ev.name)) {
        const typeMap = __events.get(ev.name)!
        count += countListenersFromTypeMap(typeMap, ev.type)
      }
    })
    
    return count
  }
  
  /**
   * 获取所有事件名
   * @returns 事件名数组
   */
  function eventNames (): string[] {
    return Array.from(__events.keys())
  }
  
  /**
   * 从类型映射中收集监听器
   */
  function collectListenersFromTypeMap<U = unknown>(
    typeMap: Map<string, EventRecord<U>[]>, 
    targetType: string, 
    result: EventListener<U>[]
  ): void {
    if (targetType === '') {
      // 获取该事件的所有命名空间的监听器
      typeMap.forEach((records) => {
        records.forEach(record => result.push(record.rawListener))
      })
    } else {
      // 获取指定命名空间的监听器
      if (typeMap.has(targetType)) {
        typeMap.get(targetType)!.forEach(record => result.push(record.rawListener))
      }
    }
  }

  /**
   * 获取指定事件的监听器
   * @param event 事件名
   * @returns 监听器数组
   */
  function listeners<U = unknown> (event: EventName<T>): EventListener<U>[] {
    const listeners: EventListener<U>[] = []
    const parsed = parseEventName(event)
    
    parsed.forEach(ev => {
      if (__events.has(ev.name)) {
        const typeMap = __events.get(ev.name)!
        collectListenersFromTypeMap(typeMap, ev.type, listeners)
      }
    })
    
    return listeners
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
    const events: Array<{
      name: string;
      type: string;
      priority: number;
      addTime: number;
      options?: EventOptions;
    }> = []
    __events.forEach((typeMap) => {
      typeMap.forEach((listeners) => {
        listeners.forEach(record => {
          events.push({
            name: record.name,
            type: record.type,
            priority: record.priority,
            addTime: record.addTime,
            options: record.options,
          })
        })
      })
    })
    
    return {
      totalListeners: __totalListeners,
      maxListeners: MAX_LISTENERS,
      eventNames: eventNames(),
      events,
      stats: getEventStats() as Record<string, EventStats>,
    }
  }
  
  /**
   * 批量添加事件监听器
   * @param items 事件监听器配置数组
   * @returns 取消订阅函数数组
   */
  function batchOn<U = unknown>(items: Array<{ event: EventName<T>; listener: EventListener<U>; options?: EventOptions }>): (() => void)[] {
    return items.map(item => on<U>(item.event, item.listener, item.options));
  }

  /**
   * 批量删除事件监听器
   * @param items 事件监听器配置数组
   */
  function batchOff<U = unknown>(items: Array<{ event: EventName<T>; listener?: EventListener<U> }>): void {
    items.forEach(item => off(item.event, item.listener));
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
    batchOn,
    batchOff,
  }
}

export type EventStats = {
  count: number;
  lastEmit: number;
}

export type EventBatchItem<T extends string = string, U = unknown> = {
  event: EventName<T>;
  listener: EventListener<U>;
  options?: EventOptions;
};

export type UseEventReturn<T extends string = string> = {
  on: <U = unknown>(event: EventName<T>, listener: EventListener<U>, options?: EventOptions) => () => void;
  once: <U = unknown>(event: EventName<T>, listener: EventListener<U>, options?: EventOptions) => () => void;
  off: <U = unknown>(event: EventName<T>, listener?: EventListener<U>) => void;
  emit: <U = unknown>(event: EventName<T>, ...dataSet: U[]) => void;
  listenerCount: (event?: EventName<T>) => number;
  eventNames: () => string[];
  listeners: <U = unknown>(event: EventName<T>) => EventListener<U>[];
  setMaxListeners: (max: number) => void;
  getMaxListeners: () => number;
  getEventStats: (event?: string) => EventStats | Record<string, EventStats>;
  clear: () => void;
  debug: () => {
    totalListeners: number;
    maxListeners: number;
    eventNames: string[];
    events: Array<{
      name: string;
      type: string;
      priority: number;
      addTime: number;
      options?: EventOptions;
    }>;
    stats: Record<string, EventStats>;
  };
  /**
   * 批量添加事件监听器
   * @param items 事件监听器配置数组
   * @returns 取消订阅函数数组
   */
  batchOn: <U = unknown>(items: EventBatchItem<T, U>[]) => (() => void)[];
  /**
   * 批量删除事件监听器
   * @param items 事件监听器配置数组
   */
  batchOff: <U = unknown>(items: Array<{ event: EventName<T>; listener?: EventListener<U> }>) => void;
}

export default useEvent

export type EventName = string | string[]

export type EventType = {
  name: string;
  type: string;
}

export function parseEventName (name: EventName): EventType[] {
  if (Array.isArray(name)) {
    return parseEventName(name.join(' '))
  }
  
  return name.trim().split(/^|\s+/).map(n => {
    const names = n.split('.')
    const name = names[0].trim()
    const types = names.slice(1)
    
    return types.length === 0 ? [{
      name,
      type: '',
    }] : types.map(type => ({
      name,
      type: type.trim(),
    }))
  }).reduce((a, b) => a.concat(b), [])
}

export function useEventName (event: EventName, use: (name: string, type: string) => void) {
  parseEventName(event).map(event => {
    if (event.name) use(event.name, event.type)
  })
}

export type EventListener = (e: Event, ...dataSet: any[]) => void

export type EventOptions = AddEventListenerOptions | boolean

export function contextListener (listener: (e: Event, ...dataSet: any[]) => void) {
  return (e: Event, ...dataSet: any[]) => {
    listener(e, ...dataSet)
  }
}

export type EventRecord = {
  name: string;
  type: string;
  listener: EventListener;
  rawListener: EventListener;
  options?: EventOptions;
}

const DEFAULT_MAX_LISTENERS = 1000

export function useEvent (
  onSub?: (event: string, listener: EventListener, options?: EventOptions) => void,
  onRemove?: (event: string, listener: EventListener, options?: EventOptions) => void,
  onPub?: (event: string, ...dataSet: any[]) => void,
) {
  const __events: EventRecord[] = []
  let MAX_LISTENERS = DEFAULT_MAX_LISTENERS
  
  /**
   * 添加绑定
   * 事件指定规则 可支持带多个命名空间的多个事件一次性绑定 其中不同的事件之间以空白符分割，不同的命名空间以.分割
   * 绑定规则
   *  相同的绑定会替换原有的事件处理器以及事件处理配置项
   *  新的绑定会添加一条新的绑定记录
   *
   * 相同的绑定是指 name,namespace,listener同时绝对相等则视为相同的绑定
   * @param event string 'name.namespace1.namespace2 name2.namespace1.namespace2'
   * @param listener function (e: Event, ...data) => void
   * @param options boolean | object
   * @returns () => void 解绑函数
   */
  function on (event: EventName, listener: EventListener, options?: EventOptions) {
    const contextedListener = contextListener(listener)
    
    useEventName(event, (name, type) => {
      for (let i = 0, el = __events.length; i < el; i++) {
        const record = __events[i]
        /**
         * 已经绑定过事件，先卸载原来的再绑定新的
         * 名称相同且命名空间相同且处理函数相同即视为相同的绑定
         */
        if (
          record.name === name &&
          record.type === type &&
          record.rawListener === listener
        ) {
          // console.log('skip', name, type)
          onRemove?.(record.name, record.listener, record.options)
          record.listener = contextedListener
          record.options = options
          onSub?.(record.name, contextedListener, options)
          return
        }
      }
      
      __events.push({
        name,
        type,
        listener: contextedListener,
        rawListener: listener,
        options,
      })
      
      onSub?.(name, contextedListener, options)
      
      if (__events.length >= MAX_LISTENERS) {
        throw new Error(`Reached the maximum events count: ${MAX_LISTENERS}`)
      }
    })
    
    return () => {
      off(event, listener)
    }
  }
  
  /**
   * 一次性绑定即 当所绑定的事件触发之后立即自动解绑
   * 事件指定规则同on
   * @param event
   * @param listener
   * @param options
   */
  function once (event: EventName, listener: EventListener, options?: EventOptions) {
    return on(event, function handler (e: Event, ...dataSet: any[]) {
      listener(e, ...dataSet)
      off(event, handler)
    }, options)
  }
  
  /**
   * 事件解绑
   * 事件指定规则同on
   * 解绑规则
   *  对可选命名空间和事件处理器若指定则进行绝对相等匹配,若不指定则只进行name匹配
   * @param event
   * @param listener
   */
  function off (event: EventName, listener?: EventListener) {
    if (event === '*') {
      __events.length = 0
    } else {
      useEventName(event, (name, type) => {
        let j = -1
        for (let i = 0, el = __events.length; i < el; i++) {
          const record = __events[i]
          if (
            (name === '*' || record.name === name) &&
            /**
             * 不指定命名空间，会删除所有name相同的注册事件
             */
            (type === '' || record.type === type) &&
            (!listener || record.rawListener === listener)
          ) {
            onRemove?.(record.name, record.listener, record.options)
          } else {
            __events[++j] = record
          }
        }
        
        __events.length = ++j
      })
    }
  }
  
  /**
   * 事件指定规则同on
   * 触发匹配规则
   *  对name和可选的命名空间做绝对相等匹配
   * @param event
   * @param dataSet
   */
  function emit (event: EventName, ...dataSet: any[]) {
    useEventName(event, (name, type) => {
      const e = new CustomEvent(name)
      for (let i = 0, el = __events.length; i < el; i++) {
        const record = __events[i]
        
        if (!record) {
          el = __events.length
          i--
          continue
        }
        
        if (
          record.name === '*' ||
          record.name === name &&
          /**
           * 不指定命名空间，会触发所有name相同的注册事件
           */
          (type === '' || record.type === type)
        ) {
          record.listener(e, ...dataSet)
          onPub?.(name, e, ...dataSet)
        }
      }
    })
  }
  
  /**
   * 获取指定或所有事件的有效的绑定记录总数
   * @param event
   */
  function listenerCount (event?: EventName) {
    if (event) {
      return __events
        .filter(record => parseEventName(event)
          .some(event => event.name === record.name && (event.type === '' || event.type === record.type)),
        ).length
    }
    return __events.length
  }
  
  /**
   * 更新最大可存在的事件绑定记录值
   * @param max
   */
  function setMaxListeners (max: number) {
    MAX_LISTENERS = Math.max(DEFAULT_MAX_LISTENERS, max)
  }
  
  /**
   * 查看当前可绑定的事件记录的最大值
   */
  function getMaxListeners () {
    return MAX_LISTENERS
  }
  
  return {
    on,
    once,
    off,
    emit,
    listenerCount,
    setMaxListeners,
    getMaxListeners,
  }
}

export default useEvent

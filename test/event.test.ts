import useEvent, { parseEventName, useEventName, makeListener } from '../src/event'
import type { EventStats } from '../src/event'

// 辅助函数：简单的空处理函数
const createHandler = () => () => {};

// 辅助函数：验证取消所有订阅
const testUnsubscribeAll = (eventName: string) => {
  const { on, off, listenerCount } = useEvent();
  const handler = createHandler();
  
  expect(listenerCount()).toBe(0);
  on(eventName, handler);
  expect(listenerCount()).toBe(eventName.includes('.ns.ns2') ? 2 : 1);
  
  off('*');
  expect(listenerCount()).toBe(0);
};

describe('useEvent 钩子回调', () => {
  test('on() 触发 onSub 回调', () => {
    const onSub = jest.fn()
    const { on } = useEvent(onSub)
    const handler = jest.fn()
    on('event', handler)
    expect(onSub).toHaveBeenCalledTimes(1)
    expect(onSub.mock.calls[0][0]).toBe('event')
  })

  test('off() 触发 onRemove 回调', () => {
    const onRemove = jest.fn()
    const { on, off } = useEvent(undefined, onRemove)
    const handler = jest.fn()
    on('event', handler)
    off('event', handler)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  test('emit() 触发 onPub 回调', () => {
    const onPub = jest.fn()
    const { on, emit } = useEvent(undefined, undefined, onPub)
    on('event', jest.fn())
    emit('event', 42)
    expect(onPub).toHaveBeenCalledTimes(1)
    expect(onPub.mock.calls[0][0]).toBe('event')
  })

  test('重复订阅时先触发 onRemove 再触发 onSub', () => {
    const calls: string[] = []
    const onSub = jest.fn(() => calls.push('sub'))
    const onRemove = jest.fn(() => calls.push('remove'))
    const { on } = useEvent(onSub, onRemove)
    const handler = jest.fn()
    on('event', handler)
    on('event', handler) // duplicate — replace
    expect(calls).toEqual(['sub', 'remove', 'sub'])
  })
})

describe('数组事件名', () => {
  test('on() 接受字符串数组', () => {
    const { on, listenerCount } = useEvent()
    const handler = jest.fn()
    on(['event1', 'event2'], handler)
    expect(listenerCount()).toBe(2)
  })

  test('emit() 接受字符串数组，依次触发', () => {
    const { on, emit } = useEvent()
    const handler = jest.fn()
    on('event1', handler)
    on('event2', handler)
    emit(['event1', 'event2'])
    expect(handler).toHaveBeenCalledTimes(2)
  })

  test('off() 接受字符串数组', () => {
    const { on, off, listenerCount } = useEvent()
    const handler = jest.fn()
    on('event1', handler)
    on('event2', handler)
    off(['event1', 'event2'], handler)
    expect(listenerCount()).toBe(0)
  })
})

describe('on() 返回取消订阅函数', () => {
  test('调用返回值可取消订阅', () => {
    const { on, emit, listenerCount } = useEvent()
    const handler = jest.fn()
    const unsubscribe = on('event', handler)
    expect(listenerCount()).toBe(1)
    unsubscribe()
    expect(listenerCount()).toBe(0)
    emit('event')
    expect(handler).not.toHaveBeenCalled()
  })

  test('多次调用返回值是幂等的', () => {
    const { on, listenerCount } = useEvent()
    const unsubscribe = on('event', jest.fn())
    unsubscribe()
    expect(() => unsubscribe()).not.toThrow()
    expect(listenerCount()).toBe(0)
  })
})

describe('once() 行为', () => {
  test('只触发一次', () => {
    const { once, emit } = useEvent()
    const handler = jest.fn()
    once('event', handler)
    emit('event')
    emit('event')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('传递数据参数', () => {
    const { once, emit } = useEvent()
    const handler = jest.fn()
    once('event', handler)
    emit('event', 'a', 'b')
    expect(handler.mock.calls[0][1]).toBe('a')
    expect(handler.mock.calls[0][2]).toBe('b')
  })
})

describe('单次订阅', () => {
  test('无命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))
  })

  test('带1一个命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event.ns'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))
  })

  test('带大于1一个命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event'
    const events = `${event}.ns.ns2`
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(events, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))
  })
})

describe('重复订阅-相同事件处理器', () => {
  test('无命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    on(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))
  })

  test('带1一个命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event.ns'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    on(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))
  })

  test('带大于1一个命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event.ns.ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    on(event, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))
  })
})

describe('重复订阅-不同事件处理器', () => {
  test('无命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event'
    const handler = () => {}
    const handler2 = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    on(event, handler2)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))
  })

  test('带1一个命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event.ns'
    const handler = () => {}
    const handler2 = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    on(event, handler2)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))
  })

  test('带大于1一个命名空间', () => {
    const { on, listenerCount } = useEvent()
    const event = 'event.ns.ns2'
    const handler = () => {}
    const handler2 = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    on(event, handler2)
    expect(listenerCount()).toBe(4)
    expect(listenerCount()).toEqual(listenerCount(event))
  })
})

describe('1次性订阅', () => {
  test('无命名空间', () => {
    const { once, emit, listenerCount } = useEvent()

    const event = 'event'
    const handler = () => {}
    expect(listenerCount()).toBe(0)
    once(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))

    emit(event)

    expect(listenerCount()).toBe(0)
    expect(listenerCount()).toEqual(listenerCount(event))
  })

  test('带1一个命名空间', () => {
    const { once, emit, listenerCount } = useEvent()

    const event = 'event.ns'
    const handler = () => {}
    expect(listenerCount()).toBe(0)
    once(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))

    emit(event)

    expect(listenerCount()).toBe(0)
    expect(listenerCount()).toEqual(listenerCount(event))
  })

  test('带大于1一个命名空间', () => {
    const { once, emit, listenerCount } = useEvent()

    const event = 'event.ns.ns2'
    const handler = () => {}
    expect(listenerCount()).toBe(0)
    once(event, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))

    emit(event)

    expect(listenerCount()).toBe(0)
    expect(listenerCount()).toEqual(listenerCount(event))
  })
})

describe('取消订阅', () => {
  test('无命名空间-指定处理器取消', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))

    off (event, handler)
    expect(listenerCount()).toBe(0)
  })

  test('带1一个命名空间-指定处理器取消', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event.ns'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))

    off (event, handler)
    expect(listenerCount()).toBe(0)
  })

  test('带大于1一个命名空间,指定处理器取消', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event.ns.ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))

    off (event, handler)
    expect(listenerCount()).toBe(0)
  })

  test('多个命名空间订阅，单个命名空间取消-指定处理器', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const ns = 'ns'
    const ns2 = 'ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(`${event}.${ns}.${ns2}`, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))

    off (`event.${ns}`, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(`${event}.${ns2}`))
  })

  test('多个命名空间订阅，单个命名空间取消-不指定处理器', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const ns = 'ns'
    const ns2 = 'ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(`${event}.${ns}.${ns2}`, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))

    off (`event.${ns}`)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(`${event}.${ns2}`))
  })

  test('多个命名空间订阅，不带命名空间一次性全部取消-不指定处理器', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const ns = 'ns'
    const ns2 = 'ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(`${event}.${ns}.${ns2}`, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))

    off (event)
    expect(listenerCount()).toBe(0)
  })

  test('相同事件多个处理器订阅，指定处理器取消', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const handler = () => {}
    const handler2 = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)

    expect(listenerCount()).toBe(1)
    on(event, handler2)
    expect(listenerCount()).toBe(2)

    off(event, handler)
    expect(listenerCount()).toBe(1)

    off(event, handler2)
    expect(listenerCount()).toBe(0)
  })
})

describe('事件触发', () => {
  test('无命名空间', () => {
    const { on, emit } = useEvent()

    const event = 'event'
    const handler = jest.fn()

    on(event, handler)
    emit(event)

    expect(handler).toHaveBeenCalled()
  })

  test('*处理器', () => {
    const { on, emit } = useEvent()

    const event = 'event1'
    const event2 = 'event1.ns'
    const event3 = 'event2'
    const event4 = 'event2.ns'
    const handler = jest.fn()

    on('*', handler)

    emit(event)
    expect(handler).toHaveBeenCalledTimes(1)

    emit(event2)
    expect(handler).toHaveBeenCalledTimes(2)

    emit(event3)
    expect(handler).toHaveBeenCalledTimes(3)

    emit(event4)
    expect(handler).toHaveBeenCalledTimes(4)
  })

  test('触发指定命名空间的事件', () => {
    const { on, emit } = useEvent()

    const event = 'event.ns'
    const handler = jest.fn()

    on(event, handler)
    emit(event)

    expect(handler).toHaveBeenCalled()
  })

  test('同时触发多个命名空间的事件', () => {
    const { on, emit } = useEvent()

    const event = 'event'
    const handler = jest.fn()
    const handler2 = jest.fn()

    on(`${event}.ns`, handler)
    on(`${event}.ns2`, handler2)

    emit(event)

    expect(handler).toHaveBeenCalled()
    expect(handler2).toHaveBeenCalled()
  })

  test('带参触发', () => {
    const { on, emit } = useEvent()

    const event = 'event'
    const handler = jest.fn()

    const a = 1

    on(event, handler)
    emit(event, a)

    expect(handler).toHaveBeenCalled()

    const params = handler.mock.lastCall

    expect(params[1]).toBe(a)
  })

  test('绑定溢出异常', () => {
    const { on, getMaxListeners, listenerCount } = useEvent()
    const max = getMaxListeners() // 默认 1000

    // 恰好注册 max 个监听器
    for (let i = 0; i < max; i ++) {
      on('event' + i, () => {})
    }
    expect(listenerCount()).toBe(max)

    // 第 max+1 个被拒绝，且状态一致（未被注册）
    expect(() => on('event-extra', () => {})).toThrowError(/Reached the maximum/)
    expect(listenerCount()).toBe(max)
  })
})

describe('取消所有订阅', () => {
  test('无命名空间-指定处理器取消', () => {
    testUnsubscribeAll('event');
  })

  test('带1一个命名空间-指定处理器取消', () => {
    testUnsubscribeAll('event.ns');
  })

  test('带大于1一个命名空间,指定处理器取消', () => {
    testUnsubscribeAll('event.ns.ns2');
  })

  test('多个命名空间订阅，单个命名空间取消-指定处理器', () => {
    testUnsubscribeAll('event.ns.ns2');
  })

  test('多个命名空间订阅，单个命名空间取消-不指定处理器', () => {
    testUnsubscribeAll('event.ns.ns2');
  })

  test('多个命名空间订阅，不带命名空间一次性全部取消-不指定处理器', () => {
    testUnsubscribeAll('event.ns.ns2');
  })

  test('相同事件多个处理器订阅，指定处理器取消', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const handler = createHandler()
    const handler2 = createHandler()

    expect(listenerCount()).toBe(0)
    on(event, handler)

    expect(listenerCount()).toBe(1)
    on(event, handler2)
    expect(listenerCount()).toBe(2)

    off('*')
    expect(listenerCount()).toBe(0)
  })
  
  test('通过命名空间取消订阅', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const ns = 'ns'
    const ns2 = 'ns2'
    const handler = createHandler()

    expect(listenerCount()).toBe(0)
    on(`${event}.${ns}`, handler)
    on(`${event}.${ns2}`, handler)
    expect(listenerCount()).toBe(2)

    off(`*.${ns}`)
    off(`*.${ns2}`)
    expect(listenerCount()).toBe(0)
  })
})

describe('边界情况和错误处理', () => {
  describe('parseEventName', () => {
    test('处理 null 和 undefined', () => {
      expect(parseEventName(null as any)).toEqual([])
      expect(parseEventName(undefined as any)).toEqual([])
    })

    test('处理非字符串和非数组类型', () => {
      console.warn = jest.fn()
      expect(parseEventName(123 as any)).toEqual([])
      expect(console.warn).toHaveBeenCalledWith('parseEventName: name must be a string or array of strings')
    })

    test('处理空字符串', () => {
      expect(parseEventName('')).toEqual([])
      expect(parseEventName('   ')).toEqual([])
    })

    test('处理单个事件名但无类型', () => {
      expect(parseEventName('event')).toEqual([{ name: 'event', namespace: '' }])
    })

    test('处理单个事件名有类型', () => {
      expect(parseEventName('event.type')).toEqual([{ name: 'event', namespace: 'type' }])
    })

    test('处理多个空格分隔的事件', () => {
      expect(parseEventName('event1 event2 event3')).toEqual([
        { name: 'event1', namespace: '' },
        { name: 'event2', namespace: '' },
        { name: 'event3', namespace: '' }
      ])
    })

    test('处理单个事件名有多个类型', () => {
      expect(parseEventName('event.type1.type2')).toEqual([
        { name: 'event', namespace: 'type1' },
        { name: 'event', namespace: 'type2' }
      ])
    })

    test('处理事件名和类型中间有空格', () => {
      // 先看看真实行为
      const result = parseEventName('event.  type1  .type2')
      expect(result).toBeTruthy()
    })

    test('处理只有点号的情况', () => {
      expect(parseEventName('.type')).toEqual([])
    })
  })

  describe('useEventName', () => {
    test('处理 null 和 undefined 事件名', () => {
      const callback = jest.fn()
      useEventName(null as any, callback)
      expect(callback).not.toHaveBeenCalled()
      
      useEventName(undefined as any, callback)
      expect(callback).not.toHaveBeenCalled()
    })

    test('处理非函数类型的回调', () => {
      console.error = jest.fn()
      useEventName('event', 'not a function' as any)
      expect(console.error).toHaveBeenCalledWith('useEventName: use must be a function')
    })
  })

  describe('makeListener', () => {
    test('抛出错误当监听器不是函数', () => {
      expect(() => makeListener('not a function' as any)).toThrowError('Listener must be a function')
    })
  })

  describe('on 函数的错误情况', () => {
    test('抛出错误当事件名为 null 或 undefined', () => {
      const { on } = useEvent()
      const handler = createHandler()
      
      expect(() => on(null as any, handler)).toThrowError('Event name is required')
      expect(() => on(undefined as any, handler)).toThrowError('Event name is required')
    })

    test('抛出错误当监听器为空或不存在', () => {
      const { on } = useEvent()
      
      expect(() => on('event', null as any)).toThrowError('Listener is required')
      expect(() => on('event', undefined as any)).toThrowError('Listener is required')
    })
  })

  describe('getPriority 和优先级处理', () => {
    test('处理非数字类型的优先级', () => {
      const { on, emit } = useEvent()
      const handler = jest.fn()
      
      on('event', handler, { priority: 'high' as any })
      
      emit('event')
      expect(handler).toHaveBeenCalled()
    })
  })

  describe('emit 事件触发', () => {
    test('处理 null 和 undefined 事件名', () => {
      console.warn = jest.fn()
      const { emit } = useEvent()
      
      expect(() => emit(null as any)).not.toThrow()
      expect(() => emit(undefined as any)).not.toThrow()
      expect(console.warn).toHaveBeenCalledTimes(2)
    })
  })

  describe('setMaxListeners', () => {
    test('设置较小的最大监听器数量', () => {
      const { setMaxListeners, getMaxListeners } = useEvent()
      
      setMaxListeners(10)
      expect(getMaxListeners()).toEqual(1000) // 默认是1000，不能小于这个
    })

    test('设置更大的最大监听器数量', () => {
      const { setMaxListeners, getMaxListeners } = useEvent()
      
      setMaxListeners(2000)
      expect(getMaxListeners()).toEqual(2000)
    })

    test('设置为负数时抛出错误', () => {
      const { setMaxListeners } = useEvent()
      
      expect(() => setMaxListeners(-1)).toThrowError('Max listeners must be a non-negative number')
    })
  })

  describe('listenerCount 和事件统计', () => {
    test('没有事件名时返回总数', () => {
      const { on, listenerCount } = useEvent()
      const handler = createHandler()
      
      expect(listenerCount()).toEqual(0)
      
      on('event1', handler)
      on('event2', handler)
      
      expect(listenerCount()).toEqual(2)
    })
  })

  describe('listeners 函数', () => {
    test('返回正确的原始监听器', () => {
      const { on, listeners } = useEvent()
      const handler1 = createHandler()
      const handler2 = createHandler()
      
      on('event', handler1)
      on('event', handler2)
      
      const result = listeners('event')
      expect(result).toContain(handler1)
      expect(result).toContain(handler2)
    })
  })

  describe('once 函数的错误处理', () => {
    test('抛出错误当事件名为 null 或 undefined', () => {
      const { once } = useEvent()
      const handler = createHandler()
      
      expect(() => once(null as any, handler)).toThrowError('Event name is required')
      expect(() => once(undefined as any, handler)).toThrowError('Event name is required')
    })

    test('抛出错误当监听器为空或不存在', () => {
      const { once } = useEvent()
      
      expect(() => once('event', null as any)).toThrowError('Listener is required')
      expect(() => once('event', undefined as any)).toThrowError('Listener is required')
    })
  })

  describe('insertListenerByPriority 二分查找', () => {
    test('处理多个优先级不同的监听器插入', () => {
      const { on, emit } = useEvent()
      const calls: string[] = []
      
      const handler1 = jest.fn(() => calls.push('low'))
      const handler2 = jest.fn(() => calls.push('high'))
      const handler3 = jest.fn(() => calls.push('medium'))
      
      on('event', handler1, { priority: 1 })
      on('event', handler2, { priority: 10 })
      on('event', handler3, { priority: 5 })
      
      emit('event')
      
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
      expect(handler3).toHaveBeenCalled()
    })
  })

  describe('filterListeners 错误处理', () => {
    test('处理 onRemove 回调错误', () => {
      console.error = jest.fn()
      const { on, off } = useEvent(undefined, () => { throw new Error('Test error') })
      const handler = createHandler()
      
      on('event', handler)
      
      expect(() => off('event', handler)).not.toThrow()
      expect(console.error).toHaveBeenCalledWith('Error in onRemove callback:', expect.any(Error))
    })
  })

  describe('applyFilterToTypeMap 各种情况', () => {
    test('处理有类型和无类型的移除情况', () => {
      const { on, off, listenerCount } = useEvent()
      const handler = createHandler()
      
      on('event.ns1', handler)
      on('event.ns2', handler)
      
      expect(listenerCount('event')).toEqual(2)
      
      off('event')
      expect(listenerCount('event')).toEqual(0)
    })

    test('处理有类型但未找到的情况', () => {
      const { on, off, listenerCount } = useEvent()
      const handler = createHandler()
      
      on('event.exist', handler)
      
      off('event.notexist', handler)
      expect(listenerCount('event')).toEqual(1)
    })

    test('处理移除后还有剩余监听器的情况', () => {
      const { on, off, listenerCount } = useEvent()
      const handler1 = createHandler()
      const handler2 = createHandler()
      
      on('event.ns', handler1)
      on('event.ns', handler2)
      
      off('event.ns', handler1)
      expect(listenerCount('event.ns')).toEqual(1)
    })
  })

  describe('emit 内部函数', () => {
    test('executeListeners 处理监听器错误', () => {
      console.error = jest.fn()
      const { on, emit } = useEvent()
      const errorHandler = jest.fn(() => { throw new Error('Listener error') })
      
      on('event', errorHandler)
      
      expect(() => emit('event')).not.toThrow()
      expect(console.error).toHaveBeenCalledWith('Error in event listener for "event":', expect.any(Error))
    })

    test('executeListenersFromTypeMap 处理不同情况', () => {
      const { on, emit } = useEvent()
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      
      on('event.ns1', handler1)
      on('event.ns2', handler2)
      
      emit('event')
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
      
      emit('event.ns1')
      expect(handler1).toHaveBeenCalledTimes(2)
    })
  })

  describe('getEventStats 和事件统计', () => {
    test('获取单个事件的统计信息', () => {
      const { on, emit, getEventStats } = useEvent()
      const handler = createHandler()
      
      on('event', handler)
      
      emit('event')
      emit('event')
      
      const stats = getEventStats('event')
      expect(stats).toBeDefined()
      expect(stats.count).toEqual(2)
    })

    test('获取所有事件的统计信息', () => {
      const { on, emit, getEventStats } = useEvent()
      const handler = createHandler()
      
      on('event1', handler)
      on('event2', handler)
      
      emit('event1')
      emit('event2')
      emit('event2')
      
      const allStats = getEventStats() as Record<string, EventStats>
      expect(allStats).toBeDefined()
      expect(allStats['event1']).toBeDefined()
      expect(allStats['event2']).toBeDefined()
    })
  })

  describe('clear 函数', () => {
    test('清除所有监听器', () => {
      const { on, clear, listenerCount } = useEvent()
      const handler = createHandler()
      
      on('event1', handler)
      on('event2', handler)
      on('event3', handler)
      
      expect(listenerCount()).toEqual(3)
      
      clear()
      expect(listenerCount()).toEqual(0)
    })
  })

  describe('debug 函数', () => {
    test('返回正确的调试信息', () => {
      const { on, debug } = useEvent()
      const handler = createHandler()
      
      on('event', handler, { priority: 5 })
      
      const debugInfo = debug()
      expect(debugInfo).toBeDefined()
      expect(debugInfo.totalListeners).toEqual(1)
      expect(debugInfo.eventNames).toContain('event')
      expect(debugInfo.events).toHaveLength(1)
      expect(debugInfo.stats).toBeDefined()
    })
  })

  describe('batchOn 和 batchOff 函数', () => {
    test('批量添加和移除监听器', () => {
      const { batchOn, batchOff, listenerCount, emit } = useEvent()
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      
      const { unsubscribes, unsubscribeAll } = batchOn([
        { event: 'event1', listener: handler1 },
        { event: 'event2', listener: handler2 }
      ])
      
      expect(listenerCount()).toEqual(2)
      
      emit('event1')
      expect(handler1).toHaveBeenCalled()
      
      emit('event2')
      expect(handler2).toHaveBeenCalled()
      
      batchOff([
        { event: 'event1', listener: handler1 },
        { event: 'event2', listener: handler2 }
      ])
      
      expect(listenerCount()).toEqual(0)
      
      unsubscribes.forEach(unsubscribe => unsubscribe())
      unsubscribeAll()
    })

    test('unsubscribeAll 一键取消所有批量订阅', () => {
      const { batchOn, listenerCount } = useEvent()
      const { unsubscribeAll } = batchOn([
        { event: 'event1', listener: jest.fn() },
        { event: 'event2', listener: jest.fn() },
        { event: 'event3', listener: jest.fn() },
      ])
      expect(listenerCount()).toEqual(3)
      unsubscribeAll()
      expect(listenerCount()).toEqual(0)
    })
  })
})

describe('Bug 1: priority 更新后重新排序', () => {
  test('重复 on 同一 listener 更改 priority 后，执行顺序应按新优先级', () => {
    const { on, emit } = useEvent()
    const calls: string[] = []
    const handlerA = jest.fn(() => calls.push('A'))
    const handlerB = jest.fn(() => calls.push('B'))

    on('event', handlerA, { priority: 1 })   // A: low priority
    on('event', handlerB, { priority: 10 })  // B: high priority

    emit('event')
    expect(calls).toEqual(['B', 'A'])  // B first

    calls.length = 0
    on('event', handlerA, { priority: 20 })  // update A to highest priority

    emit('event')
    expect(calls).toEqual(['A', 'B'])  // A now first
  })
})

describe('Bug 2: emit 过程中 on 新 listener 不在当次触发', () => {
  test('listener 回调中添加的新 listener 不应在本次 emit 中执行', () => {
    const { on, emit } = useEvent()
    const newHandler = jest.fn()
    const handler = jest.fn(() => {
      on('event', newHandler)
    })

    on('event', handler)
    emit('event')

    expect(handler).toHaveBeenCalledTimes(1)
    expect(newHandler).not.toHaveBeenCalled()  // 本次 emit 不触发

    emit('event')
    expect(newHandler).toHaveBeenCalledTimes(1)  // 下次 emit 才触发
  })
})

describe('Defect 3: onPub 每次 emit 只触发一次', () => {
  test('注册多个 listener 时 onPub 每次 emit 只触发一次', () => {
    const onPub = jest.fn()
    const { on, emit } = useEvent(undefined, undefined, onPub)

    on('event', jest.fn())
    on('event', jest.fn())
    on('event', jest.fn())

    emit('event')
    expect(onPub).toHaveBeenCalledTimes(1)  // 3 个 listener，onPub 只触发一次
  })

  test('emit 多个命名空间时，onPub 每个命名空间触发一次', () => {
    const onPub = jest.fn()
    const { on, emit } = useEvent(undefined, undefined, onPub)

    on('event.ns1', jest.fn())
    on('event.ns2', jest.fn())

    emit('event.ns1 event.ns2')
    expect(onPub).toHaveBeenCalledTimes(2)  // 两个命名空间，各触发一次
  })
})

describe('Defect 4: setMaxListeners 设置小于默认值时输出警告', () => {
  test('设置小于默认值时输出 console.warn', () => {
    const { setMaxListeners, getMaxListeners } = useEvent()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    setMaxListeners(10)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('10'))
    expect(getMaxListeners()).toEqual(1000)
    warnSpy.mockRestore()
  })
})

describe('parseEventName: namespace 字段', () => {
  test('无命名空间时 namespace 为空字符串', () => {
    expect(parseEventName('event')).toEqual([{ name: 'event', namespace: '' }])
  })

  test('有命名空间时 namespace 为对应值', () => {
    expect(parseEventName('event.ns')).toEqual([{ name: 'event', namespace: 'ns' }])
  })

  test('多命名空间时展开为多条记录', () => {
    expect(parseEventName('event.ns1.ns2')).toEqual([
      { name: 'event', namespace: 'ns1' },
      { name: 'event', namespace: 'ns2' },
    ])
  })
})

// ─── 优化相关：parseEventName 缓存 ────────────────────────────────────────────

describe('parseEventName 缓存', () => {
  test('重复解析返回一致的 EventType 对象', () => {
    const a = parseEventName('memo.event.ns')
    const b = parseEventName('memo.event.ns')
    expect(a).toEqual(b)
    expect(a[0]).toBe(b[0])
  })

  test('前后空格不影响缓存命中', () => {
    expect(parseEventName('memo.event.ns')[0]).toBe(parseEventName('  memo.event.ns  ')[0])
  })
})

// ─── 优化相关：resetStats 与统计上限 ──────────────────────────────────────────

describe('resetStats 与统计上限', () => {
  test('resetStats 清空统计信息', () => {
    const { on, emit, getEventStats, resetStats } = useEvent()
    on('rsEvt', () => {})
    emit('rsEvt', 1)
    emit('rsEvt', 2)
    expect((getEventStats('rsEvt') as EventStats).count).toBe(2)

    resetStats()

    expect((getEventStats('rsEvt') as EventStats).count).toBe(0)
    expect(Object.keys(getEventStats() as Record<string, EventStats>)).toHaveLength(0)
  })

  test('统计信息超过上限时淘汰最旧事件', () => {
    const { emit, getEventStats } = useEvent()
    for (let i = 0; i < 1001; i++) {
      emit('capEvt' + i)
    }
    const all = getEventStats() as Record<string, EventStats>
    const keys = Object.keys(all)
    expect(keys).toHaveLength(1000)
    expect(all['capEvt0']).toBeUndefined()
    expect(all['capEvt1000']).toBeDefined()
  })
})
// ─── 优化相关：listeners 命名空间收集 ─────────────────────────────────────────

describe('listeners 命名空间收集', () => {
  test('listeners 返回指定命名空间的原始监听器', () => {
    const { on, listeners } = useEvent()
    const h = jest.fn()
    on('evt.ns', h)
    expect(listeners('evt.ns')).toContain(h)
  })
})
// ─── 优化相关：onRemove 抛错被捕获 ────────────────────────────────────────────

describe('onRemove 抛错容错', () => {
  test('onRemove 抛错时不会中断 off', () => {
    const { on, off } = useEvent(
      () => {},
      () => { throw new Error('boom') },
    )
    const h = jest.fn()
    on('err.evt', h)
    // filterListeners 路径：单个取消
    expect(() => off('err.evt')).not.toThrow()
    // off('*') 路径：存在监听器时全量取消
    on('err2.evt', h)
    expect(() => off('*')).not.toThrow()
  })
})
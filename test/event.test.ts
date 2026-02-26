import useEvent from '../src/event'

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
    const ns = 'sn'
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
    const ns = 'sn'
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
    const ns = 'sn'
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
    const { on, getMaxListeners, listenerCount, setMaxListeners } = useEvent()
    const max = getMaxListeners() + 1
    setMaxListeners(max)

    const bind = () => {
      const event = 'event'
      const handler = () => {}

      for (let i = 0; i < max; i ++) {
        on(event + i, handler)
      }
    }

    expect(bind).toThrowError(/Reached the maximum/)
    expect(listenerCount()).toEqual(max)
  })
})

describe('取消所有订阅', () => {
  test('无命名空间-指定处理器取消', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(event, handler)
    expect(listenerCount()).toBe(1)
    expect(listenerCount()).toEqual(listenerCount(event))

    off('*')
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

    off('*')
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

    off('*')
    expect(listenerCount()).toBe(0)
  })

  test('多个命名空间订阅，单个命名空间取消-指定处理器', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const ns = 'sn'
    const ns2 = 'ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(`${event}.${ns}.${ns2}`, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))

    off('*')
    expect(listenerCount()).toBe(0)
  })

  test('多个命名空间订阅，单个命名空间取消-不指定处理器', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const ns = 'sn'
    const ns2 = 'ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(`${event}.${ns}.${ns2}`, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))

    off('*')
    expect(listenerCount()).toBe(0)
  })

  test('多个命名空间订阅，不带命名空间一次性全部取消-不指定处理器', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const ns = 'sn'
    const ns2 = 'ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(`${event}.${ns}.${ns2}`, handler)
    expect(listenerCount()).toBe(2)
    expect(listenerCount()).toEqual(listenerCount(event))

    off('*')
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

    off('*')
    expect(listenerCount()).toBe(0)
  })
  
  test('通过命名空间取消订阅', () => {
    const { on, off, listenerCount } = useEvent()
    const event = 'event'
    const ns = 'ns'
    const ns2 = 'ns2'
    const handler = () => {}

    expect(listenerCount()).toBe(0)
    on(`${event}.${ns}`, handler)
    on(`${event}.${ns2}`, handler)
    expect(listenerCount()).toBe(2)

    off(`*.${ns}`)
    off(`*.${ns2}`)
    expect(listenerCount()).toBe(0)
  })
})

import useEvent from '../src/event'

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
})

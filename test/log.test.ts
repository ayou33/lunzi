import log, { create } from '../src/log'

describe('log toggle', () => {
  test('log is enable by default', () => {
    expect(log.isEnable()).toBe(true)
  })

  test('log can be turn on/off manually', () => {
    expect(log.isEnable()).toBe(true)
    log.off()
    expect(log.isEnable()).toBe(false)
    log.on()
    expect(log.isEnable()).toBe(true)
  })

  test('log can be turn on/off by condition', () => {
    let a = 0
    log.if(() => a % 2 === 0)
    expect(log.isEnable()).toBe(true)
    a++
    expect(log.isEnable()).toBe(false)
    log.if(() => true)
  })
})

describe('log match', () => {
  const print = log.create()

  test('everything is matched by default', () => {
    expect(log.isMatch(Math.random().toString(), Math.random.toString())).toBe(true)
    const badge = Math.random().toString()
    print.badge(badge)
    expect(log.isMatch(badge, Math.random.toString())).toBe(true)
  })

  test('log can be filter by badge', () => {
    const badge = Math.random().toString()
    log.filterBadge(new RegExp(badge))
    expect(log.isMatch(badge, Math.random().toString())).toBe(true)
    expect(log.isMatch(Math.random().toString(), Math.random().toString())).toBe(false)
    log.filterBadge(/.*/)
  })

  test('log can be filter by content', () => {
    const content = Math.random().toString()
    log.filter(new RegExp(content))
    expect(log.isMatch(Math.random().toString(), content)).toBe(true)
    expect(log.isMatch(Math.random().toString(), Math.random().toString())).toBe(false)
    log.filter(/.*/)
  })
})

describe('print', () => {
  const print = log.create()

  test('print 1', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    print(1)
    expect(callback).toHaveBeenCalledWith('log', 1)
    expect(callback).toHaveBeenCalledTimes(1)
  })


  test('print 2 by warning', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    print.warn(2)
    expect(callback).toHaveBeenCalledWith('warn', 2)
  })

  test('print 3 by error', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    print.error(3)
    expect(callback).toHaveBeenCalledWith('error', 3)
  })
})

describe('print filter', () => {
  test('filter by predicate function with successful result', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    const print = log.create()
    let a = 0
    print.if(() => a % 2 === 0)(a)
    expect(callback).toHaveBeenCalledWith('log', 0)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('filter by predicate function with failed result', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    const print = log.create()
    let a = 1
    print.if(() => a % 2 === 0)(a)
    expect(callback).toHaveBeenCalledTimes(0)
  })

  test('filter by predicate expression with sucessful result', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    const print = log.create()
    let a = 0
    print.if(true)(a)
    expect(callback).toHaveBeenCalledWith('log', 0)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('filter by predicate expression with failed result', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    const print = log.create()
    let a = 0
    print.if(false)(a)
    expect(callback).toHaveBeenCalledTimes(0)
  })
})

describe('log with badge', () => {
  const badge = 'badge'
  const print = log.create(badge)

  test('badge by create', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    print(badge)
    expect(callback).toHaveBeenLastCalledWith('log', badge, badge)
  })

  test('update basdge with "badge" method', () => {
    const callback = jest.fn()
    log.bindCallback(callback)
    const newBadge = 'newBadge'
    print.badge(newBadge)
    print(badge)
    expect(callback).toHaveBeenLastCalledWith('log', newBadge, badge)
  })
})

describe('create alias should be work as expected', () => {
  const print = create()
  print(0)
  expect(true).toBe(true)
})

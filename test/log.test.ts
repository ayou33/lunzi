import log from '../src/log'

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
    log.fitlerBadge(new RegExp(badge))
    expect(log.isMatch(badge, Math.random().toString())).toBe(true)
    expect(log.isMatch(Math.random().toString(), Math.random().toString())).toBe(false)
    log.fitlerBadge(/.*/)
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
  const callback = jest.fn()
  const print = log.create(callback)

  print(1)
  expect(callback).toHaveBeenCalledWith('log', 1)

  print.warn(2)
  expect(callback).toHaveBeenCalledWith('warn', 2)

  print.error(3)
  expect(callback).toHaveBeenCalledWith('error', 3)
})

describe('print filter', () => {
  const callback = jest.fn()
  const print = log.create(callback)

  let a = 0
  print.if(() => a % 2 === 0)
  print(a)
  expect(callback).toHaveBeenCalledWith('log', 0)
  expect(callback).toHaveBeenCalledTimes(1)

  a++
  print(a)
  expect(callback).toHaveBeenCalledTimes(1)
})

describe('log with badge', () => {
  const callback = jest.fn()
  const print = log.create(callback)
  const badge = 'badge'

  print.badge(badge)

  print(badge)
  expect(callback).toHaveBeenLastCalledWith('log', badge, badge)
})

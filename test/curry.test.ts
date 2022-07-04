import curry, { curryN, _ } from '../src/curry'

describe('curry', () => {
  describe('1个参数: a => a', () => {
    const fn = curry((a: number) => a)
    const a = 1

    test('足数调用', () => {
      expect(fn(a)).toBe(a)
    })

    test('占位调用', () => {
      expect(fn(_)).toBeInstanceOf(Function)
      expect(fn(_)(a)).toBe(a)
    })
  })

  describe('2个参数: (a, b) => a + b', () => {
    const fn = curry((a: number, b: number) => a + b)
    const a = 1
    const b = 2
    const result = a + b

    test('足数调用', () => {
      expect(fn(a, b)).toBe(result)
    })

    describe('占位调用', () => {
      test('a占位调用', () => {
        expect(fn(_, b)).toBeInstanceOf(Function)
        expect(fn(_, b)(a)).toBe(result)
      })

      test('b占位调用', () => {
        expect(fn(a, _)).toBeInstanceOf(Function)
        expect(fn(a, _)(b)).toBe(result)
      })

      test('a, b占位调用', () => {
        const f = fn(_, _)

        expect(f).toBeInstanceOf(Function)
        expect(f(a, b)).toBe(result)
        expect(f(a)).toBeInstanceOf(Function)
        expect(f(a)(b)).toBe(result)
      })
    })
  })
})

describe('curryN', () => {
  describe('curryN需要两个参数', () => {
    test('0参函数验证: () => 1', () => {
      const result = 1
      const fn = () => result
      const n = fn.length

      expect(curryN(n)).toBeInstanceOf(Function)
      expect(curryN(n)(fn)).toBeInstanceOf(Function)
      expect(curryN(n, fn)()).toBe(result)
    })

    test('1个参数函数验证: a => a', () => {
      const fn = (a: any) => a
      const n = fn.length
      const a = 1

      expect(curryN(n)).toBeInstanceOf(Function)
      expect(curryN(n)(fn)).toBeInstanceOf(Function)
      expect(curryN(n)(fn)(a)).toBe(a)
    })
  })

  describe('4参数柯里化: (a = 1, b = 2, c = 3, d = 4) => a + b + c + d', () => {
    const fn = (a = 1, b = 2, c = 3, d = 4) => a + b + c + d

    test('n为0', () => {
      const f = curryN(0, fn)
      const result = 10
      expect(f()).toBe(result)
    })

    test('n为1, a = 10', () => {
      const f = curryN(1, fn)
      const result = 10 + 2 + 3 + 4
      expect(f(10)).toBe(result)
    })

    test('n为2, a = 10, b = 20', () => {
      const f = curryN(2, fn)
      const result = 10 + 20 + 3 + 4
      expect(f(10)(20)).toBe(result)
      expect(f(10, 20)).toBe(result)
    })

    test('n为3, a = 10, b = 20, c = 30', () => {
      const f = curryN(3, fn)
      const result = 10 + 20 + 30 + 4
      expect(f(10)(20)(30)).toBe(result)
      expect(f(10, 20, 30)).toBe(result)
    })

    test('n为4, a = 10, b = 20, c = 30, d = 40', () => {
      const f = curryN(4, fn)
      const result = 10 + 20 + 30 + 40
      expect(f(10)(20)(30)(40)).toBe(result)
      expect(f(10, 20, 30, 40)).toBe(result)
    })

    test('n为5, a = 10, b = 20, c = 30, d = 40, e = 50', () => {
      const f = curryN(5, fn)
      const result = 10 + 20 + 30 + 40
      expect(f(10)(20)(30)(40)(50)).toBe(result)
      expect(f(10, 20, 30, 40, 50)).toBe(result)
    })
  })
})
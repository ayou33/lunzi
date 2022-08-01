import ReversedArray from '../src/reversedArray'

describe('push', () => {
  test('push item', () => {
    const arr = new ReversedArray()
    arr.push([1, 2])
    arr.push(3)
    expect(arr.length()).toBe(3)
    expect(arr.item(0)).toBe(3)
  })

  test('push items', () => {
    const arr = new ReversedArray([1, 2])
    arr.push([3,4])
    expect(arr.length()).toBe(4)
    expect(arr.item(0)).toBe(4)
  })
})

describe('unshift', () => {
  test('unshift item', () => {
    const arr = new ReversedArray([2, 3])
    arr.unshift(1)
    expect(arr.length()).toBe(3)
    expect(arr.item(-1)).toBe(1)
  })

  test('unshift items', () => {
    const arr = new ReversedArray([3,4])
    arr.unshift([1,2])
    expect(arr.length()).toBe(4)
    expect(arr.item(-1)).toBe(1)
  })
})

describe('length', () => {
  test('length', () => {
    const arr = new ReversedArray([2, 3])
    expect(arr.length()).toBe(2)
    arr.unshift(1)
    expect(arr.length()).toBe(3)
    arr.push(4)
    expect(arr.length()).toBe(4)
  })
})

describe('value', () => {
  test('value', () => {
    const arr = new ReversedArray([2, 3])
    expect(arr.value()).toEqual([2, 3])
    arr.unshift(1)
    expect(arr.value()).toEqual([1, 2, 3])
    arr.push(4)
    expect(arr.value()).toEqual([1, 2, 3, 4])
  })
})

describe('subArray', () => {
  test('subArray', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    const exp = arr.subArray(0, 2)
    expect(exp).toEqual([3, 4])

    const exp1 = arr.subArray(1, 2)
    expect(exp1).toEqual([2, 3])

    const exp2 = arr.subArray(0, -2)
    expect(exp2).toEqual([])
  })
})

describe('slice', () => {
  test('slice', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    const exp = arr.slice(0, 2)
    expect(exp).toEqual([3, 4])

    const exp1 = arr.slice(1, 2)
    expect(exp1).toEqual([3])

    const exp2 = arr.slice(1, -1)
    expect(exp2).toEqual([2, 3])

    const exp3 = arr.slice(0, -2)
    expect(exp3).toEqual([3, 4])

    const exp4 = arr.slice(-2, -1)
    expect(exp4).toEqual([2])
  })
})

describe('first', () => {
  test('first', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    const exp = arr.first()
    expect(exp).toBe(4)

    const exp1 = new ReversedArray().first()
    expect(exp1).toBe(undefined)
  })
})

describe('head', () => {
  test('head', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    const exp = arr.head(4)
    expect(exp).toEqual([1, 2, 3, 4])

    const exp1 = arr.head(-1)
    expect(exp1).toEqual([])

    const exp2 = arr.head(0)
    expect(exp2).toEqual([])
  })
})

describe('item', () => {
  test('item', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    const exp = arr.item(-1)
    expect(exp).toBe(1)

    const exp1 = arr.item(0)
    expect(exp1).toBe(4)

    const exp2 = arr.item(1)
    expect(exp2).toBe(3)

    const exp3 = arr.item(5)
    expect(exp3).toBe(undefined)
  })
})

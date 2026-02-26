import ReversedArray from '../src/reversedArray'

describe('constructor', () => {
  test('no-arg constructor produces empty array', () => {
    const arr = new ReversedArray()
    expect(arr.length()).toBe(0)
    expect(arr.value()).toEqual([])
  })

  test('initialises from provided array', () => {
    const arr = new ReversedArray([1, 2, 3])
    expect(arr.length()).toBe(3)
    expect(arr.value()).toEqual([1, 2, 3])
  })
})

describe('[Symbol.iterator]', () => {
  test('iterates in reversed-view order (newest first)', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect([...arr]).toEqual([4, 3, 2, 1])
  })

  test('iterating an empty array yields nothing', () => {
    expect([...new ReversedArray()]).toEqual([])
  })

  test('for-of loop yields same sequence as spread', () => {
    const arr = new ReversedArray([10, 20, 30])
    const result: number[] = []
    for (const v of arr) result.push(v)
    expect(result).toEqual([30, 20, 10])
  })
})

describe('push', () => {
  test('push single item', () => {
    const arr = new ReversedArray()
    arr.push([1, 2])
    arr.push(3)
    expect(arr.length()).toBe(3)
    expect(arr.item(0)).toBe(3)
  })

  test('push array of items', () => {
    const arr = new ReversedArray([1, 2])
    arr.push([3, 4])
    expect(arr.length()).toBe(4)
    expect(arr.item(0)).toBe(4)
  })

  test('push returns this for chaining', () => {
    const arr = new ReversedArray<number>()
    const result = arr.push(1).push(2).push(3)
    expect(result).toBe(arr)
    expect(arr.length()).toBe(3)
  })
})

describe('unshift', () => {
  test('unshift single item', () => {
    const arr = new ReversedArray([2, 3])
    arr.unshift(1)
    expect(arr.length()).toBe(3)
    expect(arr.item(-1)).toBe(1)
  })

  test('unshift array of items', () => {
    const arr = new ReversedArray([3, 4])
    arr.unshift([1, 2])
    expect(arr.length()).toBe(4)
    expect(arr.item(-1)).toBe(1)
  })

  test('unshift returns this for chaining', () => {
    const arr = new ReversedArray<number>()
    const result = arr.unshift(3).unshift(2).unshift(1)
    expect(result).toBe(arr)
    expect(arr.item(-1)).toBe(1)
  })
})

describe('length', () => {
  test('tracks length across mutations', () => {
    const arr = new ReversedArray([2, 3])
    expect(arr.length()).toBe(2)
    arr.unshift(1)
    expect(arr.length()).toBe(3)
    arr.push(4)
    expect(arr.length()).toBe(4)
  })

  test('empty() resets length to 0', () => {
    const arr = new ReversedArray([0])
    expect(arr.length()).toBe(1)
    arr.empty()
    expect(arr.length()).toBe(0)
  })
})

describe('value', () => {
  test('returns internal array in insertion order', () => {
    const arr = new ReversedArray([2, 3])
    expect(arr.value()).toEqual([2, 3])
    arr.unshift(1)
    expect(arr.value()).toEqual([1, 2, 3])
    arr.push(4)
    expect(arr.value()).toEqual([1, 2, 3, 4])
  })
})

describe('item', () => {
  test('positive indices access from newest end', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.item(0)).toBe(4)  // newest
    expect(arr.item(1)).toBe(3)
    expect(arr.item(2)).toBe(2)
    expect(arr.item(3)).toBe(1)  // oldest
  })

  test('negative indices access from oldest end', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.item(-1)).toBe(1)  // oldest
    expect(arr.item(-2)).toBe(2)
    expect(arr.item(-3)).toBe(3)
    expect(arr.item(-4)).toBe(4)
  })

  test('out-of-bounds index returns undefined', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.item(5)).toBeUndefined()
    expect(arr.item(-5)).toBeUndefined()
  })

  test('item on empty array returns undefined', () => {
    expect(new ReversedArray().item(0)).toBeUndefined()
  })
})

describe('subArray', () => {
  test('basic subarray extraction', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.subArray(0, 2)).toEqual([3, 4])
    expect(arr.subArray(1, 2)).toEqual([2, 3])
  })

  test('negative count returns empty array', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.subArray(0, -2)).toEqual([])
  })

  test('begin past end of array returns empty array', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.subArray(10, 2)).toEqual([])
  })
})

describe('slice', () => {
  test('basic slice [begin, end)', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.slice(0, 2)).toEqual([3, 4])
    expect(arr.slice(1, 2)).toEqual([3])
  })

  test('slice with negative indices', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.slice(1, -1)).toEqual([2, 3])
    expect(arr.slice(0, -2)).toEqual([3, 4])
    expect(arr.slice(-2, -1)).toEqual([2])
  })

  test('end past array length clamps to start', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    // end=10 is beyond the array; sliceStart clamps to 0
    expect(arr.slice(0, 10)).toEqual([1, 2, 3, 4])
  })

  test('begin past array length returns empty array', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.slice(10, 12)).toEqual([])
  })

  test('equal begin and end returns empty array', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.slice(1, 1)).toEqual([])
  })

  test('slice on empty array returns empty array', () => {
    expect(new ReversedArray().slice(0, 2)).toEqual([])
  })
})

describe('first', () => {
  test('returns the most recently pushed item (index 0)', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.first()).toBe(4)
  })

  test('returns undefined for empty array', () => {
    expect(new ReversedArray().first()).toBeUndefined()
  })
})

describe('head', () => {
  test('returns first n items from reversed view', () => {
    const arr = new ReversedArray([1, 2, 3, 4])
    expect(arr.head(4)).toEqual([1, 2, 3, 4])
  })

  test('n=0 returns empty array', () => {
    expect(new ReversedArray([1, 2, 3]).head(0)).toEqual([])
  })

  test('negative n returns empty array', () => {
    expect(new ReversedArray([1, 2, 3]).head(-1)).toEqual([])
  })

  test('n larger than length returns all items', () => {
    expect(new ReversedArray([1, 2, 3]).head(100)).toEqual([1, 2, 3])
  })
})

describe('empty', () => {
  test('clears the array', () => {
    const arr = new ReversedArray([0])
    arr.empty()
    expect(arr.length()).toBe(0)
    expect(arr.value()).toEqual([])
  })

  test('empty returns this for chaining', () => {
    const arr = new ReversedArray([1, 2, 3])
    expect(arr.empty()).toBe(arr)
  })
})

describe('update', () => {
  test('updates item at positive index', () => {
    const arr = new ReversedArray([0, 1])
    expect(arr.item(0)).toBe(1)
    arr.update(0, 2)
    expect(arr.item(0)).toBe(2)
  })

  test('updates item at negative index', () => {
    const arr = new ReversedArray([0, 1, 2])
    expect(arr.item(-1)).toBe(0) // oldest
    arr.update(-1, 99)
    expect(arr.item(-1)).toBe(99)
    expect(arr.item(0)).toBe(2)  // newest unchanged
  })

  test('update returns this for chaining', () => {
    const arr = new ReversedArray([1, 2, 3])
    expect(arr.update(0, 10).update(1, 20)).toBe(arr)
    expect(arr.item(0)).toBe(10)
    expect(arr.item(1)).toBe(20)
  })
})

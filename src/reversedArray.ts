export class ReversedArray<T = number> {
  private readonly _arr: T[] = []

  /**
   * Iterates in reversed-view order: index 0 (newest) first.
   * This is consistent with `item(0)` returning the most recently pushed value.
   */
  public [Symbol.iterator] (): Iterator<T> {
    let i = this._arr.length - 1
    const arr = this._arr
    return {
      next (): IteratorResult<T> {
        if (i >= 0) return { value: arr[i--], done: false }
        return { value: undefined as unknown as T, done: true }
      },
    }
  }

  constructor (arr?: T[]) {
    // No redundant `this._arr = []` — the field initializer above already does it.
    if (Array.isArray(arr)) {
      this._arr = arr
    }
  }

  private transfer (i: number) {
    return i >= 0 ? (this._arr.length - 1 - i) : (-i - 1)
  }

  item (index: number): T | undefined {
    return this._arr[this.transfer(index)]
  }

  /**
   * push新数据
   * @param items
   */
  push (items: T[] | T): this {
    if (Array.isArray(items)) {
      this._arr.push(...items)
    } else {
      this._arr.push(items)
    }
    return this
  }

  /**
   * push历史数据
   * @param items
   */
  unshift (items: T[] | T): this {
    if (Array.isArray(items)) {
      this._arr.unshift(...items)
    } else {
      this._arr.unshift(items)
    }
    return this
  }

  empty () {
    this._arr.length = 0
    return this
  }

  length () {
    return this._arr.length
  }

  value (): T[] {
    return this._arr
  }

  /**
   * 从起始索引号提取数组中指定数目的元素
   * @param begin
   * @param count
   */
  subArray (begin: number, count: number): T[] {
    count = count < 0 ? 0 : count
    const end = begin + count
    return this.slice(begin, end)
  }

  /**
   * 提取数组中两个指定的索引号之间的元素 [begin, end)
   * @param begin
   * @param end
   */
  slice (begin: number, end: number): T[] {
    const sliceStart = this.transfer(end) + 1 < 0 ? 0 : this.transfer(end) + 1
    const sliceEnd = this.transfer(begin) + 1
    // Guard begin out-of-bounds: transfer(begin)+1 ≤ 0 means begin is past the
    // end of the array in the reversed view, so the range is empty.
    if (sliceEnd <= 0 || sliceStart >= sliceEnd) return []
    return this._arr.slice(sliceStart, sliceEnd)
  }

  first (): T | undefined {
    return this._arr[this._arr.length - 1]
  }

  head (n: number): T[] {
    return this.subArray(0, n)
  }

  update (index: number, d: T) {
    this._arr[this.transfer(index)] = d
    
    return this
  }
}

export default ReversedArray

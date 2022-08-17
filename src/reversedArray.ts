export class ReversedArray<T = number> {
  private readonly _arr: any[] = []

  public [Symbol.iterator] () {
    return this._arr[Symbol.iterator]()
  }

  constructor (arr?: any[]) {
    this._arr = []
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
    return this._arr.slice(this.transfer(end) + 1 < 0 ? 0 : this.transfer(end) + 1, this.transfer(begin) + 1)
  }

  first (): T | undefined {
    return this._arr[this._arr.length - 1]
  }

  head (n: number): T[] {
    return this.subArray(0, n)
  }

  update (index: number, d: T) {
    this._arr[this.transfer(index)] = d
  }
}

export default ReversedArray

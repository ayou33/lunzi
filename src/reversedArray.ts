class ReversedArray<T = number> {
  private __baseArr: any[] = []

  public [Symbol.iterator] () {
    return this.__baseArr[Symbol.iterator]()
  }

  constructor (arr?: any[]) {
    this.__baseArr = []
    if (Array.isArray(arr)) {
      this.__baseArr = arr
    }
  }

  private indexCalc (i: number) {
    let index = 0
    if (i === 0) {
      index = this.__baseArr.length - 1
    } else if (i > 0) {
      index = (this.__baseArr.length - i - 1)
    } else {
      index = -(i + 1)
    }
    return index
  }

  item (index: number): T | undefined {
    return this.__baseArr[this.indexCalc(index)]
  }

  /**
   * push新数据
   * @param items
   */
  push (items: T[] | T): this {
    if (Array.isArray(items)) {
      this.__baseArr.push(...items)
    } else {
      this.__baseArr.push(items)
    }
    return this
  }

  /**
   * push历史数据
   * @param items
   */
  unshift (items: T[] | T): this {
    if (Array.isArray(items)) {
      this.__baseArr.unshift(...items)
    } else {
      this.__baseArr.unshift(items)
    }
    return this
  }

  length () {
    return this.__baseArr.length
  }

  value (): T[] {
    return this.__baseArr
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
    return this.__baseArr.slice(this.indexCalc(end) + 1 < 0 ? 0: this.indexCalc(end) + 1, this.indexCalc(begin) + 1)
  }

  first (): T | undefined {
    return this.__baseArr[this.__baseArr.length-1]
  }

  head (n: number): T[] {
    return this.subArray(0, n)
  }
}

export default ReversedArray

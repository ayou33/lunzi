/**
 * File: BitCount.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/9/2 11:49
 */
class BitCount {
  readonly radix: number
  timeout?: () => void
  parent: BitCount | null
  _value: number = 0
  
  constructor (value: number, parent: BitCount | null = null, radix = 10, timeout?: () => void) {
    if (radix < 2) {
      throw new Error('Radix must be greater than 1')
    }
    
    this.radix = radix
    this.parent = parent
    this._value = value
    this.timeout = timeout
    
    this.carryCheck(this._value)
  }
  
  private carryCheck (next: number) {
    if (next >= this.radix) {
      this._value = next % this.radix
      if (this.parent) {
        this.parent.add(1)
      } else {
        this.parent = new BitCount(1, null, this.radix)
      }
    }
  }
  
  private parentClip () {
    if (this.parent && this.parent._value <= 0 && !this.parent.parent) {
      this.parent = null
    }
  }
  
  add (value: number): BitCount {
    const nextValue = this._value + value
    
    if (nextValue < this.radix && nextValue >= 0) {
      
      this._value = nextValue
      return this
    }
    
    // 进位
    this.carryCheck(nextValue)
    
    // 借位
    if (nextValue < 0) {
      if (this.parent && this.parent._value > 0) {
        this._value = this.radix + nextValue
        
        this.parent.add(-1)
        
        this.parentClip()
      } else {
        this._value = nextValue
      }
    }
    
    if (nextValue === 0 && !this.parent) {
      this.timeout?.()
    }
    
    return this
  }
  
  values () {
    const values: number[] = [this._value]
    let parent = this.parent
    
    while (parent) {
      values.unshift(parent._value)
      parent = parent.parent
    }
    
    return values
  }
  
  bitValue () {
    return this._value
  }
  
  value (): number {
    let value = this._value
    
    let radix = 1
    let parent = this.parent
    
    while (parent) {
      radix *= parent.radix
      value += parent._value * radix
      parent = parent.parent
    }
    
    return value
  }
}

export default BitCount

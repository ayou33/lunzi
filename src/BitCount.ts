/**
 * File: BitCount.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/9/2 11:49
 */
export type BitCountOptions = {
  radix: number;
  target?: number;
  onComplete?: () => void
}

class BitCount {
  readonly options: BitCountOptions;
  parent: BitCount | null
  _value: number = 0
  _number: number = 0
  
  constructor (number: number, parent: BitCount | null = null, options: {
    radix: number;
    target?: number;
    onComplete?: () => void
  }) {
    this.options = Object.assign({
      radix: 10,
      target: 0,
    }, options)
    
    if (this.options.radix < 2) {
      throw new Error('Radix must be greater than 1')
    }
    
    if (number < 0) {
      throw new Error('Number must be a non-negative integer')
    }
    
    this.parent = parent
    this._number = number
    this.carryCheck(this._number)
    this._value = this.value()
    this.checkValue()
  }
  
  private checkValue () {
    if (this._value === this.options.target) {
      this.options.onComplete?.()
    }
  }
  
  private carryCheck (next: number) {
    if (next >= this.options.radix) {
      this._number = next % this.options.radix
      if (this.parent) {
        this.parent.add(1)
      } else {
        this.parent = new BitCount(Math.floor(next / this.options.radix), null, {
          radix: this.options.radix,
          target: this.options.target,
        })
      }
    }
  }
  
  add (step: number): BitCount {
    this._value += step
    
    this.checkValue()
    
    const number = this._number + step
    
    if (number < this.options.radix) {
      if (number >= 0) {
        this._number = number
        return this
      } else {
        // 借位
        if (this.parent && this.parent._value > 0) {
          this._number = this.options.radix + number
          
          this.parent.add(-1)
        } else {
          this._number = number
        }
      }
    } else {
      // 进位
      this.carryCheck(number)
    }
    
    return this
  }
  
  values () {
    const values: number[] = [this._number]
    let parent = this.parent
    
    while (parent) {
      values.unshift(parent._number)
      parent = parent.parent
    }
    
    return values
  }
  
  bitValue () {
    return this._number
  }
  
  value (): number {
    let value = this._number
    
    let radix = 1
    let parent = this.parent
    
    while (parent) {
      radix *= parent.options.radix
      value += parent._number * radix
      parent = parent.parent
    }
    
    if (Number.isNaN(value)) {
      throw new Error('Value is NaN, please make sure that the radix and the number are valid integers')
    }
    
    return value
  }
}

export default BitCount

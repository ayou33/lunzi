/**
 * File: bitCount.test.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/9/2 11:50
 */
import BitCount from '../src/BitCount'

describe('BitCount', () => {
  describe('calc', () => {
    it('add without carry', () => {
      const bitCount = new BitCount(0)
      bitCount.add(1)
      expect(bitCount.bitValue()).toBe(1)
    })
    
    it('plus with carry', () => {
      const bitCount = new BitCount(0)
      bitCount.add(10)
      expect(bitCount.bitValue()).toBe(0)
      expect(bitCount.value()).toBe(10)
    })
    
    it('minus without borrow', () => {
      const bitCount = new BitCount(10)
      bitCount.add(-1)
      expect(bitCount.bitValue()).toBe(9)
    })
    
    it('minus without parent borrow', () => {
      const bitCount = new BitCount(0)
      bitCount.add(-1)
      expect(bitCount.bitValue()).toBe(0)
      expect(bitCount.value()).toBe(0)
    })
    
    it('minus with parent borrow', () => {
      const parent = new BitCount(1)
      const bitCount = new BitCount(0, parent, { autoPrune: true })
      bitCount.add(-1)
      expect(bitCount.bitValue()).toBe(9)
      expect(bitCount.value()).toBe(9)
      expect(bitCount.parent).toBe(null)
    })
  })
  
  describe('evaluate', () => {
    it('values without parent', () => {
      const bitCount = new BitCount(10)
      expect(bitCount.values()).toEqual([1, 0])
      expect(bitCount.bitValue()).toBe(0)
      expect(bitCount.value()).toBe(10)
    })
    
    it('values with parent', () => {
      const parent = new BitCount(1)
      const bitCount = new BitCount(10, parent)
      expect(bitCount.values()).toEqual([2, 0])
      expect(bitCount.bitValue()).toBe(0)
      expect(bitCount.value()).toBe(20)
    })
    
    it('values with parent parent', () => {
      const parentParent = new BitCount(1)
      const parent = new BitCount(1, parentParent)
      const bitCount = new BitCount(10, parent)
      expect(bitCount.values()).toEqual([1, 2, 0])
      expect(bitCount.bitValue()).toBe(0)
      expect(bitCount.value()).toBe(120)
    })
    
    it('values with different radix', () => {
      const parentParent = new BitCount(1, null, 60)
      const parent = new BitCount(1, parentParent, 60)
      const bitCount = new BitCount(2, parent, 60)
      expect(bitCount.values()).toEqual([1, 1, 2])
      expect(bitCount.bitValue()).toBe(2)
      expect(bitCount.value()).toBe(3662)
    })
  })

  describe('constructor guards', () => {
    // Line 43: radix < 2 should throw
    it('throws when radix is less than 2', () => {
      expect(() => new BitCount(0, null, { radix: 1 })).toThrow('Radix must be greater than 1')
    })

    it('throws when radix is 0', () => {
      expect(() => new BitCount(0, null, { radix: 0 })).toThrow('Radix must be greater than 1')
    })

    // Line 47: negative initial number should throw
    it('throws when initial number is negative', () => {
      expect(() => new BitCount(-1)).toThrow('Number must be a non-negative integer')
    })
  })

  describe('value() NaN guard (lines 169-173)', () => {
    it('returns 0 and logs an error when _number is NaN', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const bitCount = new BitCount(0)
      // Force an internal NaN to exercise the guard
      ;(bitCount as any)._number = NaN

      expect(bitCount.value()).toBe(0)
      expect(errorSpy).toHaveBeenCalledWith(
        'BitCount: value() produced NaN',
        expect.objectContaining({ number: NaN }),
      )

      errorSpy.mockRestore()
    })

    it('returns 0 and logs an error when a parent _number is NaN', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const parent = new BitCount(1)
      const bitCount = new BitCount(0, parent)
      // Corrupt the parent digit
      ;(bitCount.parent as any)._number = NaN

      expect(bitCount.value()).toBe(0)
      expect(errorSpy).toHaveBeenCalled()

      errorSpy.mockRestore()
    })
  })
})

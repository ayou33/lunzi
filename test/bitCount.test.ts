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
      expect(bitCount.bitValue()).toBe(-1)
      expect(bitCount.value()).toBe(-1)
    })
    
    it('minus with parent borrow', () => {
      const parent = new BitCount(1)
      const bitCount = new BitCount(0, parent)
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
})

/**
 * File: reactive.test.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/17 14:44
 */
import { createSignal, createEffect } from '../src/reactive'

describe('reactive', () => {
  test('createSignal', () => {
    const [signal, setSignal] = createSignal(0)
    expect(signal()).toBe(0)
    setSignal(1)
    expect(signal()).toBe(1)
  })
  
  test('createSignal and effect', () => {
    const [signal, setSignal] = createSignal(0)
    let count = 0
    const effect = jest.fn(() => {
      count = signal()
    })
    const clear = createEffect(effect)
    expect(count).toBe(0)
    expect(effect).toBeCalledTimes(1)
    setSignal(1)
    expect(count).toBe(1)
    expect(effect).toBeCalledTimes(2)
    clear()
    setSignal(1)
    expect(effect).toBeCalledTimes(2)
  })
  
  test('dynamic dependency', () => {
    const [signal1, setSignal1] = createSignal(0)
    const [signal2, setSignal2] = createSignal(0)
    const [flag, setFlag] = createSignal(true)
    let count = 0
    const effect = jest.fn(() => {
      if (flag()) {
        count = signal1()
      } else {
        count = signal2()
      }
    })
    const clear = createEffect(effect)
    expect(count).toBe(0)
    expect(effect).toBeCalledTimes(1)
    setSignal1(1)
    expect(count).toBe(1)
    expect(effect).toBeCalledTimes(2)
    setFlag(false)
    setSignal2(1)
    expect(count).toBe(1)
    expect(effect).toBeCalledTimes(4)
    setSignal1(2)
    expect(count).toBe(1)
    expect(effect).toBeCalledTimes(4)
    clear()
  })
})

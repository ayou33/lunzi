/**
 * File: stateQueue.test.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/3 16:55
 */
import StateQueue from '../src/stateQueue'

describe('stateQueue', () => {
  const fn = (state: number) => state + 1

  test('状态队列', () => {
    const state = 1
    const result = fn(state)

    expect(StateQueue(fn)(state)).toBe(result)
  })
})

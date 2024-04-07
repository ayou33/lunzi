/**
 * File: fetch.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/7 18:46
 */
import { get } from '../src/tools/fetch'

describe('fetch', () => {
  it('get', () => {
    get('http://localhost:5173').then(resp => {
      console.log(resp)
      expect(resp).toBe('Helo World')
    })
  })
})

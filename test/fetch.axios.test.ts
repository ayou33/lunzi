/**
 * File: fetch.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/7 18:46
 */
import { get, post, cancel } from '../src/tools/fetch.axios'

const getLocal = get('https://testweb.ddwawa.com/api/user/userinfo')

describe('fetch', () => {
  test('get', async () => {
    const id = 'jojo'
    const ecb = jest.fn()
    await getLocal(null, {
      id,
      label: 'test',
      expireIn: 1000,
    })
      .catch(ecb)
      .finally(() => {
        expect(ecb).toBeCalledTimes(0)
      })
    
    cancel('j')
  })
  
  test('post', async () => {
    const id = 'jojo'
    const ecb = jest.fn()
    await post('https://testweb.ddwawa.com/api/user/userinfo')(null, {
      id,
      label: 'test',
      expireIn: 1000,
    })
      .catch(ecb)
      .finally(() => {
        expect(ecb).toBeCalledTimes(0)
      })
  })
})

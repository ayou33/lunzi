/**
 * File: fetch.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/7 18:46
 */
import { get, post, cancel } from '../src/tools/fetch.axios'

const getLocal = get('https://testweb.ddwawa.com/api/user/userinfo', {
  id: 'get'
})

describe('fetch', () => {
  test('get', async () => {
    const ecb = jest.fn()
    await getLocal()
      .catch(ecb)
      .finally(() => {
        expect(ecb).toBeCalledTimes(0)
      })
    
    cancel('get')
  })
  
  test('post', async () => {
    const ecb = jest.fn()
    
    await post('https://testweb.ddwawa.com/api/user/userinfo')()
      .catch(ecb)
      .finally(() => {
        expect(ecb).toBeCalledTimes(0)
      })
  })
})

/**
 * File: store.test.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/15 11:21
 */
import { TextEncoder } from 'util'
import { localSet, localGet, localRemove, localClear, sessionSet, sessionGet } from '../src/store'

global.TextEncoder = TextEncoder

describe('localStorage', () => {
  afterEach(() => {
    localStorage.clear()
  })
  
  test('regular key getter/setter', () => {
    const key = 'test_key'
    const value = 'test_value'
    localSet(key, value)
    expect(localGet(key)).toBe(value)
  })
  
  test('group key getter/setter', () => {
    const key = 'test_key'
    const name = 'test_name'
    const value = 'test_value'
    const groupKey = `${key}:${name}`
    localSet(groupKey, value)
    expect(localGet(groupKey)).toBe(value)
  })
  
  test('paths key getter/setter', () => {
    const key = 'test_key'
    const name = 'name'
    const name_value = 'test_value'
    const age = 'age'
    const age_value = 12
    const value = { [name]: name_value }
    localSet(key, JSON.stringify(value))
    localSet(`${key}.${age}`, age_value)
    expect(localGet(`${key}.${name}`)).toBe(name_value)
    expect(localGet(`${key}.${age}`)).toBe(age_value)
  })
  
  test('paths key with array getter/setter', () => {
    const key = 'test_key'
    const arr0 = 0
    const arr0Key = `${key}.arr.${arr0}`
    expect(localGet(arr0Key)).toBe(null)
    localSet(arr0Key, arr0)
    expect(localGet(`${key}.arr`)).toBeInstanceOf(Array)
    expect(localGet(`${key}.arr`)).toHaveLength(1)
    expect(localGet(arr0Key)).toBe(arr0)
  })
  
  test('paths key with array insert getter/setter', () => {
    const key = 'test_key'
    localSet(`${key}.arr.0`, 0)
    expect(localGet(`${key}.arr`)).toHaveLength(1)
    expect(localGet(`${key}.arr.0`)).toBe(0)
    localSet(`${key}.arr.0`, 1)
    expect(localGet(`${key}.arr.0`)).toBe(1)
    localSet(`${key}.arr.[0]`, 0)
    expect(localGet(`${key}.arr`)).toHaveLength(2)
    expect(localGet(`${key}.arr.0`)).toBe(0)
    localSet(`${key}.arr.[-1]`, 2)
    expect(localGet(`${key}.arr`)).toHaveLength(3)
    expect(localGet(`${key}.arr.2`)).toBe(2)
  })
  
  test('remove key', () => {
    const key = 'test_key'
    const value = 'test_value'
    localSet(key, value)
    expect(localGet(key)).toBe(value)
    localRemove(key)
    expect(localGet(key)).toBe(null)
  })
  
  test('clear all', () => {
    localSet('a', 1)
    localSet('b', 2)
    expect(localGet('a')).toBe('1')
    localClear()
    expect(localGet('b')).toBe(null)
  })
})

describe('sessionStorage', () => {
  afterEach(() => {
    sessionStorage.clear()
  })
  
  test('regular key getter/setter', () => {
    const key = 'test_key'
    const value = 'test_value'
    sessionSet(key, value)
    expect(sessionGet(key)).toBe(value)
  })
  
  test('group key getter/setter', () => {
    const key = 'test_key'
    const name = 'test_name'
    const value = 'test_value'
    const groupKey = `${key}:${name}`
    sessionSet(groupKey, value)
    expect(sessionGet(groupKey)).toBe(value)
  })
  
  test('paths key getter/setter', () => {
    const key = 'test_key'
    const name = 'name'
    const name_value = 'test_value'
    const age = 'age'
    const age_value = 12
    const value = { [name]: name_value }
    sessionSet(key, JSON.stringify(value))
    sessionSet(`${key}.${age}`, age_value)
    expect(sessionGet(`${key}.${name}`)).toBe(name_value)
    expect(sessionGet(`${key}.${age}`)).toBe(age_value)
  })
  
})

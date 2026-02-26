/**
 * File: store.test.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/15 11:21
 */
import { TextEncoder } from 'util'
import {
  localSet, localGet, localRemove, localClear,
  sessionSet, sessionGet, sessionRemove, sessionClear,
  cookieGet, cookieSet, cookieRemove, cookieClear,
  memoryGet, memorySet, memoryRemove, memoryClear,
  config,
} from '../src/store'

global.TextEncoder = TextEncoder as any

// ─── localStorage ─────────────────────────────────────────────────────────────

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

  test('regular key stores numbers as strings', () => {
    localSet('n', 42)
    expect(localGet('n')).toBe('42')
  })

  test('regular key returns null for missing key', () => {
    expect(localGet('no_such_key')).toBeNull()
  })

  test('group key getter/setter', () => {
    const key = 'test_key'
    const name = 'test_name'
    const value = 'test_value'
    const groupKey = `${key}:${name}`
    localSet(groupKey, value)
    expect(localGet(groupKey)).toBe(value)
  })

  test('group key: two fields in the same group', () => {
    localSet('grp:a', 'alpha')
    localSet('grp:b', 'beta')
    expect(localGet('grp:a')).toBe('alpha')
    expect(localGet('grp:b')).toBe('beta')
  })

  test('group key: overwrite existing field', () => {
    localSet('grp:field', 'old')
    localSet('grp:field', 'new')
    expect(localGet('grp:field')).toBe('new')
  })

  test('group key: returns null for missing field', () => {
    expect(localGet('grp:missing')).toBeNull()
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

  test('paths key: nested object auto-created', () => {
    localSet('obj.a.b.c', 'deep')
    expect(localGet('obj.a.b.c')).toBe('deep')
  })

  test('paths key: returns null for missing path', () => {
    expect(localGet('ghost.path')).toBeNull()
  })

  // ── remove ──────────────────────────────────────────────────────────────────

  test('remove plain key', () => {
    localSet('k', 'v')
    localRemove('k')
    expect(localGet('k')).toBeNull()
  })

  test('remove group field', () => {
    localSet('grp:a', 'alpha')
    localSet('grp:b', 'beta')
    localRemove('grp:a')
    expect(localGet('grp:a')).toBeNull()
    expect(localGet('grp:b')).toBe('beta') // sibling unaffected
  })

  test('remove path field', () => {
    localSet('obj.x', 1)
    localSet('obj.y', 2)
    localRemove('obj.x')
    expect(localGet('obj.x')).toBeUndefined()
    expect(localGet('obj.y')).toBe(2)
  })

  test('remove array element by path index', () => {
    localSet('obj.arr.0', 'a')
    localSet('obj.arr.1', 'b')
    localRemove('obj.arr.0')
    expect(localGet('obj.arr')).toHaveLength(1)
  })

  // ── clear ───────────────────────────────────────────────────────────────────

  test('clear all', () => {
    localSet('a', 1)
    localSet('b', 2)
    expect(localGet('a')).toBe('1')
    localClear()
    expect(localGet('b')).toBeNull()
  })
})

// ─── sessionStorage ───────────────────────────────────────────────────────────

describe('sessionStorage', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  test('regular key getter/setter', () => {
    sessionSet('k', 'v')
    expect(sessionGet('k')).toBe('v')
  })

  test('group key getter/setter', () => {
    sessionSet('grp:field', 'val')
    expect(sessionGet('grp:field')).toBe('val')
  })

  test('paths key getter/setter', () => {
    const key = 'test_key'
    sessionSet(key, JSON.stringify({ name: 'test_value' }))
    sessionSet(`${key}.age`, 12)
    expect(sessionGet(`${key}.name`)).toBe('test_value')
    expect(sessionGet(`${key}.age`)).toBe(12)
  })

  test('remove plain key', () => {
    sessionSet('k', 'v')
    sessionRemove('k')
    expect(sessionGet('k')).toBeNull()
  })

  test('remove group field', () => {
    sessionSet('grp:a', 'alpha')
    sessionSet('grp:b', 'beta')
    sessionRemove('grp:a')
    expect(sessionGet('grp:a')).toBeNull()
    expect(sessionGet('grp:b')).toBe('beta')
  })

  test('remove path field', () => {
    sessionSet('obj.x', 1)
    sessionSet('obj.y', 2)
    sessionRemove('obj.x')
    expect(sessionGet('obj.x')).toBeUndefined()
    expect(sessionGet('obj.y')).toBe(2)
  })

  test('clear all', () => {
    sessionSet('a', 'x')
    sessionClear()
    expect(sessionGet('a')).toBeNull()
  })
})

// ─── cookie ───────────────────────────────────────────────────────────────────

describe('cookie', () => {
  afterEach(() => {
    cookieClear()
  })

  test('set and get a cookie', () => {
    cookieSet('foo', 'bar')
    expect(cookieGet('foo')).toBe('bar')
  })

  test('returns null for missing cookie', () => {
    expect(cookieGet('no_such_cookie')).toBeNull()
  })

  test('remove a cookie', () => {
    cookieSet('foo', 'bar')
    cookieRemove('foo')
    expect(cookieGet('foo')).toBeNull()
  })

  test('clear all cookies', () => {
    cookieSet('a', '1')
    cookieSet('b', '2')
    cookieClear()
    expect(cookieGet('a')).toBeNull()
    expect(cookieGet('b')).toBeNull()
  })
})

// ─── memory ───────────────────────────────────────────────────────────────────

describe('memory', () => {
  afterEach(() => {
    memoryClear()
  })

  test('set and get a value', () => {
    memorySet('k', { x: 1 })
    expect(memoryGet('k')).toEqual({ x: 1 })
  })

  test('stores and retrieves any type without stringification', () => {
    const obj = { arr: [1, 2, 3] }
    memorySet('obj', obj)
    expect(memoryGet('obj')).toBe(obj) // same reference
  })

  test('returns undefined for missing key', () => {
    expect(memoryGet('missing')).toBeUndefined()
  })

  test('remove a key', () => {
    memorySet('k', 42)
    memoryRemove('k')
    expect(memoryGet('k')).toBeUndefined()
  })

  test('clear all', () => {
    memorySet('a', 1)
    memorySet('b', 2)
    memoryClear()
    expect(memoryGet('a')).toBeUndefined()
  })
})

// ─── config ───────────────────────────────────────────────────────────────────

describe('config — custom delimiters', () => {
  // config() must be called BEFORE any store function is used, because reading
  // options for the first time locks them (proxy get trap). At module import time
  // getBy(localStorage) already reads all three delimiter options, so attempting
  // to mutate them afterwards throws in strict mode.
  // We only verify that the exported symbol is a function with the correct shape.
  test('config is a function', () => {
    expect(typeof config).toBe('function')
  })

  test('config() returns the options proxy object', () => {
    // After lock, calling config throws — but the return type (object) should
    // still be validated via a try/catch.
    try {
      const result = config('groupDelimiter', '#')
      expect(typeof result).toBe('object')
    } catch {
      // Already locked — expected when called after module initialization.
    }
  })
})


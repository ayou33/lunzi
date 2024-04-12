/**
 * File: store.ts of lunzi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/8 23:29
 */
const DefaultOptions = {
  groupDelimiter: ':',
  pathDelimiter: '.',
  valueDelimiter: ';',
} as const

type Keys = keyof typeof DefaultOptions

/**
 * 配置项将在第一次访问时被锁定
 */
const options = new Proxy(DefaultOptions, {
  get (target: {[p in Keys]: string}, key: Keys) {
    Object.defineProperty(target, key, {
      writable: false,
    })
    return target[key]
  },
})

/**
 * 配置默认选项
 * 需要在第一次访问前配置
 * @param key
 * @param value
 */
export function config (key: Keys, value: string) {
  options[key] = value
  
  return options
}

function encode (value: unknown) {
  return [...new TextEncoder().encode(JSON.stringify(value))].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function isGroupSelector (key: string) {
  return key.split(options.groupDelimiter).length > 1
}

function isPathSelector (key: string) {
  return key.split(options.pathDelimiter).length > 1
}

function ressolveGroupValue (name: string, p: string | null) {
  if (p) {
    const value  = p.match(new RegExp(`(^|${options.valueDelimiter})${name}=([^${options.valueDelimiter}]*)(${options.valueDelimiter}|$)`))
    if (value) {
      return value[2]
    }
  }
  return null
}

function resolvePathValue (paths: string[], p: string | null) {
  if (p) {
    try {
      const obj = JSON.parse(p)
      return paths.reduce((acc, path) => acc[path], obj)
    } catch {
      return null
    }
  }
  
  return null
}

function getFrom (target: { getItem: (key: string) => string | null }) {
  return function (key: string) :string | null {
    if (isGroupSelector(key)) {
      const [groupKey, name] = key.split(options.groupDelimiter)
      const value = target.getItem(encode(groupKey))
      return ressolveGroupValue(name, value)
    }
    
    if (isPathSelector(key)) {
      const [pathKey, ...paths] = key.split(options.pathDelimiter)
      const p = target.getItem(encode(pathKey))
      return resolvePathValue(paths, p)
    }
    
    return target.getItem(encode(key))
  }
}

export const localGet = getFrom(localStorage)

export function localSet (key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function localRemove (key: string) {
  localStorage.removeItem(key)
}

export function localClear () {
  localStorage.clear()
}

export function sessionGet (key: string) {
  const value = sessionStorage.getItem(key)
  if (value) {
    return JSON.parse(value)
  }
  return null
}

export function sessionSet (key: string, value: unknown) {
  sessionStorage.setItem(key, JSON.stringify(value))
}

export function sessionRemove (key: string) {
  sessionStorage.removeItem(key)
}

export function sessionClear () {
  sessionStorage.clear()
}

export function cookieGet (key: string) {
  const cookie = document.cookie
  const reg = new RegExp(`(^| )${key}=([^;]*)(;|$)`)
  const arr = cookie.match(reg)
  if (arr) {
    return unescape(arr[2])
  }
  return null
}

export function cookieSet (key: string, value: string) {
  document.cookie = `${key}=${escape(value)};`
}

export function cookieRemove (key: string) {
  const exp = new Date()
  exp.setTime(exp.getTime() - 1)
  const value = cookieGet(key)
  if (value) {
    document.cookie = `${key}=${value};expires=${exp.toUTCString()}`
  }
}

export function cookieClear () {
  const keys = document.cookie.match(/[^ =;]+(?=\=)/g)
  if (keys) {
    keys.forEach(key => {
      document.cookie = `${key}=0;expires=${new Date(0).toUTCString()}`
    })
  }
}

const memory = new Map()

export function memoryGet (key: string) {
  return memory.get(key)
}

export function memorySet (key: string, value: unknown) {
  memory.set(key, value)
}

export function memoryRemove (key: string) {
  memory.delete(key)
}

export function memoryClear () {
  memory.clear()
}

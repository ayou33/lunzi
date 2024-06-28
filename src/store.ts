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
  get (target: { [p in Keys]: string }, key: Keys) {
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

function parseGroupValue (name: string, p: string | null) {
  if (p) {
    const value = p.match(new RegExp(`(^|${options.valueDelimiter})${name}=([^${options.valueDelimiter}]*)(${options.valueDelimiter}|$)`))
    if (value) {
      return value[2]
    }
  }
  return null
}

function parsePathValue (paths: string[], p: string | null) {
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

function getBy (target: { getItem: (key: string) => string | null }) {
  return function (key: string): string | null {
    if (isGroupSelector(key)) {
      const [groupKey, name] = key.split(options.groupDelimiter)
      const value = target.getItem(encode(groupKey))
      return parseGroupValue(name, value)
    }
    
    if (isPathSelector(key)) {
      const [pathKey, ...paths] = key.split(options.pathDelimiter)
      const p = target.getItem(encode(pathKey))
      return parsePathValue(paths, p)
    }
    
    return target.getItem(encode(key))
  }
}

function isInsertIndex (key: string) {
  return /^\[-?\d+]$/.test(key)
}

function isArrayIndex (key: string) {
  return /^\d+$/.test(key) || isInsertIndex(key)
}

function formatPathValue (paths: string[], value: unknown, p: string | null) {
  if (paths.length === 0) return null
  
  try {
    const obj = JSON.parse(p ?? (isArrayIndex(paths[0]) ? '[]' : '{}'))
    let current = obj
    let index = 0
    let path = paths[index]
    
    while (index < paths.length - 1) {
      if (current[path] === undefined) {
        current[path] = isArrayIndex(paths[index + 1]) ? [] : {}
      }
      
      current = current[path]
      path = paths[++index]
    }
    
    if (isInsertIndex(path)) {
      const position = Number(path.slice(1, -1))
      const index = position < 0 ? (current.length + position + 1) : position
      current.splice(index, 0, value)
    } else {
      current[path] = value
    }
    
    return JSON.stringify(obj)
  } catch {
    return null
  }
}

function formatGroupValue (name: string, value: unknown, p: string | null) {
  if (p) {
    const reg = new RegExp(`(^|${options.valueDelimiter})${name}=[^${options.valueDelimiter}]*(${options.valueDelimiter}|$)`)
    return p.replace(reg, `$1${name}=${value}$2`)
  }
  return `${name}=${value}`
}

function setBy (target: {
  getItem: (key: string) => string | null,
  setItem: (key: string, value: string) => void
}) {
  return function (key: string, value: string) {
    if (isGroupSelector(key)) {
      const [groupKey, name] = key.split(options.groupDelimiter)
      const groupValue = target.getItem(encode(groupKey))
      target.setItem(encode(groupKey), formatGroupValue(name, value, groupValue))
      return
    }
    
    if (isPathSelector(key)) {
      const [pathKey, ...paths] = key.split(options.pathDelimiter)
      const pathValue = target.getItem(encode(pathKey))
      const nextValue = formatPathValue(paths, value, pathValue)
      if (nextValue) {
        target.setItem(encode(pathKey), nextValue)
      }
      return
    }
    
    target.setItem(encode(key), value)
  }
}

function dropGroupValue (name: string, p: string) {
  const reg = new RegExp(`(^|${options.valueDelimiter})${name}=[^${options.valueDelimiter}]*(${options.valueDelimiter}|$)`)
  return p.replace(reg, '')
}

function removePath (paths: string[], p: string) {
  const obj = JSON.parse(p)
  let current = obj
  let index = 0
  let pathKey = paths[index]
  
  while (index < paths.length - 1) {
    if (current[pathKey] === undefined) {
      return
    }
    
    current = current[pathKey]
    pathKey = paths[++index]
  }
  
  if (isInsertIndex(pathKey)) {
    const position = Number(pathKey.slice(1, -1))
    const index = position < 0 ? (current.length + position + 1) : position
    current.splice(index, 1)
  } else {
    delete current[pathKey]
  }
  
  return JSON.stringify(obj)
}

function removeBy (target: {
  removeItem: (key: string) => void,
  getItem: (key: string) => string | null,
  setItem: (key: string, value: string) => void
}) {
  return function (key: string) {
    if (isGroupSelector(key)) {
      const [groupKey, name] = key.split(options.groupDelimiter)
      const groupValue = target.getItem(encode(groupKey))
      if (groupValue) {
        target.setItem(encode(groupKey), dropGroupValue(name, groupValue))
      }
      return
    }
    
    if (isPathSelector(key)) {
      const [pathKey, ...paths] = key.split(options.pathDelimiter)
      const p = target.getItem(encode(pathKey))
      
      if (p) {
        const nextValue = removePath(paths, p)
        if (nextValue) {
          target.setItem(encode(pathKey), nextValue)
        }
      }
      return
    }
    
    target.removeItem(encode(key))
  }
}

export const localGet = getBy(localStorage)

export const localSet = setBy(localStorage)

export const localRemove = removeBy(localStorage)

export function localClear () {
  localStorage.clear()
}

export const sessionGet = getBy(sessionStorage)

export const sessionSet = setBy(sessionStorage)

export function sessionRemove (key: string) {
  sessionStorage.removeItem(encode(key))
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

const memory = new Map<string, unknown>()

export function memoryGet<T> (key: string) {
  return memory.get(key) as T
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

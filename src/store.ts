/**
 * File: store.ts of lunzi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/8 23:29
 */
export function localGet (key: string) {
  if (key) {
    return localStorage.getItem(key)
  }
  
  return null
}

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

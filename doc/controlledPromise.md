### 定义

```typescript
function controlledPromise<T> (
  executor?: (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: string | Error) => void,
  ) => void,
  controller?: AbortController,
) : [promise: Promise<T>, abort: () => void]
```

### 依赖

 - 无

### 场景

 - `controlledPromise` 用于创建一个可以手动终止的 `Promise` 对象。

### 使用

```typescript
import controlledPromise from 'lunzi/controlledPromise'

const [promise, abort] = controlledPromise<number>((resolve, reject) => {
  setTimeout(() => {
    resolve(1)
  }, 1000)
})

promise
  .then(console.log)
  .catch(console.error)

abort()

```

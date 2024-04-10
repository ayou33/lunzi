### 定义
```typescript
type StateFetchConfig = {
  id?: string; // for cancel control
  label?: string; // for batch cancel control
  priority?: number; // for queue order control default 0
  expireIn?: number; // for cache control; cache duration(ms)
}

type StateConfig = {
  url: string; // for repeat control
  data?: Data // optional for repeat control
} & StateFetchConfig

interface StateFetch {
  (parallel = 3): {
    send<T, C extends StateConfig> (fetch: (config: C) => Promise<T>, config: C): Promise<T>;
    cancel (idOrLable: string | Array<string>): void;
    // @param staste {QueueState} @see stateQueue.ts
    on (state: QueueState, handler: () => void, oneOff: boolean = false): void;
  }
}
```

### 依赖
- [stateQueue](./stateQueue.md)

### 场景
 - 控制请求并发数
 - 分级请求优先级
 - 共享重复请求结果
 - 取消请求
 - 缓存请求结果

### 使用
```typescript
import stateFetch from 'lunzi/stateFetch'

const { send, cancel, on } = useFetch(2)

function requestProxy (params) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Date.now())
    }, 1000)
  })
}

const label = 'task'

const request1 = { url: 'http://localhost:3000', data: { a: 1 }, label }
const request2 = { url: 'http://localhost:3000', data: { a: 2 }, label }
const request3 = { url: 'http://localhost:3000', data: { a: 3 }, label }
const request4 = { url: 'http://localhost:3000', data: { a: 4 }, label, priority: 1 }

send(requestProxy, request1)
send(requestProxy, request1) // 共享request1的结果 不计入并发数
send(requestProxy, request2)
send(requestProxy, request3) // 因为并发数为2，所以会等待request1或request2完成后再发送
send(requestProxy, request4) // 优先级高，会在request3之前发送

// cancel request
cancel(label) // 同时移除待执行队列和执行队列中label为request的请求 

// on的使用参考stateQueue
```

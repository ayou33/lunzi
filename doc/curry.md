### 定义

```typescript
function curry (fn: Function): Function

function curryN (n: number, fn: Function, args?: any[]): Function
```

### 依赖

 - 无

### 场景

函数柯里化

### 使用

```typescript
import { curry, curryN } from 'lunze/currey'

const add = (a, b, c = 3) => a + b + c

const curriedAdd = curry(add)

curriedAdd(1)(2)(3) // 6

const curriedAddN = curryN(2, add)

curriedAddN(1)(2) // 6
```

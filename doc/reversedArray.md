### 定义
```typescript
interface ReversedArray<T> {
  new (initial?: T[]): this;
  
  item (index: number): T | undefined;
  
  push (items: T | T[]): this;
  
  unshift (items: T | T[]): this;
  
  empty (): this;
  
  length (): number;
  
  value (): T[];
  
  subArray (begin: number, count: number): T[];
  
  slice (begin: number, end: number): T[];
  
  first (): T | undefined;
  
  head (n: number): T[];
  
  update (index: number, v: T): this;
}
```

### 依赖
- 无

### 场景
- 逆序数组 将所有索引相关的操作按逆序处理

### 使用
```typescript
import ReversedArray from 'lunzi/reversedArray'

const arr = new ReversedArray<number>([1, 2, 3, 4, 5])

arr.item(0) // 5

arr.push(6) // [1, 2, 3, 4, 5, 6]

arr.unshift(0) // [0, 1, 2, 3, 4, 5, 6]

arr.subArray(1, 3) // [3, 4, 5]

arr.slice(1, 2) // [4, 5]

arr.first() // 6

arr.head(3) // [4, 5, 6]

arr.empty() // []

arr.length() // 0

arr.value() // []


```

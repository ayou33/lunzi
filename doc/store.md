### 定义
```typescript
const DefaultOptions = {
  groupDelimiter: ':',
  pathDelimiter: '.',
  valueDelimiter: ';',
} as const

type Keys = keyof typeof DefaultOptions

function config (key: Keys, value: string): DefaultOptions;

function localSet(key: string, value: unknown): void

function localGet(key: string): string | null;

function localRemove(key: string): void;

function localClear(): void;

function sessionSet(key: string, value: unknown): void;

function sessionGet(key: string): string | null;

function sessionRemove(key: string): void;

function sessionClear(): void;

function cookieSet(key: string, value: unknown): void;

function cookieGet(key: string): string | null;

function cookieRemove(key: string): void;

function cookieClear(): void;

function memorySet(key: string, value: unknown): void;

function memoryGet(key: string): string | null;

function memoryRemove(key: string): void;

function memoryClear(): void;

```

### 依赖
- 无

### 场景

 - 宿主环境本地存储

### 使用
```typescript
// 配置系统分隔符
// 注意 配置需要在对应配置项读取之前，否则无效
config('groupDelimiter', ':')
config('pathDelimiter', '.')
config('valueDelimiter', ';')

// 常规键值对存储
localSet('key', 'value') // localStorage.setItem('key', 'value')

// 获取存储的值
localGet('key')

// 删除存储的值
localRemove('key')

// 清空存储
localClear()

// 分组[归纳]存储
// 相关分组的键值对会以分隔符连接并存储在一个键值对中
localSet('group:key', 'value') // localStorage.setItem('group', 'key=value')

// 获取分组存储的值
localGet('group:key')

// 路径存储
localSet('key.path.path', 'value') // localStorage.setItem('key', JSON.stringify({ path: { path: 'value' } }))

// 1.数组初始化
localSet('key.0.1', 'value') // localStorage.setItem('key', JSON.stringify([[, 'value']]))

// 2.数组更新
localSet('key.0.1', 'value1') // localStorage.setItem('key', JSON.stringify([[, 'value1']]))

// 3.数组指定位置新增
localSet('key.0.[1]', 'value2') // localStorage.setItem('key', JSON.stringify([[, 'value2', 'value1']]))

// 4.数组指定位置新增 -1表示末尾
localSet('key.0.[-1]', 'value3') // localStorage.setItem('key', JSON.stringify([[, 'value2', 'value1', 'value3']]))


// session存储 与local存储的函数签名一致

// cookie存储 是 cookie标准操作的简单封装

// memory存储 是内存存储，页面刷新后数据丢失 是对Map的简单封装


```

### 说明

只有在涉及group或者path存储时，才会在存取时对数据进行序列化/反序列化操作，其他情况下需要使用者自行处理

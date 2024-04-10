### 定义
```typescript
interface Printer {
  (...args: any[]): void;
  
  warn (...args: any[]): void;
  
  error (...args: any[]): void;
  
  badge (badge: string, style?: string): void;
  
  if (pred: any): (...args: any[]) => void;
}

interface LogSettings {
  on (): void;
  
  off (): void;
  
  if (pred: () => boolean): void;
  
  isEnable (): boolean;
  
  filter (pattern: RegExp): void;
  
  filterBadge (pattern: RegExp): void;
  
  isMatch (badge: string, text: string): boolean;

  create (badge?: string, style?: string): Printer;
  
  report (method: string, ...args: any[]): void;
  
  bindCallback (cb: ((...args: any[]) => void) | null): void;
}

const log: LogSettings

function create (badge?: string, style?: string): Printer;
```

### 依赖
- 无

### 场景

 - 任何需要打印日志的地方

### 使用
```typescript
// App.js
import { log } from '/lunzi/log'

log.filter(/^abc/)

// page1.js
import { create } from '/lunzi/log'

const log = create('page1')

log.output('abc') // 输出 'abc'

// page2.js
import { create } from '/lunzi/log'

const log = create('page2')

log.output('cba') // 不输出

```

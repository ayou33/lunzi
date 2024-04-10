### 定义

```typescript
type EventOptions = AddEventListenerOptions | boolean

interface EventAPI {
  on: (name: string, listener: EventListener, options?: EventOptions) => () => void;
  off: (name: string, listener: EventListener) => void;
  emit: (name: string, ...args: any[]) => void;
  once: (name: string, listener: EventListener, options?: EventOptions) => void;
  listnerCount: () => number;
  setMaxListeners: (max: number) => void;
  getMaxListeners: () => number;
}

interface useEvent {
  (
    onSub?: (event: string, listener: EventListener, options?: EventOptions) => void,
    onRemove?: (event: string, listener: EventListener, options?: EventOptions) => void,
    onPub?: (event: string, ...dataSet: any[]) => void,
  ): EventAPI;
}
```

### 依赖

 - 无

### 场景

 - 任何需要使用事件监听的场景

### 使用

```typescript
import { useEvent } from 'lunzi/event'

const { on, once, emit, off } = useEvent()

const listener = (data: any) => {
  console.log(data)
}

on('event', listener)

emit('event', 'hello')

off('event', listener)

once('event', listener)
```

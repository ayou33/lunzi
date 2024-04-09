### 定义
```typescript
interface supportDomEvent {
  (dom: Eelement): EventAPI;
} 

```

### 依赖
 - [event](event.md)

### 场景

需要代理dom事件的场景

### 使用
```typescript
import supportDomEvent from 'lunzi/domEvent'

const dom = document.createComment('div')

const { on, emit } = supportDomEvent(dom)

on('click', () => {
  console.log('click')
})

dom.click()

```

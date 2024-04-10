### 定义
```typescript
enum QueueState {
  IDLE,
  INTERRUPT,
  RUNNING,
  BUSY,
}

/**
 * Interface for tasks.
 * @interface
 */
interface TaskMeta {
  id?: string;
  label?: string;
  priority?: number;
  run: (controller: AbortController) => unknown;
}

enum TaskRunType {
  MANUAL,
  AUTO,
  IMMEDIATE,
}

type Task = Required<Omit<TaskMeta, 'run'>> & {
  run: () => Promise<unknown>;
  controller: AbortController;
}

interface StateQueue {
  enqueue: (task: TaskMeta | TaskMeta['run'], runType?: TaskRunType) => string;
  cancel: (idOrLabel: string | string[]) => void;
  getTasks: () => Task[];
  getRunningTasks: () => Task[];
  on: (state: QueueState, handler: () => void, oneOff?: boolean) => Function;
}
```

### 依赖
- [controlledPromise](./controlledPromise.md)
- [event](./event.md)

### 场景
 - 串行队列
 - 可配置的并行队列
 - 任务优先级
 - 任务取消
 - 任务状态监听

### 使用
```typescript
import stateQueue from 'lunzi/stateQueue'

const queue = stateQueue(1) // 当前队列最大并发数为1，即该队列为串行队列

function task () {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('task done')
      resolve()
    }, 1000)
  })
}

queue.enqueue(task)

queue.enqueue({
  label: 'task2',
  run: task,
})

queue.cancel('task2')

// 以下事件默认会在对应状态发生时触发，oneOff为true时只触发一次
on(QueueState.RUNNING, () => {
  console.log('新任务开始执行')
})

on(QueueState.BUSY, () => {
  console.log('新任务添加，但执行队列已满')
})

on(QueueState.INTERRUPT, () => {
  console.log('有任务执行完毕')
})

on(QueueState.IDLE, () => {
  console.log('所有任务执行完毕')
})

```

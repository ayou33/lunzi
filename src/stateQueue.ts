/**
 * File: stateQueue.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/3 16:53
 */
import useEvent from './event'

export enum QueueState {
  IDLE,
  BUSY,
  INTERRUPT,
}

export interface Task {
  id: string;
  priority?: number;
  label?: string;
  run: <T>() => Promise<T>;
}

type RequiredTask = Required<Task>

const DEFAULT_PRIORITY = 0

const LABEL_UNKNOWN = 'unknown'

function makeId () {
  return Math.random().toString(36).slice(2)
}

export default function stateQueue (parallel = 1) {
  const tasks: RequiredTask[] = []
  const running: RequiredTask[] = []
  
  const { on, once, emit } = useEvent()
  
  function next () {
    if (tasks.length === 0) {
      idle()
    }
    
    if (tasks.length > 0 && running.length < parallel) {
      const task = tasks.shift()
      
      if (task) {
        run(task)
      }
    }
  }
  
  function buildTaskObject (task: Parameters<typeof enqueue>[0]): RequiredTask {
    const run = 'function' === typeof task ? task : task.run
    
    return {
      id: makeId(),
      priority: DEFAULT_PRIORITY,
      label: LABEL_UNKNOWN,
      ...task,
      async run<T> () {
        const result = await run<T>()
        interrupt()
        return result
      },
    }
  }
  
  function run (task: RequiredTask) {
    running.push(task)
    
    busy()
    
    task
      .run()
      .finally(() => {
        running.splice(running.indexOf(task), 1)
        
        next()
      })
  }
  
  function enqueue (task: Partial<Task> & Pick<Task, 'run'> | Task['run'], ir = false) {
    const taskObject = buildTaskObject(task)
    
    if (ir) {
      run(taskObject)
    } else {
      const position = tasks.findIndex(({ priority }) => priority! < taskObject.priority!)
      tasks.splice(position === -1 ? tasks.length : position, 0, taskObject)
    }
    
    next()
    
    return taskObject.id
  }
  
  function interrupt () {
    emit(stateEvent(QueueState.INTERRUPT))
  }
  
  function idle () {
    emit(stateEvent(QueueState.IDLE))
  }
  
  function busy () {
    emit(stateEvent(QueueState.BUSY))
  }
  
  function stateEvent (state: QueueState) {
    return `state:${state}`
  }
  
  function onStateChange (state: QueueState, handler: (tasks: Task[]) => void, oneOff = false) {
    return (oneOff ? once : on)(stateEvent(state), () => handler(tasks.flat()))
  }
  
  function cancel (id: string | string[]): void
  
  function cancel (label: string | string[]): void
  
  function cancel (idOrLabel: string | string[]): void {
    const predicate = 'string' === typeof idOrLabel
      ? ({ id, label }: Pick<RequiredTask, 'id' | 'label'>) => !(id == idOrLabel || label === idOrLabel)
      : ({ id, label }: Pick<RequiredTask, 'id' | 'label'>) => !(idOrLabel.includes(id) || idOrLabel.includes(label))
    
    const left = tasks.filter(predicate)
    
    tasks.length = 0
    
    tasks.push(...left)
  }
  
  return {
    enqueue,
    on: onStateChange,
    cancel,
  }
}

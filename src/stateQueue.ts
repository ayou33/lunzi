/**
 * File: stateQueue.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/3 16:53
 */
import controlledPromise from './controlledPromise'
import useEvent from './event'

/**
 * Enum for queue states.
 * @readonly
 * @enum {number}
 */
export enum QueueState {
  IDLE,
  INTERRUPT,
  RUNNING,
  BUSY,
}

/**
 * Interface for tasks.
 * @interface
 */
export interface TaskMeta {
  id?: string;
  label?: string;
  priority?: number;
  run: (controller: AbortController) => unknown;
}

export enum TaskRunType {
  MANUAL,
  AUTO,
  IMMEDIATE,
}

type Task = Required<Omit<TaskMeta, 'run'>> & {
  run: () => Promise<unknown>;
  controller: AbortController;
}

const DEFAULT_PRIORITY = 0

const LABEL_UNKNOWN = 'unknown'

export interface StateQueue {
  enqueue: (task: TaskMeta | TaskMeta['run'], runType?: TaskRunType) => string;
  run: () => void;
  cancel: (idOrLabel: string | string[]) => void;
  getTasks: () => Task[];
  getRunningTasks: () => Task[];
  on: <T>(state: QueueState, handler: (e: Event, d: T) => void, oneOff?: boolean) => Function;
  destroy: () => void;
}

/**
 * Function to generate a random ID.
 * @returns {string} A random string.
 */
function makeId (): string {
  return (Math.random() + Math.random()).toString(36).slice(2)
}

/**
 * Function to manage a state queue.
 * @param {number} parallel - The number of tasks that can run in parallel.
 * @returns {Object} The state queue object.
 */
export function stateQueue (parallel: number = 1): StateQueue {
  const tasks: Task[] = []
  const running: Task[] = []

  const { on, once, emit, off } = useEvent()

  /**
   * Function to manage the execution of tasks.
   */
  function next () {
    if (tasks.length > 0 && running.length < parallel) {
      const task = tasks.shift()

      if (task) {
        run(task)
      }
    } else if (running.length >= parallel) {
      emitBusy()
    } else if (tasks.length === 0 && running.length === 0) {
      emitIdle()
    }
  }

  /**
   * Function to build a task object.
   * @param {Object} task - The task to be built.
   * @returns {Object} The built task object.
   */
  function buildTaskObject (task: Parameters<typeof enqueue>[0]): Task {
    const isRun = 'function' === typeof task
    const run = isRun ? task : task.run
    const controller = new AbortController()
    const id = isRun ? makeId() : (task.id || makeId())
    
    return {
      id,
      priority: DEFAULT_PRIORITY,
      label: LABEL_UNKNOWN,
      ...task,
      run () {
        const [promise] = controlledPromise(async (resolve, reject) => {
          try {
            /**
             * 共享 controller 来同步管理用户任务与队列任务
             * 以此来避免用户任务在队列任务执行时被取消
             * 或者队列任务在用户任务执行时被取消的不一致性
             */
            resolve(await run(controller))
            interrupt(id)
          } catch (error) {
            reject(error as Error)
          }
        }, controller)
        
        return promise
      },
      controller,
    }
  }

  /**
   * Function to run a task.
   * @param {Object} task - The task to be run.
   */
  function run (task: Task) {
    running.push(task)
    
    emitRunning(task.id)

    task
      .run()
      .finally(() => {
        running.splice(running.indexOf(task), 1)
        
        next()
      })
  }

  /**
   * Function to enqueue a task.
   * @param {Object} task - The task to be enqueued.
   * @param runType
   * @returns {string} The ID of the enqueued task.
   */
  function enqueue (task: TaskMeta | TaskMeta['run'], runType: TaskRunType = TaskRunType.AUTO): string {
    const taskObject = buildTaskObject(task)

    if (runType === TaskRunType.IMMEDIATE) {
      run(taskObject)
    } else {
      const position = tasks.findIndex(({ priority }) => priority! < taskObject.priority!)
      tasks.splice(position === -1 ? tasks.length : position, 0, taskObject)
      
      if (runType === TaskRunType.AUTO) next()
    }

    return taskObject.id
  }

  /**
   * Function to emit an interrupt event.
   */
  function interrupt (id: string) {
    emit(stateEvent(QueueState.INTERRUPT), id)
  }

  /**
   * Function to emit an idle event.
   */
  function emitIdle () {
    emit(stateEvent(QueueState.IDLE))
  }

  /**
   * Function to emit a busy event.
   */
  function emitBusy () {
    emit(stateEvent(QueueState.BUSY))
  }
  
  /**
   * Function to emit a running event.
   */
  function emitRunning (id: string) {
    emit(stateEvent(QueueState.RUNNING), id)
  }

  /**
   * Function to create a state event.
   * @param {QueueState} state - The state of the event.
   * @returns {string} The state event string.
   */
  function stateEvent (state: QueueState): string {
    return `state:${state}`
  }

  /**
   * Function to handle state changes.
   * @param {QueueState} state - The state to listen for.
   * @param {Function} handler - The function to execute when the state changes.
   * @param {boolean} oneOff - Flag to indicate if the handler should be executed only once.
   * @returns {Function} The function to unsubscribe.
   */
  function onStateChange <T>(state: QueueState, handler: (e: Event, d: T) => void, oneOff: boolean = false): Function {
    return (oneOff ? once : on)(stateEvent(state), handler)
  }

  /**
   * Function to cancel a task.
   * @param {string|string[]} idOrLabel - The ID or label of the task to be cancelled.
   */
  function cancel (idOrLabel: string | string[]) {
    // cancel queued tasks
    const shouldKeep = 'string' === typeof idOrLabel
      ? ({ id, label }: Pick<Task, 'id' | 'label'>) => !(id == idOrLabel || label === idOrLabel)
      : ({ id, label }: Pick<Task, 'id' | 'label'>) => !(idOrLabel.includes(id) || idOrLabel.includes(label))

    const left = tasks.filter(shouldKeep)

    tasks.length = 0

    tasks.push(...left)
    
    /**
     * abort running tasks
     * @warn 运行中的任务取消是一个异步操作 当前事件循环周期结束时才会完成操作
      */
    running.forEach(task => {
      if (!shouldKeep(task)) {
        task.controller.abort()
      }
    })
  }
  
  function destroy () {
    tasks.length = 0
    
    running.forEach(task => task.controller.abort())
    
    running.length = 0
    
    off('*')
  }

  return {
    enqueue,
    run: next,
    on: onStateChange,
    cancel,
    getTasks: () => tasks,
    getRunningTasks: () => running,
    destroy,
  }
}

export default stateQueue

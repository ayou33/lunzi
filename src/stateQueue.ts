/**
 * File: stateQueue.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/3 16:53
 */
import useEvent from './event'

/**
 * Enum for queue states.
 * @readonly
 * @enum {number}
 */
export enum QueueState {
  IDLE,
  BUSY,
  INTERRUPT,
}

/**
 * Interface for tasks.
 * @interface
 */
export interface TaskMeta {
  priority?: number;
  label?: string;
  run: () => unknown;
}

export enum TaskRunType {
  MANUAL,
  AUTO,
  IMMEDIATE,
}

type Task = Required<Omit<TaskMeta, 'run'>> & {
  id: string;
  run: () => Promise<unknown>;
}

const DEFAULT_PRIORITY = 0

const LABEL_UNKNOWN = 'unknown'

export interface StateQueue {
  enqueue: (task: TaskMeta | TaskMeta['run'], runType?: TaskRunType) => string;
  cancel: (idOrLabel: string | string[]) => void;
  getTasks: () => Task[];
  getRunningTasks: () => Task[];
  on: (state: QueueState, handler: () => void, oneOff?: boolean) => Function;
}

/**
 * Function to generate a random ID.
 * @returns {string} A random string.
 */
function makeId (): string {
  return Math.random().toString(36).slice(2)
}

/**
 * Function to manage a state queue.
 * @param {number} parallel - The number of tasks that can run in parallel.
 * @returns {Object} The state queue object.
 */
export default function stateQueue (parallel: number = 1): StateQueue {
  const tasks: Task[] = []
  const running: Task[] = []

  const { on, once, emit } = useEvent()

  /**
   * Function to manage the execution of tasks.
   */
  function next () {
    if (tasks.length === 0 && running.length === 0) {
      idle()
    }

    if (tasks.length > 0 && running.length < parallel) {
      const task = tasks.shift()

      if (task) {
        run(task)
      }
    }
  }

  /**
   * Function to build a task object.
   * @param {Object} task - The task to be built.
   * @returns {Object} The built task object.
   */
  function buildTaskObject (task: Parameters<typeof enqueue>[0]): Task {
    const run = 'function' === typeof task ? task : task.run
    
    return {
      id: makeId(),
      priority: DEFAULT_PRIORITY,
      label: LABEL_UNKNOWN,
      ...task,
      async run () {
        const result = await run()
        interrupt()
        return result
      },
    }
  }

  /**
   * Function to run a task.
   * @param {Object} task - The task to be run.
   */
  function run (task: Task) {
    running.push(task)

    busy()

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
  function interrupt () {
    emit(stateEvent(QueueState.INTERRUPT))
  }

  /**
   * Function to emit an idle event.
   */
  function idle () {
    emit(stateEvent(QueueState.IDLE))
  }

  /**
   * Function to emit a busy event.
   */
  function busy () {
    emit(stateEvent(QueueState.BUSY))
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
  function onStateChange (state: QueueState, handler: () => void, oneOff: boolean = false): Function {
    return (oneOff ? once : on)(stateEvent(state), handler)
  }

  /**
   * Function to cancel a task.
   * @param {string|string[]} idOrLabel - The ID or label of the task to be cancelled.
   */
  function cancel (idOrLabel: string | string[]) {
    const predicate = 'string' === typeof idOrLabel
      ? ({ id, label }: Pick<Task, 'id' | 'label'>) => !(id == idOrLabel || label === idOrLabel)
      : ({ id, label }: Pick<Task, 'id' | 'label'>) => !(idOrLabel.includes(id) || idOrLabel.includes(label))

    const left = tasks.filter(predicate)

    tasks.length = 0

    tasks.push(...left)
  }

  return {
    enqueue,
    on: onStateChange,
    cancel,
    getTasks: () => tasks,
    getRunningTasks: () => running,
  }
}

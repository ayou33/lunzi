/**
 * File: stateQueue.test.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/3 16:55
 */
import stateQueue, { QueueState, TaskMeta, TaskRunType } from '../src/stateQueue'

describe('stateQueue', () => {
  let queue: ReturnType<typeof stateQueue>
  let task: TaskMeta
  
  beforeEach(() => {
    queue = stateQueue()
    task = {
      label: 'testTask',
      run: jest.fn().mockResolvedValue('test'),
    }
  })
  
  test('enqueue adds task to the queue', () => {
    const id = queue.enqueue(task, TaskRunType.MANUAL)
    expect(queue.getTasks()).toContainEqual(expect.objectContaining({ id }))
  })
  
  test('enqueue runs task immediately if ir flag is true', async () => {
    queue.enqueue(task, TaskRunType.IMMEDIATE)
    expect(task.run).toHaveBeenCalled()
  })
  
  test('cancel removes task from the queue by id', () => {
    const id = queue.enqueue(task)
    queue.cancel(id)
    expect(queue.getTasks()).toHaveLength(0)
  })
  
  test('cancel running task by id', async () => {
    const task = {
      label: 'testTask',
      run: () => new Promise((resolve) => {
        setTimeout(resolve, 1000)
      }),
    }
    const id = queue.enqueue(task, TaskRunType.IMMEDIATE)
    queue.cancel(id)
    return new Promise((resolve) => {
      resolve(true)
    }).then(() => {
        expect(queue.getRunningTasks()).toHaveLength(0)
      },
    )
  })
  
  test('cancel all queued and running tasks by label', async () => {
    queue.enqueue(task, TaskRunType.MANUAL)
    const task2 = {
      label: task.label,
      run: () => new Promise((resolve) => {
        setTimeout(resolve, 1000)
      }),
    }
    
    queue.enqueue(task2, TaskRunType.IMMEDIATE)
    queue.cancel(task.label!)
    
    return new Promise((resolve) => {
      resolve(true)
    }).then(() => {
      expect(queue.getTasks()).toHaveLength(0)
      expect(queue.getRunningTasks()).toHaveLength(0)
    })
  })
  
  test('cancel removes task from the queue by label', () => {
    task.label = 'testLabel'
    queue.enqueue(task)
    queue.cancel(task.label)
    expect(queue.getTasks()).toHaveLength(0)
  })
  
  test('onStateChange triggers handler when state changes', () => {
    const handler = jest.fn()
    queue.on(QueueState.BUSY, handler)
    queue.enqueue(task)
    expect(handler).toHaveBeenCalled()
  })
  
  test('onStateChange does not trigger handler when state does not change', () => {
    const handler = jest.fn()
    queue.on(QueueState.IDLE, handler)
    queue.cancel(task.label!)
    expect(handler).not.toHaveBeenCalled()
  })
})

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
    expect(queue.getTasks()).not.toContain(task)
  })
  
  test('cancel removes task from the queue by label', () => {
    task.label = 'testLabel'
    queue.enqueue(task)
    queue.cancel(task.label)
    expect(queue.getTasks()).not.toContain(task)
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

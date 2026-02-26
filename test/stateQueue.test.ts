/**
 * File: stateQueue.test.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/3 16:55
 */
import stateQueue, { QueueState, TaskMeta, TaskRunType } from '../src/stateQueue'

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Task that keeps running until the AbortController fires. */
function delayTask (ms: number, label = 'delay'): TaskMeta {
  return {
    label,
    run: () => new Promise(resolve => setTimeout(resolve, ms)),
  }
}

/** Task that always rejects. */
function failTask (ms = 0): TaskMeta {
  return {
    label: 'fail',
    run: () => new Promise((_, reject) => setTimeout(() => reject(new Error('task-error')), ms)),
  }
}

/** Wait for one macrotask + some microtasks. */
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms))

// ─── suite ────────────────────────────────────────────────────────────────────

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

  afterEach(() => {
    queue.destroy()
  })

  // ── enqueue ────────────────────────────────────────────────────────────────

  describe('enqueue', () => {
    test('MANUAL: adds task to queue without starting it', () => {
      const id = queue.enqueue(task, TaskRunType.MANUAL)
      expect(queue.getTasks()).toContainEqual(expect.objectContaining({ id }))
      expect(queue.getRunningTasks()).toHaveLength(0)
      expect(task.run).not.toHaveBeenCalled()
    })

    test('IMMEDIATE: runs task right away, skips queue', () => {
      queue.enqueue(task, TaskRunType.IMMEDIATE)
      expect(task.run).toHaveBeenCalled()
      expect(queue.getTasks()).toHaveLength(0)
    })

    test('AUTO: starts task automatically when a slot is free', () => {
      queue.enqueue(task)
      expect(task.run).toHaveBeenCalled()
    })

    test('returns the task id as a non-empty string', () => {
      const id = queue.enqueue(task)
      expect(typeof id).toBe('string')
      expect(id).toBeTruthy()
    })

    test('accepts a bare function as task', () => {
      const fn = jest.fn().mockResolvedValue(42)
      const id = queue.enqueue(fn)
      expect(typeof id).toBe('string')
      expect(fn).toHaveBeenCalled()
    })

    test('explicit id is preserved', () => {
      const id = queue.enqueue({ id: 'my-id', run: jest.fn().mockResolvedValue(null) })
      expect(id).toBe('my-id')
    })
  })

  // ── run() (MANUAL flush) ───────────────────────────────────────────────────

  describe('run()', () => {
    test('manually starts queued tasks', () => {
      queue.enqueue(task, TaskRunType.MANUAL)
      expect(task.run).not.toHaveBeenCalled()
      queue.run()
      expect(task.run).toHaveBeenCalled()
    })
  })

  // ── priority ──────────────────────────────────────────────────────────────

  describe('priority ordering', () => {
    test('higher priority tasks are dequeued first', () => {
      const q = stateQueue(1)
      // Fill the single slot so queued tasks are not started immediately
      q.enqueue(delayTask(500), TaskRunType.IMMEDIATE)
      // Enqueue out-of-order priorities manually
      q.enqueue({ priority: 0,  run: jest.fn().mockResolvedValue(null) }, TaskRunType.MANUAL)
      q.enqueue({ priority: 10, run: jest.fn().mockResolvedValue(null) }, TaskRunType.MANUAL)
      q.enqueue({ priority: 5,  run: jest.fn().mockResolvedValue(null) }, TaskRunType.MANUAL)

      expect(q.getTasks().map(t => t.priority)).toEqual([10, 5, 0])
      q.destroy()
    })
  })

  // ── parallel ──────────────────────────────────────────────────────────────

  describe('parallel execution', () => {
    test('does not exceed the parallel limit', () => {
      const q = stateQueue(2)
      q.enqueue(delayTask(500))
      q.enqueue(delayTask(500))
      q.enqueue(delayTask(500), TaskRunType.MANUAL) // should stay queued
      expect(q.getRunningTasks()).toHaveLength(2)
      expect(q.getTasks()).toHaveLength(1)
      q.destroy()
    })

    test('starts queued tasks as slots free up', async () => {
      const q = stateQueue(2)
      const t3 = jest.fn().mockResolvedValue(null)
      q.enqueue(delayTask(50))
      q.enqueue({ run: jest.fn().mockResolvedValue(null) }) // resolves fast
      q.enqueue({ run: t3 }, TaskRunType.MANUAL)
      expect(t3).not.toHaveBeenCalled()
      await tick(80)
      // after the slow task finishes, t3 should have started
      expect(t3).toHaveBeenCalled()
      q.destroy()
    })
  })

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    test('removes queued task by id', () => {
      const id = queue.enqueue(task, TaskRunType.MANUAL)
      queue.cancel(id)
      expect(queue.getTasks()).toHaveLength(0)
    })

    test('removes queued task by label', () => {
      task.label = 'lbl'
      queue.enqueue(task, TaskRunType.MANUAL)
      queue.cancel('lbl')
      expect(queue.getTasks()).toHaveLength(0)
    })

    test('cancels a running task by id', async () => {
      const id = queue.enqueue(delayTask(500), TaskRunType.IMMEDIATE)
      expect(queue.getRunningTasks()).toHaveLength(1)
      queue.cancel(id)
      await tick()
      expect(queue.getRunningTasks()).toHaveLength(0)
    })

    test('cancels a running task by label', async () => {
      queue.enqueue({ label: 'lbl', run: () => new Promise(r => setTimeout(r, 500)) }, TaskRunType.IMMEDIATE)
      queue.cancel('lbl')
      await tick()
      expect(queue.getRunningTasks()).toHaveLength(0)
    })

    test('cancels both queued and running tasks sharing a label', async () => {
      const sharedLabel = 'shared'
      queue.enqueue({ label: sharedLabel, run: () => new Promise(r => setTimeout(r, 500)) }, TaskRunType.IMMEDIATE)
      queue.enqueue({ label: sharedLabel, run: jest.fn().mockResolvedValue(null) }, TaskRunType.MANUAL)

      queue.cancel(sharedLabel)
      await tick()

      expect(queue.getTasks()).toHaveLength(0)
      expect(queue.getRunningTasks()).toHaveLength(0)
    })

    test('cancels multiple tasks by array of ids', () => {
      const id1 = queue.enqueue(task, TaskRunType.MANUAL)
      const id2 = queue.enqueue({ label: 'b', run: jest.fn().mockResolvedValue(null) }, TaskRunType.MANUAL)
      queue.cancel([id1, id2])
      expect(queue.getTasks()).toHaveLength(0)
    })
  })

  // ── state events ──────────────────────────────────────────────────────────

  describe('state events', () => {
    test('emits RUNNING when a task starts', () => {
      const handler = jest.fn()
      queue.on(QueueState.RUNNING, handler)
      queue.enqueue(task)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('emits BUSY when all slots are occupied and next() is called', () => {
      const q = stateQueue(1)
      const handler = jest.fn()
      q.on(QueueState.BUSY, handler)
      q.enqueue(delayTask(500))                            // fills slot 1/1
      q.enqueue({ run: jest.fn().mockResolvedValue(null) }) // AUTO → next() → BUSY
      expect(handler).toHaveBeenCalledTimes(1)
      q.destroy()
    })

    test('emits IDLE after all tasks finish', async () => {
      const handler = jest.fn()
      queue.on(QueueState.IDLE, handler)
      queue.enqueue(task)
      await tick()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('emits INTERRUPT once per successfully completed task', async () => {
      const handler = jest.fn()
      queue.on(QueueState.INTERRUPT, handler)
      queue.enqueue(task)
      await tick()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('INTERRUPT is NOT emitted when a task fails', async () => {
      const handler = jest.fn()
      queue.on(QueueState.INTERRUPT, handler)
      queue.enqueue(failTask())
      await tick()
      expect(handler).not.toHaveBeenCalled()
    })

    test('oneOff=true: handler fires only once across multiple events', async () => {
      const handler = jest.fn()
      queue.on(QueueState.RUNNING, handler, true)
      queue.enqueue(task)
      await tick()
      queue.enqueue({ run: jest.fn().mockResolvedValue(null) })
      await tick()
      expect(handler).toHaveBeenCalledTimes(1)
    })

    test('onStateChange does not trigger handler when state does not occur', () => {
      const handler = jest.fn()
      queue.on(QueueState.IDLE, handler)
      // Cancelling a non-existent task should not emit IDLE
      queue.cancel('no-such-task')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  // ── error resilience ──────────────────────────────────────────────────────

  describe('error resilience', () => {
    test('a failing task does not crash the queue', async () => {
      const idleHandler = jest.fn()
      queue.on(QueueState.IDLE, idleHandler)
      queue.enqueue(failTask())
      await tick()
      expect(idleHandler).toHaveBeenCalledTimes(1)
    })

    test('subsequent tasks still run after a failed task', async () => {
      const ok = jest.fn().mockResolvedValue('ok')
      queue.enqueue(failTask())
      queue.enqueue({ run: ok }, TaskRunType.MANUAL)
      queue.run()
      await tick(30)
      expect(ok).toHaveBeenCalled()
    })
  })

  // ── destroy ───────────────────────────────────────────────────────────────

  describe('destroy', () => {
    test('clears all queued tasks', () => {
      queue.enqueue(task, TaskRunType.MANUAL)
      queue.destroy()
      expect(queue.getTasks()).toHaveLength(0)
    })

    test('aborts and removes all running tasks', async () => {
      queue.enqueue(delayTask(500), TaskRunType.IMMEDIATE)
      expect(queue.getRunningTasks()).toHaveLength(1)
      queue.destroy()
      await tick()
      expect(queue.getRunningTasks()).toHaveLength(0)
    })

    test('no events fire after destroy', async () => {
      const handler = jest.fn()
      queue.on(QueueState.IDLE, handler)
      queue.destroy()
      await tick()
      expect(handler).not.toHaveBeenCalled()
    })
  })
})


import stateFetch from '../src/stateFetch'

// ─── helpers ──────────────────────────────────────────────────────────────────

const tick = (ms = 30) => new Promise<void>(r => setTimeout(r, ms))

/** Build a mock fetch that resolves after `ms` with `value`. */
function mockFetch<T> (value: T, ms = 0) {
  return jest.fn().mockImplementation(
    () => new Promise<T>(resolve => setTimeout(() => resolve(value), ms)),
  )
}

/** Build a mock fetch that rejects after `ms` with `error`. */
function mockFetchReject (error: Error, ms = 0) {
  return jest.fn().mockImplementation(
    () => new Promise<never>((_, reject) => setTimeout(() => reject(error), ms)),
  )
}

/** A fetch that never settles (useful for abort testing). */
function hangingFetch () {
  return jest.fn().mockImplementation(() => new Promise<never>(() => {}))
}

// ─── parseRequestId (via send behaviour) ──────────────────────────────────────

describe('parseRequestId', () => {
  test('request with no data uses URL as-is', async () => {
    const sf = stateFetch()
    const fetch = mockFetch('ok')
    await sf.send(fetch, { url: '/api/foo' })
    // Fetch called once; cache should be warming for the same config.
    await sf.send(fetch, { url: '/api/foo', expireIn: 1000 })
    expect(fetch).toHaveBeenCalledTimes(2) // no dedup across distinct calls w/o cache yet
  })

  test('request ID is deterministic regardless of data key insertion order', async () => {
    const sf = stateFetch()
    const fetch1 = mockFetch('a', 0)
    const fetch2 = mockFetch('b', 0)

    // Fire both calls concurrently — they have the same logical params but inserted in
    // different orders, so dedup should merge them into one real request.
    const p1 = sf.send(fetch1, { url: '/api', data: { a: 1, b: 2 } })
    const p2 = sf.send(fetch2, { url: '/api', data: { b: 2, a: 1 } })

    const [r1, r2] = await Promise.all([p1, p2])
    // Both should have received the same result from a single fetch call.
    expect(fetch1).toHaveBeenCalledTimes(1)
    expect(fetch2).toHaveBeenCalledTimes(0)
    expect(r1).toBe('a')
    expect(r2).toBe('a')
  })

  test('different value types produce distinct IDs (number vs string)', async () => {
    const sf = stateFetch()
    const fetch1 = mockFetch('number', 0)
    const fetch2 = mockFetch('string', 0)

    // Sequential calls — these are NOT within the same tick so they won't be deduped,
    // but what matters here is that we can verify distinct fetches ARE fired.
    await sf.send(fetch1, { url: '/api', data: { id: 1 } })
    await sf.send(fetch2, { url: '/api', data: { id: '1' } })

    expect(fetch1).toHaveBeenCalledTimes(1)
    expect(fetch2).toHaveBeenCalledTimes(1)
  })
})

// ─── send ─────────────────────────────────────────────────────────────────────

describe('send', () => {
  test('resolves with the fetch result', async () => {
    const sf = stateFetch()
    const result = await sf.send(mockFetch({ data: 42 }), { url: '/api/x' })
    expect(result).toEqual({ data: 42 })
  })

  test('rejects when the underlying fetch rejects', async () => {
    const sf = stateFetch()
    const err = new Error('network error')
    await expect(sf.send(mockFetchReject(err), { url: '/api/fail' })).rejects.toThrow('network error')
  })

  test('rejects with "Invalid request url" when url is empty', async () => {
    const sf = stateFetch()
    await expect(sf.send(mockFetch('x'), { url: '' })).rejects.toThrow('Invalid request url')
  })

  // ── deduplication ────────────────────────────────────────────────────────────

  describe('deduplication (default: individual=false)', () => {
    test('concurrent identical requests share one fetch call', async () => {
      const sf = stateFetch()
      const fetch = mockFetch('shared', 20)

      const [r1, r2, r3] = await Promise.all([
        sf.send(fetch, { url: '/api/dup' }),
        sf.send(fetch, { url: '/api/dup' }),
        sf.send(fetch, { url: '/api/dup' }),
      ])

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(r1).toBe('shared')
      expect(r2).toBe('shared')
      expect(r3).toBe('shared')
    })

    test('follower receives the same error when the primary fetch rejects', async () => {
      const sf = stateFetch()
      const fetch = mockFetchReject(new Error('boom'), 20)

      const results = await Promise.allSettled([
        sf.send(fetch, { url: '/api/dup-err' }),
        sf.send(fetch, { url: '/api/dup-err' }),
      ])

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(results[0].status).toBe('rejected')
      expect(results[1].status).toBe('rejected')
      expect((results[0] as PromiseRejectedResult).reason.message).toBe('boom')
      expect((results[1] as PromiseRejectedResult).reason.message).toBe('boom')
    })

    test('sequential (non-concurrent) identical requests each trigger a fetch', async () => {
      const sf = stateFetch()
      const fetch = mockFetch('ok', 0)

      await sf.send(fetch, { url: '/api/seq' })
      await sf.send(fetch, { url: '/api/seq' })

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('individual mode', () => {
    test('concurrent identical requests each trigger their own fetch', async () => {
      const sf = stateFetch()
      const fetch = mockFetch('ind', 20)

      const [r1, r2] = await Promise.all([
        sf.send(fetch, { url: '/api/ind', individual: true }),
        sf.send(fetch, { url: '/api/ind', individual: true }),
      ])

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(r1).toBe('ind')
      expect(r2).toBe('ind')
    })
  })

  // ── cache ─────────────────────────────────────────────────────────────────

  describe('cache', () => {
    test('cache hit: second request skips fetch entirely', async () => {
      const sf = stateFetch()
      const fetch = mockFetch('cached', 0)

      await sf.send(fetch, { url: '/api/c', expireIn: 5000 })
      const result = await sf.send(fetch, { url: '/api/c', expireIn: 5000 })

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(result).toBe('cached')
    })

    test('expired cache: triggers a real fetch', async () => {
      jest.useFakeTimers()
      const sf = stateFetch()
      const fetch = mockFetch('fresh', 0)

      // Prime cache with a 10 ms TTL.
      const p1 = sf.send(fetch, { url: '/api/exp', expireIn: 10 })
      jest.runAllTimers()
      await p1

      // Advance past expiry.
      jest.advanceTimersByTime(20)

      const p2 = sf.send(fetch, { url: '/api/exp', expireIn: 10 })
      jest.runAllTimers()
      await p2

      expect(fetch).toHaveBeenCalledTimes(2)
      jest.useRealTimers()
    })

    test('no cache when expireIn is not set', async () => {
      const sf = stateFetch()
      const fetch = mockFetch('no-cache', 0)

      await sf.send(fetch, { url: '/api/nc' })
      await sf.send(fetch, { url: '/api/nc' })

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  // ── abort / cancel ────────────────────────────────────────────────────────

  describe('abort / cancel', () => {
    test('cancelling a queued task rejects the promise with "Request aborted"', async () => {
      // parallel=1 — the blocker starts synchronously when enqueued, so the
      // second task is guaranteed to be queued (not running) without needing
      // to wait for any async tick.
      const sf = stateFetch(1)

      sf.send(hangingFetch(), { url: '/api/block', label: 'block' })

      // This task goes into tasks[] immediately (slot is full).
      const p = sf.send(hangingFetch(), { url: '/api/queued', label: 'queued' })
      sf.cancel('queued', 'test-cancel')

      await expect(p).rejects.toThrow('Request aborted')
    })

    test('abort after settle does not cause a double-rejection', async () => {
      const sf = stateFetch(1)
      const fetch = mockFetch('done', 10)
      const id = 'settle-test'

      const p = sf.send(fetch, { url: '/api/settle', id })
      await tick(30) // let it resolve naturally

      // Attempting to cancel an already-completed task should be a no-op.
      sf.cancel(id)

      // The promise already settled; no unhandled rejection.
      await expect(p).resolves.toBe('done')
    })
  })
})

// ─── cancel ───────────────────────────────────────────────────────────────────

describe('cancel', () => {
  test('cancels tasks by label', async () => {
    const sf = stateFetch(1)

    // Blocker starts synchronously; batch tasks are immediately queued.
    sf.send(hangingFetch(), { url: '/block', label: 'block' })

    const p1 = sf.send(hangingFetch(), { url: '/a', label: 'batch' })
    const p2 = sf.send(hangingFetch(), { url: '/b', label: 'batch' })
    sf.cancel('batch')

    const [s1, s2] = await Promise.allSettled([p1, p2])
    expect(s1.status).toBe('rejected')
    expect(s2.status).toBe('rejected')
  })

  test('cancels tasks by array of ids', async () => {
    const sf = stateFetch(1)

    sf.send(hangingFetch(), { url: '/block', label: 'block' })

    const p = sf.send(hangingFetch(), { url: '/c', id: 'myId' })
    sf.cancel(['myId'])

    await expect(p).rejects.toThrow('Request aborted')
  })
})

// ─── on (event forwarding) ────────────────────────────────────────────────────

describe('on', () => {
  test('forwards queue state events', async () => {
    const { QueueState } = await import('../src/stateQueue')
    const sf = stateFetch(1)

    const idleHandler = jest.fn()
    sf.on(QueueState.IDLE, idleHandler)

    await sf.send(mockFetch('ev', 0), { url: '/api/ev' })
    await tick(20)

    expect(idleHandler).toHaveBeenCalled()
  })
})

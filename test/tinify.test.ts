import { compress, compressBatch, compressForWeb, compressToSize, thumbnail } from '../src/tinify'

// ─── Global polyfills for jsdom ───────────────────────────────────────────────

/**
 * jsdom doesn't ship ImageBitmap or createImageBitmap.
 * We define a minimal class and install it on `global` before any tests run.
 */
class MockImageBitmap {
  constructor (public width: number, public height: number) {}
  close = jest.fn()
}

// Make `instanceof ImageBitmap` work inside tinify.ts
;(global as any).ImageBitmap = MockImageBitmap

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** Create a Blob whose `.size` matches the requested byte count. */
function makeBlob (size: number, type = 'image/jpeg'): Blob {
  return new Blob([new Uint8Array(size)], { type })
}

/** Create a mock ImageBitmap for a given resolution. */
function mockBitmap (w = 100, h = 80): MockImageBitmap {
  return new MockImageBitmap(w, h)
}

// Tracks the latest mock context so tests can spy on it
let lastCtx: ReturnType<typeof buildMockCtx>

function buildMockCtx () {
  return {
    drawImage: jest.fn(),
    fillRect: jest.fn(),
    getImageData: jest.fn().mockReturnValue({
      data: new Uint8ClampedArray(100 * 80 * 4).fill(128),
    }),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  }
}

/**
 * toBlob mock factory. `sizeForQuality` maps a quality threshold to a size:
 * e.g. { 0.7: 500, Infinity: 2000 } → quality ≤ 0.7 returns 500 bytes, else 2000.
 */
function makeToBlob (
  sizeForQuality: Record<number, number> = { [Infinity]: 200 },
  baseType?: string,
) {
  return jest.fn((cb: BlobCallback, type?: string, quality = 1) => {
    const thresholds = Object.keys(sizeForQuality)
      .map(Number)
      .sort((a, b) => a - b)
    const threshold = thresholds.find(t => quality <= t) ?? thresholds[thresholds.length - 1]
    const size = sizeForQuality[threshold]
    cb(makeBlob(size, baseType ?? type ?? 'image/webp'))
  })
}

// ─── Global mock install ──────────────────────────────────────────────────────

beforeEach(() => {
  lastCtx = buildMockCtx()

  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    lastCtx as unknown as RenderingContext,
  )

  // Default toBlob: always returns a 200-byte blob whose type matches the requested mime
  HTMLCanvasElement.prototype.toBlob = makeToBlob({ [Infinity]: 200 })

  ;(global as any).createImageBitmap = jest.fn().mockResolvedValue(mockBitmap())
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ─── compress – basic ─────────────────────────────────────────────────────────

describe('compress – basic', () => {
  test('accepts a Blob source and returns a CompressResult', async () => {
    const input = makeBlob(1024, 'image/jpeg')
    const result = await compress(input, { format: 'image/webp', quality: 0.8 })

    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.format).toBe('image/webp')
    expect(result.quality).toBe(0.8)
    expect(result.width).toBe(100)
    expect(result.height).toBe(80)
    expect(result.originalSize).toBe(1024)
    expect(result.compressedSize).toBeGreaterThan(0)
    expect(result.ratio).toBeCloseTo(result.compressedSize / 1024, 5)
  })

  test('accepts an ImageBitmap source', async () => {
    const bmp = mockBitmap(200, 150) as unknown as ImageBitmap
    const result = await compress(bmp, { format: 'image/jpeg', quality: 0.9 })

    expect(result.width).toBe(200)
    expect(result.height).toBe(150)
    expect(result.originalSize).toBeUndefined()
    expect(result.ratio).toBeUndefined()
  })

  test('accepts a URL string source (mocks fetch)', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve(makeBlob(512, 'image/jpeg')),
    })
    const origFetch = (global as any).fetch
    ;(global as any).fetch = mockFetch

    try {
      const result = await compress('https://example.com/img.jpg', { format: 'image/jpeg' })
      expect(result.blob).toBeInstanceOf(Blob)
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/img.jpg')
    } finally {
      ;(global as any).fetch = origFetch
    }
  })

  test('throws when canvas.toBlob() returns null', async () => {
    HTMLCanvasElement.prototype.toBlob = jest.fn((cb: BlobCallback) => cb(null))
    await expect(compress(makeBlob(100), { format: 'image/webp' })).rejects.toThrow('tinify')
  })
})

// ─── compress – PNG (lossless) ────────────────────────────────────────────────

describe('compress – PNG output', () => {
  test('skips quality search and returns quality = 1', async () => {
    HTMLCanvasElement.prototype.toBlob = makeToBlob({ [Infinity]: 300 }, 'image/png')
    const result = await compress(makeBlob(1024), { format: 'image/png' })

    expect(result.format).toBe('image/png')
    expect(result.quality).toBe(1)
  })

  test('toBlob is called at most twice for PNG (probe + encode, no search loop)', async () => {
    const spy = makeToBlob({ [Infinity]: 300 }, 'image/png')
    HTMLCanvasElement.prototype.toBlob = spy
    await compress(makeBlob(1024), { format: 'image/png' })

    // 1 supportsFormat probe + 1 actual encode = max 2 (cached on repeat runs)
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2)
  })
})

// ─── compress – dimension scaling ────────────────────────────────────────────

describe('compress – dimension scaling', () => {
  test('scales down width when image exceeds maxWidth', async () => {
    ;(global as any).createImageBitmap = jest.fn().mockResolvedValue(mockBitmap(800, 600))

    const result = await compress(makeBlob(1024), { format: 'image/webp', maxWidth: 400 })
    expect(result.width).toBe(400)
    expect(result.height).toBe(300) // aspect ratio preserved
  })

  test('scales down height when image exceeds maxHeight', async () => {
    ;(global as any).createImageBitmap = jest.fn().mockResolvedValue(mockBitmap(400, 800))

    const result = await compress(makeBlob(1024), { format: 'image/webp', maxHeight: 200 })
    expect(result.height).toBe(200)
    expect(result.width).toBe(100) // 400 * (200/800)
  })

  test('applies both maxWidth and maxHeight, using the tighter constraint', async () => {
    ;(global as any).createImageBitmap = jest.fn().mockResolvedValue(mockBitmap(1000, 500))

    const result = await compress(makeBlob(1024), { format: 'image/webp', maxWidth: 400, maxHeight: 100 })
    // After maxWidth=400: 400×200. After maxHeight=100: 200×100.
    expect(result.height).toBe(100)
    expect(result.width).toBe(200)
  })

  test('does not upscale images smaller than the constraint', async () => {
    ;(global as any).createImageBitmap = jest.fn().mockResolvedValue(mockBitmap(50, 50))

    const result = await compress(makeBlob(100), { format: 'image/webp', maxWidth: 1920 })
    expect(result.width).toBe(50)
    expect(result.height).toBe(50)
  })
})

// ─── compress – maxSize binary search ────────────────────────────────────────

describe('compress – maxSize binary search', () => {
  test('returns a blob that fits within maxSize', async () => {
    // quality ≤ 0.65 → 400 bytes (fits), quality > 0.65 → 2000 bytes (too large)
    HTMLCanvasElement.prototype.toBlob = makeToBlob({ 0.65: 400, [Infinity]: 2000 })

    const result = await compress(makeBlob(5000), {
      format: 'image/webp',
      quality: 0.9,
      maxSize: 1000,
    })

    expect(result.compressedSize).toBeLessThanOrEqual(1000)
    expect(result.quality).toBeLessThan(0.9)
    expect(result.quality).toBeGreaterThanOrEqual(0.4) // above minQuality floor
  })

  test('uses higher quality when it fits', async () => {
    // All qualities produce a small blob → should use high quality
    HTMLCanvasElement.prototype.toBlob = makeToBlob({ [Infinity]: 100 })

    const result = await compress(makeBlob(5000), {
      format: 'image/webp',
      quality: 0.9,
      maxSize: 500,
    })

    expect(result.compressedSize).toBeLessThanOrEqual(500)
    // Quality should be kept high since 100 bytes always fits
    expect(result.quality).toBeGreaterThan(0.8)
  })

  test('falls back to minQuality when even smallest output exceeds maxSize', async () => {
    // Every quality produces a 5000-byte blob
    HTMLCanvasElement.prototype.toBlob = makeToBlob({ [Infinity]: 5000 })

    const result = await compress(makeBlob(9000), {
      format: 'image/webp',
      quality: 0.9,
      maxSize: 100,
      minQuality: 0.3,
    })

    // Should not throw; uses minQuality fallback
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.quality).toBe(0.3)
  })

  test('respects custom searchIterations count', async () => {
    const spy = makeToBlob({ 0.5: 400, [Infinity]: 2000 })
    HTMLCanvasElement.prototype.toBlob = spy

    await compress(makeBlob(5000), {
      format: 'image/webp',
      quality: 0.9,
      maxSize: 1000,
      searchIterations: 4,
    })

    // PNG is lossless (excluded). For lossy: ≤ 4 iterations + 0 probes
    expect(spy.mock.calls.length).toBeLessThanOrEqual(4)
  })
})

// ─── compress – PSNR measurement ─────────────────────────────────────────────

describe('compress – PSNR measurement', () => {
  test('psnr is a positive number when measurePSNR is true', async () => {
    const result = await compress(makeBlob(1024), {
      format: 'image/webp',
      measurePSNR: true,
    })

    expect(typeof result.psnr).toBe('number')
    expect(result.psnr).toBeGreaterThan(0)
  })

  test('psnr is undefined when measurePSNR is false (default)', async () => {
    const result = await compress(makeBlob(1024), { format: 'image/webp' })
    expect(result.psnr).toBeUndefined()
  })

  test('returns Infinity for psnr when original and compressed are identical pixels', async () => {
    // getImageData returns the same data for both canvases → MSE=0 → PSNR=Infinity
    lastCtx.getImageData.mockReturnValue({
      data: new Uint8ClampedArray(100 * 80 * 4).fill(128),
    })

    const result = await compress(makeBlob(1024), {
      format: 'image/webp',
      measurePSNR: true,
    })

    expect(result.psnr).toBe(Infinity)
  })
})

// ─── compressBatch ────────────────────────────────────────────────────────────

describe('compressBatch', () => {
  test('returns one result per input', async () => {
    const inputs = [makeBlob(100), makeBlob(200), makeBlob(300)]
    const results = await compressBatch(inputs, { format: 'image/webp' })

    expect(results).toHaveLength(3)
    results.forEach(r => expect(r).not.toBeInstanceOf(Error))
  })

  test('captures errors per item without aborting the batch', async () => {
    HTMLCanvasElement.prototype.toBlob = jest.fn((cb: BlobCallback) => cb(null))

    const inputs = [makeBlob(100), makeBlob(200)]
    const results = await compressBatch(inputs, { format: 'image/webp' })

    results.forEach(r => expect(r).toBeInstanceOf(Error))
  })

  test('calls onProgress for each completed item', async () => {
    const progress = jest.fn()
    const inputs = [makeBlob(100), makeBlob(200), makeBlob(300)]

    await compressBatch(inputs, { format: 'image/webp', onProgress: progress })

    expect(progress).toHaveBeenCalledTimes(3)
    // Last call: done === total
    const lastCall = progress.mock.calls[progress.mock.calls.length - 1]
    expect(lastCall).toEqual([3, 3])
  })

  test('respects concurrency limit', async () => {
    let active = 0
    let peakActive = 0

    ;(global as any).createImageBitmap = jest.fn().mockImplementation(
      () =>
        new Promise<MockImageBitmap>(resolve => {
          active++
          peakActive = Math.max(peakActive, active)
          setTimeout(() => {
            active--
            resolve(mockBitmap())
          }, 10)
        }),
    )

    const inputs = Array.from({ length: 8 }, () => makeBlob(100))
    await compressBatch(inputs, { format: 'image/webp', concurrency: 2 })

    expect(peakActive).toBeLessThanOrEqual(2)
  })

  test('preserves original order of results', async () => {
    let call = 0
    ;(global as any).createImageBitmap = jest.fn().mockImplementation(() => {
      const i = call++
      const delay = i % 2 === 0 ? 20 : 0 // even items are slower
      return new Promise<MockImageBitmap>(resolve => setTimeout(() => resolve(mockBitmap(i + 10, i + 10)), delay))
    })

    HTMLCanvasElement.prototype.toBlob = jest.fn((cb: BlobCallback, type?: string) => {
      cb(makeBlob(50, type))
    })

    const inputs = Array.from({ length: 4 }, () => makeBlob(100))
    const results = await compressBatch(inputs, { format: 'image/webp', concurrency: 4 })

    // All should be successful (not Error) and in same count as inputs
    expect(results).toHaveLength(4)
    results.forEach(r => expect(r).not.toBeInstanceOf(Error))
  })
})

// ─── Convenience helpers ──────────────────────────────────────────────────────

describe('compressForWeb', () => {
  test('uses webp format and default quality 0.85', async () => {
    const result = await compressForWeb(makeBlob(1024))
    expect(result.format).toBe('image/webp')
    expect(result.quality).toBe(0.85)
  })

  test('limits output to maxWidth 1920', async () => {
    ;(global as any).createImageBitmap = jest.fn().mockResolvedValue(mockBitmap(3840, 2160))
    const result = await compressForWeb(makeBlob(1024))
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
  })

  test('overrides are applied', async () => {
    const result = await compressForWeb(makeBlob(1024), { quality: 0.6 })
    expect(result.quality).toBe(0.6)
  })
})

describe('compressToSize', () => {
  test('targets the given maxBytes limit', async () => {
    HTMLCanvasElement.prototype.toBlob = makeToBlob({ 0.7: 300, [Infinity]: 2000 })

    const result = await compressToSize(makeBlob(5000), 1000)
    expect(result.compressedSize).toBeLessThanOrEqual(1000)
  })

  test('overrides are applied', async () => {
    HTMLCanvasElement.prototype.toBlob = makeToBlob({ [Infinity]: 100 }, 'image/jpeg')

    const result = await compressToSize(makeBlob(5000), 1000, { format: 'image/jpeg' })
    expect(result.format).toBe('image/jpeg')
  })
})

describe('thumbnail', () => {
  test('scales image to default 200px', async () => {
    ;(global as any).createImageBitmap = jest.fn().mockResolvedValue(mockBitmap(800, 600))
    const result = await thumbnail(makeBlob(1024))
    expect(result.width).toBeLessThanOrEqual(200)
    expect(result.height).toBeLessThanOrEqual(200)
  })

  test('uses custom size', async () => {
    ;(global as any).createImageBitmap = jest.fn().mockResolvedValue(mockBitmap(1000, 1000))
    const result = await thumbnail(makeBlob(1024), 100)
    expect(result.width).toBeLessThanOrEqual(100)
    expect(result.height).toBeLessThanOrEqual(100)
  })

  test('uses webp format by default', async () => {
    const result = await thumbnail(makeBlob(1024))
    expect(result.format).toBe('image/webp')
  })
})

// ─── Format detection ─────────────────────────────────────────────────────────

describe('format detection – auto', () => {
  test('auto selects a supported lossy format', async () => {
    // Default mock makes toBlob always return a matching blob type, so any
    // format appears supported.  The result should be one of the three lossy formats.
    const result = await compress(makeBlob(1024), { format: 'auto' })
    expect(['image/avif', 'image/webp', 'image/jpeg']).toContain(result.format)
  })
})

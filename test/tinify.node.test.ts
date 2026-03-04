/**
 * @jest-environment node
 *
 * Tests for the Node.js path of tinify (backed by `sharp`).
 * Since isNodeEnv() returns true when HTMLCanvasElement is absent,
 * all compress() calls in this file automatically route through _compressNode().
 *
 * `sharp` is mocked as a virtual module – no installation required.
 * `fs/promises` is mocked for file-path source tests.
 */

// ─── Shared mock instance ─────────────────────────────────────────────────────
//
// The `jest.mock()` factory is hoisted before any `const`/`let` declarations.
// Using `var` here means the variable is hoisted (as `undefined`) and the
// factory can reference it via closure.  The object is assigned before the
// factory is ever *called* (on the first `import('sharp')`), so this is safe.
//
// Variables declared with `var` that start with `mock` are allowed in
// jest.mock() factories by babel-jest as a documented exception.

/* eslint-disable no-var */
var mockSharpMethods: {
  metadata: jest.Mock
  resize:   jest.Mock
  webp:     jest.Mock
  avif:     jest.Mock
  jpeg:     jest.Mock
  png:      jest.Mock
  raw:      jest.Mock
  toBuffer: jest.Mock
}
var mockSharpFactory: jest.Mock
/* eslint-enable no-var */

// ─── Virtual module mocks ─────────────────────────────────────────────────────

// The factory is registered at hoist-time but only CALLED when the test
// invokes `compress()` which triggers `await import('sharp')`.
// By that time mockSharpMethods is already initialized (lines below).
jest.mock(
  'sharp',
  () => {
    mockSharpFactory = jest.fn(() => mockSharpMethods)
    ;(mockSharpFactory as any).default = mockSharpFactory
    return mockSharpFactory
  },
  { virtual: true },
)

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  stat:     jest.fn(),
}))

// ─── Initialize mock instance (runs before any test) ─────────────────────────

// Must be `var` initialisations so the jest.mock factory closure above can
// see the final values when it's invoked.
mockSharpMethods = {
  metadata: jest.fn(),
  resize:   jest.fn(),
  webp:     jest.fn(),
  avif:     jest.fn(),
  jpeg:     jest.fn(),
  png:      jest.fn(),
  raw:      jest.fn(),
  toBuffer: jest.fn(),
}

// ─── Real imports ─────────────────────────────────────────────────────────────

import { compress, compressBatch, compressForWeb, compressToSize, thumbnail } from '../src/tinify'
import * as fsPromises from 'fs/promises'

const mockFs = fsPromises as jest.Mocked<typeof fsPromises>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUint8(size: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(size))
}

function makeBlob(size: number, type = 'image/jpeg'): Blob {
  return new Blob([makeUint8(size)], { type })
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()

  // Re-apply chaining: each method returns the instance
  mockSharpMethods.resize.mockReturnValue(mockSharpMethods)
  mockSharpMethods.webp.mockReturnValue(mockSharpMethods)
  mockSharpMethods.avif.mockReturnValue(mockSharpMethods)
  mockSharpMethods.jpeg.mockReturnValue(mockSharpMethods)
  mockSharpMethods.png.mockReturnValue(mockSharpMethods)
  mockSharpMethods.raw.mockReturnValue(mockSharpMethods)

  // Default: 100×80 source, 500-byte output
  mockSharpMethods.metadata.mockResolvedValue({ width: 100, height: 80 })
  mockSharpMethods.toBuffer.mockImplementation((opts?: { resolveWithObject?: boolean }) => {
    if (opts?.resolveWithObject) {
      return Promise.resolve({
        data: new Uint8Array(new ArrayBuffer(100 * 80 * 3)).fill(128),
        info: { width: 100, height: 80, channels: 3 },
      })
    }
    return Promise.resolve(makeUint8(500))
  })
})

// ─── Environment detection ────────────────────────────────────────────────────

describe('Node.js environment', () => {
  test('HTMLCanvasElement is not defined (confirming Node env)', () => {
    expect(typeof HTMLCanvasElement).toBe('undefined')
  })

  test('compress() resolves successfully in Node env', async () => {
    const result = await compress(makeUint8(1024), { format: 'image/webp' })
    expect(result.blob).toBeInstanceOf(Blob)
  })
})

// ─── Source types ─────────────────────────────────────────────────────────────

describe('source types', () => {
  test('Uint8Array / Buffer source', async () => {
    const result = await compress(makeUint8(1024), { format: 'image/webp' })
    expect(result.originalSize).toBe(1024)
    expect(mockSharpFactory).toHaveBeenCalledWith(expect.any(Uint8Array))
  })

  test('ArrayBuffer source', async () => {
    const ab = new ArrayBuffer(512)
    const result = await compress(ab, { format: 'image/webp' })
    expect(result.blob).toBeInstanceOf(Blob)
  })

  test('Blob source (Node 18+)', async () => {
    const result = await compress(makeBlob(2048), { format: 'image/webp' })
    expect(result.originalSize).toBe(2048)
  })

  test('File source', async () => {
    const file = new File([makeUint8(512)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await compress(file, { format: 'image/webp' })
    expect(result.originalSize).toBe(512)
  })

  test('file-path string source (reads via fs/promises)', async () => {
    const buf = Buffer.from(makeUint8(800))
    mockFs.readFile.mockResolvedValue(buf as any)
    mockFs.stat.mockResolvedValue({ size: 800 } as any)

    const result = await compress('/img/photo.jpg', { format: 'image/webp' })
    expect(mockFs.readFile).toHaveBeenCalledWith('/img/photo.jpg')
    expect(result.originalSize).toBe(800)
  })

  test('HTTP URL string source (downloads via fetch)', async () => {
    const origFetch = (global as any).fetch
    ;(global as any).fetch = jest.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    })
    try {
      const result = await compress('https://cdn.example.com/img.jpg', { format: 'image/webp' })
      expect(result.blob).toBeInstanceOf(Blob)
    } finally {
      ;(global as any).fetch = origFetch
    }
  })

  test('throws for unsupported source type', async () => {
    await expect(compress(42 as any, { format: 'image/webp' })).rejects.toThrow('tinify')
  })
})

// ─── Format routing ───────────────────────────────────────────────────────────

describe('format routing', () => {
  test('image/webp calls sharp.webp()', async () => {
    await compress(makeUint8(100), { format: 'image/webp' })
    expect(mockSharpMethods.webp).toHaveBeenCalled()
    expect(mockSharpMethods.jpeg).not.toHaveBeenCalled()
  })

  test('image/avif calls sharp.avif()', async () => {
    await compress(makeUint8(100), { format: 'image/avif' })
    expect(mockSharpMethods.avif).toHaveBeenCalled()
  })

  test('image/jpeg calls sharp.jpeg() with mozjpeg enabled', async () => {
    await compress(makeUint8(100), { format: 'image/jpeg' })
    expect(mockSharpMethods.jpeg).toHaveBeenCalledWith(
      expect.objectContaining({ mozjpeg: true }),
    )
  })

  test('image/png calls sharp.png() (lossless, quality=1)', async () => {
    const result = await compress(makeUint8(100), { format: 'image/png' })
    expect(mockSharpMethods.png).toHaveBeenCalled()
    expect(result.quality).toBe(1)
  })

  test('auto format defaults to image/webp in Node', async () => {
    const result = await compress(makeUint8(100), { format: 'auto' })
    expect(result.format).toBe('image/webp')
    expect(mockSharpMethods.webp).toHaveBeenCalled()
  })

  test('quality [0,1] is scaled to 0–100 for sharp', async () => {
    await compress(makeUint8(100), { format: 'image/webp', quality: 0.75 })
    expect(mockSharpMethods.webp).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 75 }),
    )
  })
})

// ─── Dimension scaling ────────────────────────────────────────────────────────

describe('dimension scaling', () => {
  test('scales down when image exceeds maxWidth', async () => {
    mockSharpMethods.metadata.mockResolvedValue({ width: 800, height: 600 })

    const result = await compress(makeUint8(100), { format: 'image/webp', maxWidth: 400 })
    expect(result.width).toBe(400)
    expect(result.height).toBe(300)
    expect(mockSharpMethods.resize).toHaveBeenCalledWith(
      400, 300, expect.objectContaining({ withoutEnlargement: true }),
    )
  })

  test('does not call resize when image fits within constraints', async () => {
    mockSharpMethods.metadata.mockResolvedValue({ width: 100, height: 80 })

    await compress(makeUint8(100), { format: 'image/webp', maxWidth: 1920 })
    expect(mockSharpMethods.resize).not.toHaveBeenCalled()
  })

  test('reports correct output dimensions in result', async () => {
    mockSharpMethods.metadata.mockResolvedValue({ width: 400, height: 300 })

    const result = await compress(makeUint8(100), { format: 'image/webp' })
    expect(result.width).toBe(400)
    expect(result.height).toBe(300)
  })
})

// ─── maxSize binary search ────────────────────────────────────────────────────

describe('maxSize binary search', () => {
  test('finds the highest quality that fits within maxSize', async () => {
    mockSharpMethods.toBuffer.mockImplementation(() => {
      const calls = mockSharpMethods.webp.mock.calls
      const q = (calls[calls.length - 1]?.[0] as any)?.quality ?? 85
      return Promise.resolve(makeUint8(q <= 65 ? 400 : 2000))
    })

    const result = await compress(makeUint8(5000), {
      format: 'image/webp',
      quality: 0.9,
      maxSize: 1000,
    })
    expect(result.compressedSize).toBeLessThanOrEqual(1000)
    expect(result.quality).toBeLessThan(0.9)
  })

  test('falls back to minQuality when nothing fits', async () => {
    mockSharpMethods.toBuffer.mockResolvedValue(makeUint8(9999))

    const result = await compress(makeUint8(1000), {
      format: 'image/webp',
      quality: 0.9,
      maxSize: 100,
      minQuality: 0.2,
    })
    expect(result.quality).toBe(0.2)
    expect(result.blob).toBeInstanceOf(Blob)
  })

  test('keeps high quality when everything fits', async () => {
    mockSharpMethods.toBuffer.mockResolvedValue(makeUint8(50))

    const result = await compress(makeUint8(1000), {
      format: 'image/webp',
      quality: 0.9,
      maxSize: 5000,
    })
    expect(result.quality).toBeGreaterThan(0.85)
  })
})

// ─── PSNR measurement ─────────────────────────────────────────────────────────

describe('PSNR measurement', () => {
  test('psnr is a positive number when measurePSNR is true', async () => {
    const result = await compress(makeUint8(1000), {
      format: 'image/webp',
      measurePSNR: true,
    })
    expect(typeof result.psnr).toBe('number')
    expect(result.psnr).toBeGreaterThan(0)
    expect(mockSharpMethods.raw).toHaveBeenCalled()
  })

  test('psnr is undefined when measurePSNR is false (default)', async () => {
    const result = await compress(makeUint8(1000), { format: 'image/webp' })
    expect(result.psnr).toBeUndefined()
    expect(mockSharpMethods.raw).not.toHaveBeenCalled()
  })

  test('returns Infinity when src and compressed pixels are identical (MSE=0)', async () => {
    mockSharpMethods.toBuffer.mockImplementation((opts?: { resolveWithObject?: boolean }) => {
      if (opts?.resolveWithObject) {
        return Promise.resolve({
          data: new Uint8Array(new ArrayBuffer(100 * 80 * 3)).fill(128),
          info: { width: 100, height: 80, channels: 3 },
        })
      }
      return Promise.resolve(makeUint8(500))
    })

    const result = await compress(makeUint8(1000), {
      format: 'image/webp',
      measurePSNR: true,
    })
    expect(result.psnr).toBe(Infinity)
  })
})

// ─── CompressResult shape ─────────────────────────────────────────────────────

describe('CompressResult metadata', () => {
  test('blob MIME type matches the requested format', async () => {
    const result = await compress(makeUint8(100), { format: 'image/jpeg' })
    expect(result.blob.type).toBe('image/jpeg')
  })

  test('ratio = compressedSize / originalSize', async () => {
    mockSharpMethods.toBuffer.mockResolvedValue(makeUint8(200))

    const result = await compress(makeUint8(1000), { format: 'image/webp' })
    expect(result.ratio).toBeCloseTo(200 / 1000, 5)
  })

  test('ratio is undefined when originalSize is not available', async () => {
    const result = await compress(new ArrayBuffer(512), { format: 'image/webp' })
    expect(result.ratio).toBeUndefined()
  })
})

// ─── Error: sharp not installed ───────────────────────────────────────────────

describe('error handling', () => {
  test('throws a descriptive error when sharp is not installed', async () => {
    // Replace the factory temporarily with one that throws
    const orig = mockSharpFactory.getMockImplementation()
    mockSharpFactory.mockImplementation(() => {
      throw new Error("Cannot find module 'sharp'")
    })
    try {
      await expect(
        compress(makeUint8(100), { format: 'image/webp' }),
      ).rejects.toThrow('sharp')
    } finally {
      if (orig) mockSharpFactory.mockImplementation(orig)
      else mockSharpFactory.mockReturnValue(mockSharpMethods)
    }
  })
})

// ─── Convenience helpers ──────────────────────────────────────────────────────

describe('compressForWeb (Node)', () => {
  test('uses webp and default quality 0.85', async () => {
    const result = await compressForWeb(makeUint8(1024))
    expect(result.format).toBe('image/webp')
    expect(result.quality).toBe(0.85)
  })

  test('calls resize when source exceeds 1920px', async () => {
    mockSharpMethods.metadata.mockResolvedValue({ width: 3840, height: 2160 })

    const result = await compressForWeb(makeUint8(1024))
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
    expect(mockSharpMethods.resize).toHaveBeenCalled()
  })
})

describe('compressToSize (Node)', () => {
  test('binary-searches to stay within maxBytes', async () => {
    mockSharpMethods.toBuffer.mockImplementation(() => {
      const calls = mockSharpMethods.webp.mock.calls
      const q = (calls[calls.length - 1]?.[0] as any)?.quality ?? 92
      return Promise.resolve(makeUint8(q < 70 ? 300 : 2000))
    })
    const result = await compressToSize(makeUint8(5000), 1000)
    expect(result.compressedSize).toBeLessThanOrEqual(1000)
  })
})

describe('thumbnail (Node)', () => {
  test('scales to the default 200px max dimension', async () => {
    mockSharpMethods.metadata.mockResolvedValue({ width: 800, height: 600 })

    const result = await thumbnail(makeUint8(1024))
    expect(result.width).toBeLessThanOrEqual(200)
    expect(result.height).toBeLessThanOrEqual(200)
  })

  test('uses webp format by default', async () => {
    const result = await thumbnail(makeUint8(1024))
    expect(result.format).toBe('image/webp')
  })
})

describe('compressBatch (Node)', () => {
  test('returns one result per input', async () => {
    const inputs = [makeUint8(100), makeUint8(200), makeUint8(300)]
    const results = await compressBatch(inputs, { format: 'image/webp' })

    expect(results).toHaveLength(3)
    results.forEach(r => expect(r).not.toBeInstanceOf(Error))
  })

  test('captures errors per item without aborting the batch', async () => {
    mockSharpMethods.metadata.mockRejectedValue(new Error('decode failed'))

    const results = await compressBatch(
      [makeUint8(100), makeUint8(200)],
      { format: 'image/webp' },
    )
    results.forEach(r => expect(r).toBeInstanceOf(Error))
  })

  test('calls onProgress after each completed item', async () => {
    const progress = jest.fn()
    await compressBatch(
      [makeUint8(100), makeUint8(200), makeUint8(300)],
      { format: 'image/webp', onProgress: progress },
    )
    expect(progress).toHaveBeenCalledTimes(3)
    expect(progress.mock.calls[2]).toEqual([3, 3])
  })
})

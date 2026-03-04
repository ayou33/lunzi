// ─── OffscreenCanvas type shim ────────────────────────────────────────────────
// TypeScript ≤4.x places OffscreenCanvas in lib.webworker, not lib.dom.
// We declare a minimal local interface so tinify compiles without requiring the
// full webworker lib (which conflicts with DOM types).

// ─── Module ───────────────────────────────────────────────────────────────────

/**
 * tinify - High-performance, high-fidelity, low-loss image compression
 *
 * Features:
 * - Multiple output formats: WebP, AVIF, JPEG, PNG
 * - Smart quality search via binary search to meet size/quality targets
 * - Resize with aspect ratio preservation (Lanczos-like multi-step downscale)
 * - PSNR-based fidelity measurement via pixel sampling
 * - OffscreenCanvas support for Web Worker environments
 * - Automatic best-format detection
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageMimeType = 'image/webp' | 'image/avif' | 'image/jpeg' | 'image/png'

export interface CompressOptions {
  /**
   * Preferred output format.
   * 'auto' will try WebP → AVIF → JPEG in order of browser support.
   * @default 'auto'
   */
  format?: ImageMimeType | 'auto'

  /**
   * Output quality [0, 1]. Applies to lossy formats (WebP/AVIF/JPEG).
   * If `maxSize` is also set, quality is used as the upper bound.
   * @default 0.85
   */
  quality?: number

  /**
   * Maximum output file size in bytes. The compressor will reduce quality
   * via binary search until the file fits within this limit.
   */
  maxSize?: number

  /**
   * Minimum acceptable quality floor when searching for `maxSize`.
   * @default 0.4
   */
  minQuality?: number

  /**
   * Maximum output width in pixels. The image is scaled down proportionally
   * if it exceeds this value. Has no effect if the image is already smaller.
   */
  maxWidth?: number

  /**
   * Maximum output height in pixels.
   */
  maxHeight?: number

  /**
   * Number of binary-search iterations when fitting into `maxSize`.
   * Higher = more accurate but slower.
   * @default 8
   */
  searchIterations?: number

  /**
   * Whether to compute a PSNR quality metric on the result.
   * Adds a second canvas decode pass – disable for bulk/performance-critical work.
   * @default false
   */
  measurePSNR?: boolean
}

export interface CompressResult {
  blob: Blob
  /** Output MIME type */
  format: ImageMimeType
  /** Final quality value used */
  quality: number
  /** Width of the output image */
  width: number
  /** Height of the output image */
  height: number
  /** Original file size in bytes (if input was a File/Blob) */
  originalSize?: number
  /** Compressed file size in bytes */
  compressedSize: number
  /** Compression ratio: compressedSize / originalSize */
  ratio?: number
  /** PSNR in dB (higher is better; ≥40 dB is considered visually lossless) */
  psnr?: number
}

// ─── Format detection ─────────────────────────────────────────────────────────

const _formatCache: Partial<Record<ImageMimeType, boolean>> = {}

/** Test whether the browser's canvas encoder supports a given MIME type. */
async function supportsFormat(mime: ImageMimeType): Promise<boolean> {
  if (_formatCache[mime] !== undefined) return _formatCache[mime]!
  try {
    const c = createCanvas(1, 1)
    const ctx = getContext(c)
    ctx.fillRect(0, 0, 1, 1)
    const blob = await canvasToBlob(c, mime, 0.9)
    const result = blob !== null && blob.size > 0 && blob.type === mime
    _formatCache[mime] = result
    return result
  } catch {
    _formatCache[mime] = false
    return false
  }
}

/** Resolve 'auto' to the best available lossy format. */
async function resolveBestLossyFormat(): Promise<ImageMimeType> {
  if (await supportsFormat('image/avif')) return 'image/avif'
  if (await supportsFormat('image/webp')) return 'image/webp'
  return 'image/jpeg'
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

function getContext(canvas: AnyCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!ctx) throw new Error('tinify: failed to get 2d context')
  return ctx
}

function canvasToBlob(canvas: AnyCanvas, type: ImageMimeType, quality: number): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality }).then(b => b).catch(() => null)
  }
  return new Promise(resolve => {
    (canvas as HTMLCanvasElement).toBlob(resolve, type, quality)
  })
}

// ─── Image loading ────────────────────────────────────────────────────────────

type ImageSource = HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap | Blob | File | string

async function loadBitmap(source: ImageSource): Promise<ImageBitmap> {
  if (source instanceof ImageBitmap) return source
  if (source instanceof HTMLImageElement) {
    if (!source.complete || source.naturalWidth === 0) {
      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve()
        source.onerror = reject
      })
    }
    return createImageBitmap(source)
  }
  if (source instanceof HTMLCanvasElement || (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas)) {
    return createImageBitmap(source as HTMLCanvasElement)
  }
  if (source instanceof Blob) {
    return createImageBitmap(source)
  }
  if (typeof source === 'string') {
    const resp = await fetch(source)
    const blob = await resp.blob()
    return createImageBitmap(blob)
  }
  throw new Error('tinify: unsupported image source type')
}

// ─── Resize logic (multi-step for high quality) ───────────────────────────────

/**
 * Compute output dimensions respecting maxWidth / maxHeight while keeping
 * the original aspect ratio.  Returns original dimensions if no constraint is
 * violated.
 */
function computeDimensions(
  srcW: number,
  srcH: number,
  maxWidth?: number,
  maxHeight?: number,
): { width: number; height: number } {
  let w = srcW
  let h = srcH
  if (maxWidth && w > maxWidth) {
    h = Math.round((h * maxWidth) / w)
    w = maxWidth
  }
  if (maxHeight && h > maxHeight) {
    w = Math.round((w * maxHeight) / h)
    h = maxHeight
  }
  return { width: w, height: h }
}

/**
 * Multi-step downscale: repeatedly halving until we're within 2× of the
 * target, then draw at final size.  This approximates Lanczos resampling
 * using the browser's built-in bilinear filter and produces much sharper
 * results than a single-step scale for large reductions.
 */
function drawScaled(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  bitmap: ImageBitmap,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): void {
  // If scaling ratio is small enough, draw directly
  if (srcW / dstW <= 2 && srcH / dstH <= 2) {
    ctx.drawImage(bitmap, 0, 0, dstW, dstH)
    return
  }

  // Multi-step: halve the image iteratively until close to target
  let curW = srcW
  let curH = srcH
  let prev: AnyCanvas | ImageBitmap = bitmap

  while (curW / dstW > 2 || curH / dstH > 2) {
    const stepW = Math.max(Math.ceil(curW / 2), dstW)
    const stepH = Math.max(Math.ceil(curH / 2), dstH)
    const step = createCanvas(stepW, stepH)
    const stepCtx = getContext(step)
    stepCtx.drawImage(prev as CanvasImageSource, 0, 0, stepW, stepH)
    if (prev !== bitmap) (prev as HTMLCanvasElement | OffscreenCanvas).width = 0 // release
    prev = step
    curW = stepW
    curH = stepH
  }

  ctx.drawImage(prev as CanvasImageSource, 0, 0, dstW, dstH)
  if (prev !== bitmap) (prev as HTMLCanvasElement | OffscreenCanvas).width = 0
}

// ─── PSNR measurement ─────────────────────────────────────────────────────────

/**
 * Estimate PSNR (dB) between original bitmap and compressed blob.
 * Uses a random pixel sample for performance (default 4096 pixels).
 *
 * PSNR ≥ 40 dB  → visually lossless
 * PSNR 30–40 dB → good quality
 * PSNR < 30 dB  → noticeable artifacts
 */
async function measurePSNR(
  original: ImageBitmap,
  compressed: Blob,
  sampleCount = 4096,
): Promise<number> {
  const compBitmap = await createImageBitmap(compressed)
  const w = original.width
  const h = original.height

  const srcCanvas = createCanvas(w, h)
  const dstCanvas = createCanvas(w, h)
  const srcCtx = getContext(srcCanvas)
  const dstCtx = getContext(dstCanvas)

  srcCtx.drawImage(original, 0, 0)
  dstCtx.drawImage(compBitmap, 0, 0)
  compBitmap.close()

  const srcData = srcCtx.getImageData(0, 0, w, h).data
  const dstData = dstCtx.getImageData(0, 0, w, h).data

  // Release canvas memory
  srcCanvas.width = 0
  dstCanvas.width = 0

  const total = w * h
  const step = Math.max(1, Math.floor(total / sampleCount))
  let mse = 0
  let count = 0

  for (let i = 0; i < total; i += step) {
    const idx = i * 4
    const dr = srcData[idx] - dstData[idx]
    const dg = srcData[idx + 1] - dstData[idx + 1]
    const db = srcData[idx + 2] - dstData[idx + 2]
    mse += (dr * dr + dg * dg + db * db) / 3
    count++
  }

  mse /= count
  if (mse === 0) return Infinity
  return 10 * Math.log10((255 * 255) / mse)
}

// ─── Core compress function ───────────────────────────────────────────────────

/**
 * Compress an image with the given options.
 *
 * @param source  Any image source: File, Blob, URL string, HTMLImageElement, or ImageBitmap
 * @param options Compression options
 * @returns       CompressResult with the compressed Blob and metadata
 *
 * @example
 * const result = await compress(file, { format: 'image/webp', quality: 0.85, maxWidth: 1920 })
 * const url = URL.createObjectURL(result.blob)
 */
export async function compress(source: ImageSource, options: CompressOptions = {}): Promise<CompressResult> {
  const {
    format = 'auto',
    quality = 0.85,
    maxSize,
    minQuality = 0.4,
    maxWidth,
    maxHeight,
    searchIterations = 8,
    measurePSNR: doMeasure = false,
  } = options

  const originalSize = source instanceof Blob ? source.size : undefined

  // 1. Load bitmap
  const bitmap = await loadBitmap(source)
  const srcW = bitmap.width
  const srcH = bitmap.height

  // 2. Determine output dimensions
  const { width, height } = computeDimensions(srcW, srcH, maxWidth, maxHeight)

  // 3. Resolve output format
  let outputFormat: ImageMimeType
  if (format === 'auto') {
    outputFormat = await resolveBestLossyFormat()
  } else {
    outputFormat = format
  }

  // 4. Draw to output canvas
  const canvas = createCanvas(width, height)
  const ctx = getContext(canvas)

  // High-quality settings
  if ('imageSmoothingEnabled' in ctx) {
    ;(ctx as CanvasRenderingContext2D).imageSmoothingEnabled = true
    ;(ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'high'
  }

  drawScaled(ctx, bitmap, srcW, srcH, width, height)

  // PNG is lossless – skip quality search
  if (outputFormat === 'image/png') {
    const blob = await canvasToBlob(canvas, 'image/png', 1)
    if (!blob) throw new Error('tinify: canvas.toBlob() returned null')
    bitmap.close()
    const compressedSize = blob.size
    return {
      blob,
      format: 'image/png',
      quality: 1,
      width,
      height,
      originalSize,
      compressedSize,
      ratio: originalSize ? compressedSize / originalSize : undefined,
    }
  }

  // 5. Quality search
  let finalQuality = quality
  let finalBlob: Blob

  if (maxSize !== undefined) {
    // Binary search for the highest quality that fits within maxSize
    let lo = minQuality
    let hi = quality
    let bestBlob: Blob | null = null
    let bestQ = minQuality

    for (let i = 0; i < searchIterations; i++) {
      const mid = (lo + hi) / 2
      const blob = await canvasToBlob(canvas, outputFormat, mid)
      if (!blob) break
      if (blob.size <= maxSize) {
        bestBlob = blob
        bestQ = mid
        lo = mid         // try higher quality
      } else {
        hi = mid         // try lower quality
      }
      if (hi - lo < 0.01) break
    }

    if (!bestBlob) {
      // Even at minQuality it exceeds maxSize; use minQuality anyway
      bestBlob = await canvasToBlob(canvas, outputFormat, minQuality)
      bestQ = minQuality
    }

    finalBlob = bestBlob!
    finalQuality = bestQ
  } else {
    const blob = await canvasToBlob(canvas, outputFormat, quality)
    if (!blob) throw new Error('tinify: canvas.toBlob() returned null')
    finalBlob = blob
    finalQuality = quality
  }

  bitmap.close()

  const compressedSize = finalBlob.size

  // 6. Optional PSNR measurement
  let psnr: number | undefined
  if (doMeasure) {
    const freshBitmap = await loadBitmap(source)
    psnr = await measurePSNR(freshBitmap, finalBlob)
    freshBitmap.close()
  }

  return {
    blob: finalBlob,
    format: outputFormat,
    quality: finalQuality,
    width,
    height,
    originalSize,
    compressedSize,
    ratio: originalSize ? compressedSize / originalSize : undefined,
    psnr,
  }
}

// ─── Batch compression ────────────────────────────────────────────────────────

export interface BatchCompressOptions extends CompressOptions {
  /**
   * Max concurrent compress operations.
   * @default 4
   */
  concurrency?: number
  /** Called after each image finishes */
  onProgress?: (done: number, total: number) => void
}

/**
 * Compress multiple images with controlled concurrency.
 *
 * @example
 * const results = await compressBatch(files, { maxWidth: 1280, maxSize: 200_000, concurrency: 3 })
 */
export async function compressBatch(
  sources: ImageSource[],
  options: BatchCompressOptions = {},
): Promise<Array<CompressResult | Error>> {
  const { concurrency = 4, onProgress, ...compressOpts } = options
  const results: Array<CompressResult | Error> = new Array(sources.length)
  let done = 0
  let index = 0

  async function worker() {
    while (index < sources.length) {
      const i = index++
      try {
        results[i] = await compress(sources[i], compressOpts)
      } catch (e) {
        results[i] = e instanceof Error ? e : new Error(String(e))
      }
      onProgress?.(++done, sources.length)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, sources.length) }, worker)
  await Promise.all(workers)
  return results
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Compress to WebP with sensible defaults for web delivery.
 * Equivalent to `compress(source, { format: 'image/webp', quality: 0.85, maxWidth: 1920 })`
 */
export function compressForWeb(source: ImageSource, overrides?: CompressOptions): Promise<CompressResult> {
  return compress(source, { format: 'image/webp', quality: 0.85, maxWidth: 1920, ...overrides })
}

/**
 * Compress an image to fit within a given file size, preserving as much
 * quality as possible via binary search.
 *
 * @param source     Image source
 * @param maxBytes   Target maximum file size in bytes
 * @param overrides  Additional options
 *
 * @example
 * const result = await compressToSize(file, 100 * 1024) // ≤ 100 KB
 */
export function compressToSize(
  source: ImageSource,
  maxBytes: number,
  overrides?: CompressOptions,
): Promise<CompressResult> {
  return compress(source, { format: 'auto', quality: 0.92, maxSize: maxBytes, ...overrides })
}

/**
 * Generate a thumbnail Blob for quick previews.
 *
 * @param source  Image source
 * @param size    Max dimension (width or height), default 200
 */
export function thumbnail(source: ImageSource, size = 200, overrides?: CompressOptions): Promise<CompressResult> {
  return compress(source, {
    format: 'image/webp',
    quality: 0.8,
    maxWidth: size,
    maxHeight: size,
    ...overrides,
  })
}

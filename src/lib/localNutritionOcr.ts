/**
 * On-device OCR. All runtime assets are served from this PWA origin,
 * packaged during build; no photo or extracted text is uploaded or retained.
 */
export interface OcrProgress { status: string; progress: number }
interface OcrWorker {
  recognize(image: File): Promise<{ data: { text: string } }>
  terminate(): Promise<unknown>
}
interface TesseractApi {
  createWorker(
    languages: string,
    oem: number,
    options: {
      workerPath: string
      corePath: string
      langPath: string
      cacheMethod: 'none'
      logger: (progress: OcrProgress) => void
    }
  ): Promise<OcrWorker>
}
declare global {
  interface Window { Tesseract?: TesseractApi }
}

let loading: Promise<TesseractApi> | null = null
function localPath(path: string): string {
  const base = import.meta.env.BASE_URL
  return new URL(base.replace(/\/?$/, '/') + path, window.location.origin).href
}

function loadLocalOcr(): Promise<TesseractApi> {
  if (window.Tesseract) return Promise.resolve(window.Tesseract)
  if (loading) return loading
  loading = new Promise<TesseractApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = localPath('ocr/tesseract.min.js')
    script.async = true
    script.onload = () => window.Tesseract
      ? resolve(window.Tesseract)
      : reject(new Error('Local text recognition could not start.'))
    script.onerror = () => reject(new Error('Local scanner resources are unavailable.'))
    document.head.appendChild(script)
  }).catch(error => {
    loading = null
    throw error
  })
  return loading!
}

export async function readNutritionLabelPhoto(
  file: File,
  onProgress?: (message: string, percent: number) => void
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo of a nutrition label.')
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose a photo smaller than 15 MB.')
  const api = await loadLocalOcr()
  let worker: OcrWorker | undefined
  try {
    worker = await api.createWorker('eng', 1, {
      workerPath: localPath('ocr/worker.min.js'),
      corePath: localPath('ocr/core'),
      langPath: localPath('ocr/lang'),
      cacheMethod: 'none',
      logger: update => {
        if (update.status && Number.isFinite(update.progress)) {
          onProgress?.(update.status, Math.round(100 * update.progress))
        }
      }
    })
    const result = await worker.recognize(file)
    return result.data.text
  } finally {
    if (worker) await worker.terminate()
  }
}

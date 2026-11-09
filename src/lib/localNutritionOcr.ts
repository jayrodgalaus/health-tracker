/**
 * On-device OCR. All runtime assets are served from this PWA origin,
 * packaged during build; no photo or extracted text is uploaded or retained.
 */
import { parseNutritionLabelOcr } from '../domain/nutritionLabelOcr'

export interface NutritionCrop { x: number; y: number; width: number; height: number }
export interface OcrProgress { status: string; progress: number }
interface OcrWorker {
  recognize(image: File): Promise<{ data: { text: string } }>
  setParameters?(parameters: { tessedit_pageseg_mode: string }): Promise<unknown>
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

/** Crop and enlarge label text before OCR, fully in-memory on the device. */
async function preparePhoto(file: File, crop: NutritionCrop | undefined, enhanced: boolean): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    const x = Math.max(0, Math.min(0.98, crop?.x ?? 0))
    const y = Math.max(0, Math.min(0.98, crop?.y ?? 0))
    const width = Math.max(0.02, Math.min(1-x, crop?.width ?? 1))
    const height = Math.max(0.02, Math.min(1-y, crop?.height ?? 1))
    const sw = Math.max(1, Math.round(bitmap.width * width))
    const sh = Math.max(1, Math.round(bitmap.height * height))
    const ratio = Math.min(3, 2200/sw, 3200/sh, Math.max(1, 1450/sw))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1,Math.round(sw*ratio))
    canvas.height = Math.max(1,Math.round(sh*ratio))
    const context = canvas.getContext('2d', { willReadFrequently:enhanced })
    if (!context) throw new Error('Photo processing is not supported by this browser.')
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap,Math.round(bitmap.width*x),Math.round(bitmap.height*y),sw,sh,0,0,canvas.width,canvas.height)
    if (enhanced) {
      const image = context.getImageData(0,0,canvas.width,canvas.height)
      const pixels = image.data
      // Raise the contrast between printed dark ink and colored packaging.
      for (let i=0;i<pixels.length;i+=4) {
        const light = pixels[i]*0.299 + pixels[i+1]*0.587 + pixels[i+2]*0.114
        const value = Math.max(0,Math.min(255,Math.round((light-140)*1.75+176)))
        pixels[i]=pixels[i+1]=pixels[i+2]=value
      }
      context.putImageData(image,0,0)
    }
    const blob = await new Promise<Blob>((resolve,reject)=>{
      canvas.toBlob(b=>b ? resolve(b) : reject(new Error('Could not prepare the image.')),'image/png')
    })
    return new File([blob],file.name.replace(/\.[^.]+$/,'')+(enhanced?'-enhanced':'-crop')+'.png',{type:'image/png'})
  } finally {
    bitmap.close()
  }
}

export async function readNutritionLabelPhoto(
  file: File,
  onProgress?: (message: string, percent: number) => void,
  crop?: NutritionCrop
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
    // Dense nutrition tables often fail in a full-frame photo. Scan a
    // high-contrast enlargement first; retry the original/crop if it
    // contains too few recognizable nutrient lines.
    if (crop) await worker.setParameters?.({tessedit_pageseg_mode:'6'})
    onProgress?.('Enhancing nutrition label',0)
    let first: File
    try {
      first = await preparePhoto(file,crop,true)
    } catch {
      first = file
    }
    const firstText = (await worker.recognize(first)).data.text
    const firstCount = Object.keys(parseNutritionLabelOcr(firstText).nutrients).length
    if (firstCount >= 3) return firstText
    onProgress?.('Retrying text recognition',0)
    let second = file
    if (crop) {
      try { second = await preparePhoto(file,crop,false) } catch { /* use original */ }
    }
    const secondText = (await worker.recognize(second)).data.text
    const secondCount = Object.keys(parseNutritionLabelOcr(secondText).nutrients).length
    return secondCount > firstCount ? secondText : firstText
  } finally {
    if (worker) await worker.terminate()
  }
}

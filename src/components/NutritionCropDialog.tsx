import { useRef, useState, type PointerEvent } from 'react'
import type { NutritionCrop } from '../lib/localNutritionOcr'

const defaultCrop: NutritionCrop = {x:0.18,y:0.24,width:0.68,height:0.54}
const clamp = (value: number) => Math.max(0,Math.min(1,value))

/** A local, discardable crop region to recover from densely photographed labels. */
export function NutritionCropDialog({
  imageUrl, error, busy, onScan, onCancel, onRetake
}: {
  imageUrl: string
  error: string
  busy: boolean
  onScan: (crop?: NutritionCrop) => void
  onCancel: () => void
  onRetake: () => void
}) {
  const [crop,setCrop] = useState<NutritionCrop>(defaultCrop)
  const anchor = useRef<{x:number;y:number}|null>(null)

  function position(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x:clamp((event.clientX-rect.left)/rect.width),
      y:clamp((event.clientY-rect.top)/rect.height)
    }
  }
  function start(event: PointerEvent<HTMLDivElement>) {
    const p=position(event)
    anchor.current=p
    event.currentTarget.setPointerCapture(event.pointerId)
    setCrop({x:p.x,y:p.y,width:0.02,height:0.02})
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!anchor.current) return
    const p=position(event)
    const x=Math.min(p.x,anchor.current.x)
    const y=Math.min(p.y,anchor.current.y)
    setCrop({
      x,y,width:Math.max(0.02,Math.abs(p.x-anchor.current.x)),
      height:Math.max(0.02,Math.abs(p.y-anchor.current.y))
    })
  }
  function stop() {
    anchor.current=null
  }

  return <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-slate-950/95 px-3 py-5 text-white"
    role="dialog" aria-modal="true" aria-label="Crop nutrition label">
    <h2 className="text-lg font-bold">Crop nutrition label</h2>
    <div data-testid="nutrition-crop-preview"
      className="relative inline-block max-w-full cursor-crosshair touch-none overflow-hidden rounded-lg border border-white/40"
      onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <img src={imageUrl} alt="Nutrition label photo ready to crop"
        draggable={false} className="block max-h-[57dvh] max-w-full select-none" />
      <div aria-hidden="true" className="pointer-events-none absolute border-[3px] border-white bg-white/10 shadow-[0_0_0_1500px_rgba(0,0,0,0.45)]"
        style={{
          left:(crop.x*100)+'%',top:(crop.y*100)+'%',
          width:(crop.width*100)+'%',height:(crop.height*100)+'%'
        }} />
    </div>
    {error && <p role="alert" className="max-w-md rounded-xl bg-white/15 px-4 py-3 text-center text-sm text-white">{error}</p>}
    <div className="flex w-full max-w-md flex-wrap justify-center gap-2">
      <button type="button" disabled={busy} onClick={()=>onScan(crop)}
        className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {busy?'Scanning…':'Scan selected area'}
      </button>
      <button type="button" disabled={busy} onClick={()=>onScan()}
        className="min-h-11 rounded-xl border border-white/70 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        Scan full photo
      </button>
      <button type="button" disabled={busy} onClick={onRetake}
        className="min-h-11 rounded-xl border border-white/70 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        Retake
      </button>
      <button type="button" disabled={busy} onClick={onCancel}
        className="min-h-11 px-3 py-2 text-sm font-semibold text-white">
        Cancel
      </button>
    </div>
    <details className="w-full max-w-md text-sm">
      <summary className="cursor-pointer text-center font-semibold">Adjust crop</summary>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {([
          ['Left','x'],['Top','y'],['Width','width'],['Height','height']
        ] as const).map(([label,key])=><label key={key} className="flex flex-col gap-1">
          {label}
          <input type="range" aria-label={'Crop '+label.toLowerCase()}
            min={0} max={100} step={1}
            value={Math.round(crop[key]*100)}
            onChange={event=>setCrop(current=>{
              const requested=Number(event.target.value)/100
              if (key==='x') return {...current,x:Math.min(requested,1-current.width)}
              if (key==='y') return {...current,y:Math.min(requested,1-current.height)}
              if (key==='width') return {...current,width:Math.max(0.02,Math.min(requested,1-current.x))}
              return {...current,height:Math.max(0.02,Math.min(requested,1-current.y))}
            })} />
        </label>)}
      </div>
    </details>
  </div>
}

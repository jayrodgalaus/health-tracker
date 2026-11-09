import { useEffect, useRef, useState } from 'react'
import type { ParsedNutritionLabel } from '../domain/nutritionLabelOcr'
import { parseNutritionLabelOcr } from '../domain/nutritionLabelOcr'
import { readNutritionLabelPhoto } from '../lib/localNutritionOcr'

export function FloatingNutritionCamera({
  onRecognized
}: { onRecognized: (label: ParsedNutritionLabel) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const lastScroll = useRef(0)
  const mounted = useRef(true)
  const statusTimer = useRef<number | null>(null)
  const [compact, setCompact] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    mounted.current = true
    lastScroll.current = window.scrollY
    function observeScroll() {
      const scrollY = window.scrollY
      const delta = scrollY - lastScroll.current
      if (scrollY < 20) setCompact(false)
      else if (delta > 6) setCompact(true)
      else if (delta < -6) setCompact(false)
      lastScroll.current = scrollY
    }
    window.addEventListener('scroll', observeScroll, { passive:true })
    return () => {
      mounted.current = false
      if (statusTimer.current !== null) window.clearTimeout(statusTimer.current)
      window.removeEventListener('scroll',observeScroll)
    }
  },[])

  async function scan(file?: File) {
    if (!file || busy) return
    if (statusTimer.current !== null) window.clearTimeout(statusTimer.current)
    setBusy(true)
    setProgress('Preparing local scanner…')
    setError('')
    setMessage('')
    try {
      const recognized = await readNutritionLabelPhoto(file,(state,percent) => {
        if (mounted.current) setProgress(state + ' · ' + percent + '%')
      })
      if (!mounted.current) return
      const parsed = parseNutritionLabelOcr(recognized)
      const count = Object.keys(parsed.nutrients).length
      if (count === 0) throw new Error('No supported nutrition values were recognized. Try a clearer, well-lit photo.')
      onRecognized(parsed)
      setMessage('Filled ' + count + ' recognized nutrition values. Review them before saving.')
      statusTimer.current = window.setTimeout(() => {
        if (mounted.current) setMessage('')
      }, 6000)
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not read this label.')
    } finally {
      if (mounted.current) {
        setBusy(false)
        setProgress('')
        if (input.current) input.current.value = ''
      }
    }
  }

  return <>
    <input ref={input} type="file" accept="image/*" capture="environment"
      aria-label="Nutrition label photo" className="sr-only" tabIndex={-1}
      onChange={event => { void scan(event.target.files?.[0]) }} />
    <button type="button" disabled={busy}
      aria-label="Scan nutrition label" title="Scan nutrition label"
      data-camera-fab data-compact={compact ? 'true' : 'false'}
      onClick={() => input.current?.click()}
      style={{
        left: compact ? 'calc(100% - 68px)' : '50%',
        width: compact ? 48 : 72,
        height: compact ? 48 : 72,
        transform: compact ? 'none' : 'translateX(-50%)'
      }}
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-30 flex items-center justify-center rounded-full transition-[left,width,height,transform] duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evergreen-700 disabled:opacity-60 motion-reduce:transition-none">
      <span style={{ width:compact?36:72,height:compact?36:72 }}
        className="flex items-center justify-center rounded-full bg-evergreen-600 text-white shadow-lg ring-2 ring-white/80 transition-[width,height] duration-300 motion-reduce:transition-none">
        {busy ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" className={compact?'h-5 w-5 animate-spin':'h-8 w-8 animate-spin'}>
            <circle cx="12" cy="12" r="9" strokeOpacity=".35"/>
            <path d="M12 3a9 9 0 0 1 9 9"/>
          </svg> : <svg aria-hidden="true" viewBox="0 0 24 24"
            className={compact?'h-5 w-5':'h-9 w-9'} fill="none" stroke="white"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h3l1.4-2h7.2L17 7h3a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1Z"/>
            <circle cx="12" cy="13" r="4"/>
            <path d="M17.5 10h.01"/>
          </svg>}
      </span>
    </button>
    {(busy || message || error) && <div role={error?'alert':'status'}
      className="pointer-events-none fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-30 mx-auto max-w-sm rounded-xl border border-evergreen-100 bg-white px-4 py-3 text-center text-sm font-semibold text-evergreen-900 shadow-md"
    >{busy ? progress : error || message}</div>}
  </>
}

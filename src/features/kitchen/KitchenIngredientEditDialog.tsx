import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { KitchenIngredientSnapshot, ServingUnit } from '../../domain/models'
import { compatibleKitchenUnits, rescaleKitchenIngredient } from './kitchenIngredient'

const fieldClass = 'mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'

/** Edit only the amount/unit: the food identity and frozen label must not change. */
export function KitchenIngredientEditDialog({
  ingredient, onSave, onRemove, onClose
}: {
  ingredient: KitchenIngredientSnapshot
  onSave: (value: KitchenIngredientSnapshot) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [quantity, setQuantity] = useState(String(ingredient.quantity))
  const [unit, setUnit] = useState<ServingUnit>(ingredient.unit)
  const [error, setError] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const compatibleUnits = compatibleKitchenUnits(ingredient.labelBasis)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    amountRef.current?.focus()
    return () => {
      window.requestAnimationFrame(() => {
        if (previousFocus?.isConnected) previousFocus.focus()
        else document.querySelector<HTMLInputElement>('#main-content input[role="combobox"]')?.focus()
      })
    }
  }, [])

  function onKeys(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    if (event.key !== 'Tab' || !formRef.current) return
    const focusables = Array.from(formRef.current.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), button:not([disabled])'
    ))
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const next = rescaleKitchenIngredient(ingredient, Number(quantity), unit)
      setError('')
      onSave(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update ingredient.')
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/65 sm:items-center sm:p-5"
    role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <form ref={formRef} role="dialog" aria-modal="true" aria-label="Edit ingredient"
      onSubmit={submit} onKeyDown={onKeys}
      className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Edit ingredient</h2>
        <button type="button" onClick={onClose} aria-label="Close ingredient editor"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-slate-600 hover:bg-slate-100">×</button>
      </div>
      <p className="break-words font-semibold text-slate-900">{ingredient.name}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
        <label className="block text-sm font-semibold">Amount
          <input ref={amountRef} className={fieldClass} type="number" inputMode="decimal"
            min="0.000001" max="100000" step="any" required value={quantity}
            onChange={event => setQuantity(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold">Unit
          <select className={fieldClass} value={unit}
            onChange={event => setUnit(event.target.value as ServingUnit)}>
            {compatibleUnits.map(choice => <option key={choice} value={choice}>{choice}</option>)}
          </select>
        </label>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <button type="submit"
        className="min-h-12 w-full rounded-xl bg-evergreen-600 px-4 py-3 text-sm font-bold text-white">
        Save changes
      </button>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onRemove}
          className="min-h-11 rounded-xl border border-rose-300 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50">
          Remove ingredient
        </button>
        <button type="button" onClick={onClose}
          className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Cancel</button>
      </div>
    </form>
  </div>
}

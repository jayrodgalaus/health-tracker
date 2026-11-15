import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listSavedFoods } from '../../data/intakeRepository'
import { searchIngredientCatalog, type IngredientFood } from '../../data/ingredientCatalog'
import type { KitchenIngredientSnapshot, ServingUnit } from '../../domain/models'
import { compatibleKitchenUnits, prepareKitchenIngredient, kitchenChoiceBasis, kitchenChoiceLabel, type KitchenChoice } from './kitchenIngredient'

const input = 'block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base'

export function KitchenIngredientPicker({
  onAdd, disabled = false
}: { onAdd: (item: KitchenIngredientSnapshot) => void; disabled?: boolean }) {
  const id = useId()
  const saved = useLiveQuery(() => listSavedFoods(), [], undefined)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<KitchenChoice | null>(null)
  const [results, setResults] = useState<IngredientFood[]>([])
  const [searchError, setSearchError] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState<ServingUnit>('g')
  const [error, setError] = useState('')

  const search = query.trim().toLocaleLowerCase()
  useEffect(() => {
    if (selected || search.length < 2) return setResults([])
    let mounted = true
    void searchIngredientCatalog(search, 12).then(items => {
      if (mounted) { setResults(items); setSearchError('') }
    }, () => {
      if (mounted) { setResults([]); setSearchError('Ingredient catalog unavailable.') }
    })
    return () => { mounted = false }
  }, [search, selected])

  const choices = useMemo<KitchenChoice[]>(() => {
    if (selected || !search) return []
    const foods = (saved ?? []).filter(item => item.kind !== 'beverage' &&
      (item.name.toLocaleLowerCase().includes(search) || item.brand?.toLocaleLowerCase().includes(search)))
      .slice(0, 7).map(item => ({ type: 'saved' as const, item }))
    const drinks = (saved ?? []).filter(item => item.kind === 'beverage' &&
      (item.name.toLocaleLowerCase().includes(search) || item.brand?.toLocaleLowerCase().includes(search)))
      .slice(0, 7).map(item => ({ type: 'saved' as const, item }))
    const water: KitchenChoice[] = 'plain water'.includes(search) || 'water'.includes(search)
      ? [{ type: 'water' }] : []
    const usda = search.length >= 2
      ? results.map(item => ({ type: 'usda' as const, item })) : []
    return [...foods, ...drinks, ...water, ...usda]
  }, [saved, search, results, selected])

  const expanded = open && !selected && choices.length > 0
  const availableUnits = selected ? compatibleKitchenUnits(kitchenChoiceBasis(selected)) : ['g' as const]
  const group = (choice: KitchenChoice) => choice.type === 'water' ? 'Plain water'
    : choice.type === 'usda' ? 'USDA ingredients'
      : choice.item.kind === 'beverage' ? 'Saved drinks' : 'Saved foods'

  function choose(choice: KitchenChoice) {
    const basis = kitchenChoiceBasis(choice)
    setSelected(choice)
    setQuery(kitchenChoiceLabel(choice))
    setUnit(basis.unit)
    setQuantity(String(choice.type === 'water' ? 250 : basis.quantity))
    setActive(-1)
    setOpen(false)
    setError('')
  }

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { setOpen(false); setActive(-1) }
    if (event.key === 'ArrowDown' && choices.length) {
      event.preventDefault()
      setOpen(true)
      setActive(current => Math.min(current + 1, choices.length - 1))
    }
    if (event.key === 'ArrowUp' && choices.length) {
      event.preventDefault()
      setOpen(true)
      setActive(current => Math.max(0, current - 1))
    }
    if (event.key === 'Enter' && expanded && active >= 0 && choices[active]) {
      event.preventDefault()
      choose(choices[active])
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!selected) { setError('Select an ingredient from the suggestions.'); return }
    try {
      onAdd(prepareKitchenIngredient(selected, Number(quantity), unit))
      setQuery('')
      setSelected(null)
      setQuantity('100')
      setUnit('g')
      setResults([])
      setOpen(false)
      setActive(-1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add ingredient.')
    }
  }

  return <form onSubmit={submit} className="space-y-3" aria-label="Add a Kitchen ingredient">
    <div className="relative">
      <label className="mb-1 block text-sm font-semibold" htmlFor={id+'-ingredient'}>Ingredient</label>
      <input id={id+'-ingredient'} className={input} type="text" role="combobox" maxLength={150}
        disabled={disabled} value={query} autoComplete="off" aria-autocomplete="list"
        aria-expanded={expanded} aria-controls={id+'-matches'}
        aria-activedescendant={expanded && active >= 0 ? id+'-option-'+active : undefined}
        placeholder="Search saved foods, drinks, water or USDA"
        onChange={event => {
          setQuery(event.target.value); setSelected(null); setOpen(true); setActive(-1); setError('')
        }}
        onFocus={() => setOpen(true)} onKeyDown={keys}
        onBlur={() => setOpen(false)} />
      {expanded && <ul id={id+'-matches'} role="listbox" aria-label="Matching ingredients"
        className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-xl">
        {choices.map((choice, index) => <li key={choice.type === 'water' ? 'water' :
          choice.type === 'usda' ? 'usda-'+choice.item.id : 'saved-'+choice.item.id}
          id={id+'-option-'+index} role="option" aria-selected={index === active}
          onMouseDown={event => event.preventDefault()}
          onClick={() => choose(choice)}
          className={'cursor-pointer border-b border-slate-100 px-3 py-2.5 last:border-0 ' +
            (index === active ? 'bg-evergreen-100' : 'hover:bg-evergreen-50')}>
          <span className="block text-sm font-semibold">{kitchenChoiceLabel(choice)}</span>
          <span className="block text-xs text-slate-600">{group(choice)}</span>
        </li>)}
      </ul>}
      {searchError && <p role="alert" className="mt-1 text-sm text-rose-800">{searchError}</p>}
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
      <label className="block text-sm font-semibold">Amount
        <input className={input+' mt-1'} type="number" inputMode="decimal" min="0.000001"
          max="100000" step="any" disabled={disabled} required value={quantity}
          onChange={event => setQuantity(event.target.value)} />
      </label>
      <label className="block text-sm font-semibold">Unit
        <select aria-label="Ingredient unit" className={input+' mt-1'} disabled={disabled}
          value={unit} onChange={event => setUnit(event.target.value as ServingUnit)}>
          {availableUnits.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    </div>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
    <button type="submit" disabled={disabled}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-evergreen-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-evergreen-700 disabled:opacity-50">
      <span aria-hidden="true" className="text-xl">+</span> Add ingredient
    </button>
  </form>
}

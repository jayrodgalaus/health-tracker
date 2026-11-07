import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SavedFood } from '../../domain/models'
import { listSavedFoods } from '../../data/intakeRepository'
import { searchOpenFoodFacts, type ExternalFoodResult } from '../../data/openFoodFacts'
import { searchIngredientCatalog, type IngredientFood } from '../../data/ingredientCatalog'

export type FoodLookupChoice =
  | { type: 'saved'; product: SavedFood }
  | { type: 'remote'; product: ExternalFoodResult }
  | { type: 'ingredient'; product: IngredientFood }

interface Props {
  name: string
  kind: 'food' | 'beverage'
  inputClass: string
  onNameChange: (value: string) => void
  onChoose: (choice: FoodLookupChoice) => void
}

/**
 * The editable name is an accessible, keyboard-operable combobox.
 * Local saved foods are suggested as the user types; online lookup requires
 * an explicit button click so there are no keystroke network requests.
 */
export function FoodLookupCombobox({ name, kind, inputClass, onNameChange, onChoose }: Props) {
  const listId = useId()
  const saved = useLiveQuery(() => listSavedFoods(), [], undefined)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [online, setOnline] = useState<ExternalFoodResult[]>([])
  const [ingredients, setIngredients] = useState<IngredientFood[]>([])
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [ingredientLoadError, setIngredientLoadError] = useState('')
  const [pickedName, setPickedName] = useState('')
  const [searched, setSearched] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [searchError, setSearchError] = useState('')
  const request = useRef<AbortController | null>(null)
  const requestIndex = useRef(0)

  useEffect(() => () => request.current?.abort(), [])

  useEffect(() => {
    if (kind !== 'food' || name.trim().length < 2 || pickedName === name) {
      setIngredients([])
      return
    }
    let active = true
    setSelectedIngredientId('')
    setIngredientLoadError('')
    void searchIngredientCatalog(name).then(items => {
      if (active) setIngredients(items)
    }, () => {
      if (active) setIngredientLoadError('Offline ingredient catalog unavailable. Manual logging still works.')
    })
    return () => { active = false }
  }, [name, kind, pickedName])

  const term = name.trim().toLocaleLowerCase()
  const localChoices: FoodLookupChoice[] = useMemo(() =>
    !term ? [] : (saved ?? [])
      .filter(item => (item.kind ?? 'food') === kind &&
        (item.name.toLocaleLowerCase().includes(term) || item.brand?.toLocaleLowerCase().includes(term)))
      .slice(0, 6).map(product => ({ type: 'saved' as const, product })),
    [saved, term, kind])
  const remoteChoices: FoodLookupChoice[] = searched.toLocaleLowerCase() === term
    ? online.map(product => ({ type: 'remote' as const, product })) : []
  const choices = [...localChoices, ...remoteChoices]
  const expanded = open && choices.length > 0

  function typed(value: string) {
    request.current?.abort()
    requestIndex.current++
    setLoading(false)
    setPickedName('')
    onNameChange(value)
    setOpen(true)
    setActive(-1)
    setOnline([])
    setSearched('')
    setMessage('')
    setSearchError('')
  }

  function choose(choice: FoodLookupChoice) {
    request.current?.abort()
    requestIndex.current++
    setPickedName(choice.product.name)
    setIngredients([])
    setSelectedIngredientId('')
    onChoose(choice)
    setOpen(false)
    setActive(-1)
    setOnline([])
    setSearched('')
    setSearchError('')
    setMessage(choice.type === 'saved'
      ? 'Saved label loaded. Review the portion and nutrition fields.'
      : choice.type === 'ingredient'
        ? 'USDA ingredient loaded per 100 g. Confirm the preparation and enter the cooked or raw weight eaten.'
        : 'Product label loaded. Verify the package and adjust the amount before logging.')
  }

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    } else if (event.key === 'ArrowDown' && choices.length) {
      event.preventDefault()
      setOpen(true)
      setActive(current => Math.min(current + 1, choices.length - 1))
    } else if (event.key === 'ArrowUp' && choices.length) {
      event.preventDefault()
      setOpen(true)
      setActive(current => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && expanded && active >= 0 && choices[active]) {
      event.preventDefault()
      choose(choices[active])
    }
  }

  async function search() {
    if (name.trim().length < 3) {
      setSearchError('Enter at least 3 characters for online product lookup.')
      return
    }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const index = ++requestIndex.current
    const query = name.trim()
    setLoading(true)
    setSearchError('')
    setMessage('')
    setOnline([])
    setSearched('')
    try {
      const items = await searchOpenFoodFacts(query, controller.signal)
      if (requestIndex.current !== index || controller.signal.aborted) return
      setOnline(items)
      setSearched(query)
      setOpen(true)
      setActive(-1)
      if (items.length === 0) setMessage('No matching products with nutrition data. You can enter a label manually.')
    } catch (cause) {
      if (controller.signal.aborted || requestIndex.current !== index) return
      setSearchError(cause instanceof Error ? cause.message : 'Food lookup unavailable. Enter manually.')
    } finally {
      if (requestIndex.current === index) setLoading(false)
    }
  }

  return <div className="relative space-y-2 sm:col-span-2">
    <label htmlFor={listId+'-input'} className="block text-sm font-medium">Name</label>
    <div className="flex flex-wrap items-end gap-2">
      <input
        id={listId+'-input'}
        className={inputClass+' min-w-0 flex-1'}
        maxLength={150} value={name} onChange={event => typed(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={keys}
        placeholder={kind === 'food' ? 'Search saved foods or type a food name' : 'Search saved drinks or type a drink name'}
        role="combobox" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={listId+'-list'}
        aria-activedescendant={expanded && active >= 0 ? listId+'-choice-'+active : undefined}
        aria-describedby={listId+'-hint'} autoComplete="off" required />
      <button type="button" disabled={loading || name.trim().length < 3}
        onClick={() => { void search() }}
        className="min-h-11 rounded-xl border border-evergreen-600 bg-white px-3 py-2 text-sm font-semibold text-evergreen-700 disabled:opacity-50">
        {loading ? 'Searching…' : 'Search online'}
      </button>
    </div>
    <p id={listId+'-hint'} className="text-xs leading-5 text-slate-600">
      Saved foods and USDA ingredient varieties appear as you type, including offline.
      Branded products require clicking Search online; only that query is sent to Open Food Facts,
      never your profile or logs.
    </p>
    {kind === 'food' && ingredients.length > 0 && pickedName !== name && (
      <section aria-label="USDA ingredient varieties" className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <label htmlFor={listId+'-ingredient'} className="block text-sm font-semibold text-emerald-950">
          Ingredient variety / preparation
        </label>
        <select id={listId+'-ingredient'} aria-label="Ingredient variety / preparation"
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
          value={selectedIngredientId} onChange={event => setSelectedIngredientId(event.target.value)}>
          <option value="">Choose a preparation (raw, cooked, white, brown…)</option>
          {ingredients.map(item => <option key={item.id} value={String(item.id)}>
            {item.name} · {item.nutrients.energyKcal ?? '?'} kcal / 100 g
          </option>)}
        </select>
        <button type="button" disabled={!selectedIngredientId}
          className="min-h-11 rounded-xl bg-evergreen-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => {
            const item = ingredients.find(x => String(x.id) === selectedIngredientId)
            if (item) choose({type: 'ingredient', product: item})
          }}>
          Use ingredient nutrition
        </button>
        {name.toLowerCase().includes('blanch') && <p className="text-xs text-amber-900">
          USDA has cooked boiled/drained cabbage; that is a comparison, not an exact measurement of blanched cabbage.
        </p>}
        <p className="text-xs text-slate-700">
          USDA FoodData Central SR Legacy (2018). All amounts are per 100 g of the
          named raw or prepared food. Pick the actual variety and preparation, then enter
          the grams you ate. Reference values are estimates.
        </p>
      </section>
    )}
    {ingredientLoadError && <p role="alert" className="text-sm text-rose-800">{ingredientLoadError}</p>}
    {expanded && <ul id={listId+'-list'} role="listbox"
      aria-label="Matching food labels"
      className="relative z-10 max-h-60 overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-lg">
      {choices.map((choice, index) => {
        const item = choice.product
        const text = choice.type === 'saved'
          ? choice.product.name + (choice.product.brand ? ' · '+choice.product.brand : '') + ' — Saved on device'
          : choice.type === 'remote'
            ? choice.product.name + (choice.product.brand ? ' · '+choice.product.brand : '') +
              ' — Open Food Facts / 100 '+choice.product.basisUnit
            : choice.product.name + ' — USDA ingredient / 100 g'
        return <li key={choice.type+':'+item.id} id={listId+'-choice-'+index}
          role="option" aria-selected={active === index} tabIndex={-1}
          className={'cursor-pointer border-b border-slate-100 px-3 py-3 text-sm last:border-0 '+
            (active === index ? 'bg-emerald-100' : 'hover:bg-emerald-50')}
          onMouseDown={event => event.preventDefault()}
          onClick={() => choose(choice)}>
          {text}
        </li>
      })}
    </ul>}
    {loading && <p role="status" className="text-sm text-slate-600">Looking up products…</p>}
    {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
    {searchError && <p role="alert" className="text-sm text-rose-800">{searchError}</p>}
    <p className="text-xs text-slate-600">
      Product information from <a href="https://world.openfoodfacts.org/" target="_blank"
        rel="noopener noreferrer" className="font-semibold text-evergreen-700 underline">Open Food Facts</a>
      {' '}(<a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank"
        rel="noopener noreferrer" className="underline">ODbL</a>).
      Community data may be incomplete or inaccurate; check the actual package label.
      USDA ingredients use a separate, bundled offline reference catalog.
    </p>
  </div>
}

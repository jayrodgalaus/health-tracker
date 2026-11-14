export type KitchenPhase = 'preparing' | 'cooking' | 'ready'

/** Original SVG artwork is bundled locally, including the permanently open lid. */
export function KitchenCauldron({
  phase, onDone
}: { phase: KitchenPhase; onDone: () => void }) {
  return <div className="relative mx-auto flex h-[31dvh] min-h-[218px] max-h-[310px] w-full items-center justify-center"
    aria-label="Kitchen cauldron">
    <svg viewBox="0 0 320 260" className={'h-full max-h-[280px] w-full max-w-[355px] drop-shadow-lg ' +
      (phase === 'cooking' ? 'kitchen-cauldron-shake' : '')}
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Open green cauldron">
      <defs>
        <linearGradient id="kitchen-pot-color" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#319B7A"/><stop offset=".48" stopColor="#0D775D"/><stop offset="1" stopColor="#074F40"/>
        </linearGradient>
        <linearGradient id="kitchen-brew-color" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BDF5BA"/><stop offset="1" stopColor="#5ABB8E"/>
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="239" rx="106" ry="9" fill="#134E4A" opacity=".12"/>
      <path d="M86 72 42 30Q33 16 45 12l96 34" stroke="#115D4D" strokeWidth="10"
        fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <g transform="rotate(17 120 47)">
        <ellipse cx="120" cy="47" rx="64" ry="14" fill="#176F5D" stroke="#064D42" strokeWidth="5"/>
        <ellipse cx="120" cy="43" rx="51" ry="9" fill="#A6DEC6"/>
        <rect x="112" y="24" width="16" height="10" rx="5" fill="#176F5D"/>
        <ellipse cx="120" cy="23" rx="14" ry="5" fill="#0C6351"/>
      </g>
      <path d="M98 113Q89 95 101 82M166 100Q155 79 169 68M218 112Q228 94 218 77"
        fill="none" stroke="#8BC9AC" strokeWidth="5" strokeLinecap="round" opacity=".45"/>
      <path d="M64 146q-36-25-38 9 0 27 38 21M256 146q36-25 38 9 0 27-38 21"
        fill="none" stroke="#075344" strokeWidth="13" strokeLinecap="round"/>
      <path d="M61 129h198v43c0 50-34 72-99 72s-99-22-99-72z"
        fill="url(#kitchen-pot-color)" stroke="#064D40" strokeWidth="6"/>
      <ellipse cx="160" cy="129" rx="101" ry="28" fill="#074D42" stroke="#064D40" strokeWidth="5"/>
      <ellipse cx="160" cy="128" rx="88" ry="19" fill="url(#kitchen-brew-color)"/>
      <path d="M101 189q9 31 42 35" stroke="#B2F1C8" strokeWidth="9" strokeLinecap="round"
        opacity=".35" fill="none"/>
      <circle cx="116" cy="123" r="5" fill="#E9FFD1" opacity=".7"/>
      <circle cx="183" cy="117" r="8" fill="#E9FFD1" opacity=".6"/>
      <circle cx="228" cy="130" r="4" fill="#E9FFD1" opacity=".7"/>
      {phase === 'cooking' && <g fill="#F97316" stroke="#FACC15" strokeWidth="3">
        <path d="M105 247Q93 234 108 218q-2 12 8 14 13-20 15-27 13 22-1 42z"/>
        <path d="M175 251q-17-18 0-39 0 17 11 18 14-20 15-24 12 25-3 45z"/>
      </g>}
    </svg>
    {phase === 'ready' && <button type="button" onClick={onDone}
      aria-label="Done cooking — name and save dish"
      className="kitchen-done-cta absolute left-1/2 top-[57%] z-10 inline-flex min-h-14 min-w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-evergreen-50 px-6 py-3 text-lg font-extrabold text-evergreen-900 shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-evergreen-700">
      Done
      <span aria-hidden="true" className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-rose-600 shadow-sm"/>
    </button>}
  </div>
}

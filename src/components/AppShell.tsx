import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/log', label: 'Log', icon: 'plus' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/trends', label: 'Trends', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' }
] as const

type IconName = (typeof tabs)[number]['icon']

function TabIcon({ name }: { name: IconName }) {
  const common = { strokeWidth: 1.8, stroke: 'currentColor', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" {...common}>
      {name === 'home' && <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-8h6v8" /></>}
      {name === 'plus' && <><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 7v10M7 12h10" /></>}
      {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>}
      {name === 'chart' && <><path d="M4 20h16M7 17v-5M12 17V7M17 17v-9" /></>}
      {name === 'settings' && <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>}
    </svg>
  )
}

export function AppShell({ children, hideNavigation = false }: { children: ReactNode; hideNavigation?: boolean }) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <a href="#main-content" className="skip-link">Skip to content</a>

      <main id="main-content" className={`mx-auto w-full max-w-3xl px-5 pt-7 sm:pt-9 ${hideNavigation ? "pb-12" : "pb-32"}`} tabIndex={-1}>
        {children}
      </main>

      {!hideNavigation && <nav aria-label="Primary navigation" className="bottom-nav fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors sm:text-xs ${isActive ? 'text-evergreen-700' : 'text-slate-500 hover:text-slate-900'}`
              }
            >
              <TabIcon name={tab.icon} />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>}
    </div>
  )
}

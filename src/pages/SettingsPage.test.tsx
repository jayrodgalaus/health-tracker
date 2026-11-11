import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'
import { DocsPage } from './DocsPage'

function render(content: ReactNode, path = '/settings'): string {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{content}</MemoryRouter>)
}

describe('Settings section navigation', () => {
  it('renders all six destinations in a full-bleed, icon-led list', () => {
    const html = render(<SettingsPage />)
    const links = [...html.matchAll(/href="(\/settings\/(?:profile|goals|preferences|data|docs|about))"/g)]
    expect(links.map(link => link[1])).toEqual([
      '/settings/profile', '/settings/goals', '/settings/preferences',
      '/settings/data', '/settings/docs', '/settings/about'
    ])
    for (const icon of ['profile', 'goals', 'preferences', 'data', 'docs', 'about']) {
      expect(html).toContain('data-settings-icon="' + icon + '"')
    }
    expect(html).toContain('aria-label="Settings sections"')
    expect(html).toContain('-mx-5 border-y border-slate-200 bg-white')
    expect(html).not.toContain('rounded-2xl border border-slate-200 bg-white shadow-sm')
  })

  it('omits descriptions and the storage status footer', () => {
    const html = render(<SettingsPage />)
    expect(html).not.toContain('Local storage ready')
    expect(html).not.toContain('Local storage unavailable')
    expect(html).not.toContain('Age, height, preferred units')
    expect(html).not.toContain('Daily targets, calendar rules')
    expect(html).not.toContain('Definitions, calculations, food sources')
  })

  it('adds the matching Docs header without altering its topic list', () => {
    const html = render(<DocsPage />, '/settings/docs')
    expect(html).toContain('>Docs</h1>')
    expect(html).toContain('bg-gradient-to-br')
    expect(html).toContain('href="/settings"')
    expect(html).toContain('aria-label="Documentation contents"')
    expect(html).toContain('Today and daily totals')
    expect(html).toContain('Glossary')
    expect(html).not.toContain('Choose a topic for explanations')
    expect(html).not.toContain('Documentation for this page')
  })
})

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

function render(path: string, hideNavigation = false): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AppShell hideNavigation={hideNavigation}><h1>Test page</h1></AppShell>
    </MemoryRouter>
  )
}

describe('bottom navigation tab order', () => {
  it('shows Kitchen between Trends and Settings in six tabs', () => {
    const html = render('/today')
    const links = [...html.matchAll(/<a\b[^>]*href="(\/log|\/calendar|\/today|\/trends|\/kitchen|\/settings)"[^>]*>/g)]
    expect(links.map(match => match[1])).toEqual([
      '/log', '/calendar', '/today', '/trends', '/kitchen', '/settings'
    ])
    expect(html).toContain('aria-label="Primary navigation"')
    expect(html).toContain('grid-cols-6')
  })

  it('keeps the correct active destination after reordering', () => {
    for (const path of ['/log', '/calendar', '/today', '/trends', '/kitchen', '/settings']) {
      const html = render(path)
      const activeLink = [...html.matchAll(/<a\b[^>]*>/g)].find(
        match => match[0].includes('aria-current="page"')
      )
      expect(activeLink?.[0]).toContain('href="' + path + '"')
    }
  })

  it('continues to omit navigation when requested', () => {
    const html = render('/today', true)
    expect(html).not.toContain('aria-label="Primary navigation"')
    expect(html).toContain('Test page')
  })
})

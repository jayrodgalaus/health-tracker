import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { WeekDateNavigation } from './WeekDateNavigation'
import { PageInfoLink } from './PageInfoLink'

function render(jsx: ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{jsx}</MemoryRouter>)
}

describe('week selector contextual help', () => {
  it('keeps Today and its help link as separate adjacent links', () => {
    const html = render(<WeekDateNavigation
      selectedDay="2026-11-12" today="2026-11-12" helpTopic="day-detail" />)
    const today = html.indexOf('aria-label="Go to today"')
    const help = html.indexOf('aria-label="About this page: day detail"')
    const previous = html.indexOf('aria-label="Previous week"')
    expect(today).toBeGreaterThan(0)
    expect(help).toBeGreaterThan(today)
    expect(help).toBeLessThan(previous)
    expect(html).toContain('href="/settings/docs/day-detail"')
    expect(html).toContain('relative -top-1 inline-flex h-11 w-6')
    expect(html).toContain('h-[18px] w-[18px]')
    expect(html).not.toContain('relative -top-1 h-9 w-9')
    // No nested links: the Today anchor ends before the help anchor begins.
    expect(html.slice(today, help)).toContain('</a>')
    expect(html.slice(today, help)).not.toContain('<a href="/settings/docs/')
  })

  it('does not introduce day-detail help into the Log date navigator', () => {
    const html = render(<WeekDateNavigation
      selectedDay="2026-11-12" today="2026-11-12" destination="log" />)
    expect(html).toContain('href="/log?date=2026-11-12"')
    expect(html).not.toContain('About this page: day detail')
  })

  it('preserves floating info buttons for pages that do not use compact placement', () => {
    const html = render(<PageInfoLink topic="log" />)
    expect(html).toContain('float-right ml-3 h-11 w-11')
    expect(html).not.toContain('relative -top-1')
  })
})

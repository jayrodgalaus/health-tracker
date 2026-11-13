import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { PageTitle } from './PageTitle'
import { PageInfoLink } from './PageInfoLink'
import { KitchenPage } from '../pages/KitchenPage'

function render(content: ReactNode) {
  return renderToStaticMarkup(<MemoryRouter>{content}</MemoryRouter>)
}

describe('small page title info controls', () => {
  it('keeps heading accessible and places the tiny help link immediately after it', () => {
    const html = render(<PageTitle topic="trends">Recorded history</PageTitle>)
    expect(html).toContain('>Recorded history</h1><a')
    expect(html).toContain('aria-label="About this page: trends"')
    expect(html).toContain('href="/settings/docs/trends"')
    expect(html).toContain('h-[18px] w-[18px]')
    expect(html).not.toContain('float-right')
    expect(html).not.toContain('h-11 w-11')
  })
  it('uses a white tiny info icon inside dark settings title cards', () => {
    const html = render(<PageInfoLink topic="profile" onDark />)
    expect(html).toContain('text-white focus-visible:outline-white')
    expect(html).toContain('border-current text-[11px]')
    expect(html).toContain('href="/settings/docs/profile"')
  })
  it('Kitchen has only its heading and help icon', () => {
    const html = render(<KitchenPage />)
    expect(html).toContain('<h1 class="min-w-0 text-3xl font-bold tracking-tight">Kitchen</h1>')
    expect(html).toContain('href="/settings/docs/kitchen"')
    expect(html).not.toContain('<section')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('Coming soon')
  })
})

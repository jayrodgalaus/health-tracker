import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPageHeader } from './SettingsPageHeader'

function render(title: string, topic: 'profile' | 'goals' | 'preferences' | 'data' | 'about') {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SettingsPageHeader title={title} topic={topic} icon={topic} />
    </MemoryRouter>
  )
}

describe('Settings detail page header', () => {
  it.each([
    ['Profile', 'profile'],
    ['Goals and targets', 'goals'],
    ['Preferences', 'preferences'],
    ['Data and backups', 'data'],
    ['About and health notice', 'about']
  ] as const)('renders the shared visual header for %s', (title, topic) => {
    const html = render(title, topic)
    expect(html).toContain('rounded-3xl')
    expect(html).toContain('bg-gradient-to-br')
    expect(html).toContain('from-evergreen-900')
    expect(html).toContain('Back to Settings')
    expect(html).toContain('href="/settings"')
    expect(html).toContain('href="/settings/docs/' + topic + '"')
    expect(html).toContain('>' + title + '</h1>')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('text-2xl font-bold leading-tight')
    expect(html).toContain('sm:text-3xl')
    expect(html).not.toContain('sm:text-4xl')
  })
})

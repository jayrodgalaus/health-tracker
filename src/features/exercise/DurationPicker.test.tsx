import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DurationPicker } from './DurationPicker'

describe('exercise compact duration control', () => {
  it('shows two 00 slots even if no duration has been recorded', () => {
    const html=renderToStaticMarkup(<DurationPicker value="" onChange={()=>{}} />)
    expect(html).toContain('role="group"')
    expect(html).toContain('aria-label="Duration"')
    expect(html).toContain('aria-label="Duration minutes"')
    expect(html).toContain('aria-label="Duration seconds"')
    expect(html).toContain('>00</button>')
    expect(html).not.toContain('role="dialog"')
  })
  it('shows historical fractional minutes as mm:ss', () => {
    const html=renderToStaticMarkup(<DurationPicker value="12.75" onChange={()=>{}} />)
    expect(html).toContain('>12</button>')
    expect(html).toContain('>45</button>')
  })
})

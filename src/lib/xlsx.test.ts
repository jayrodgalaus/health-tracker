import { describe, expect, it } from 'vitest'
import type { ExcelSheet } from '../domain/trendExcelReport'
import { createXlsxWorkbook } from './xlsx'

/** Inspect uncompressed ZIP payloads without introducing a third-party library. */
function parts(buffer: Uint8Array): Map<string, string> {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const decoder = new TextDecoder()
  const found = new Map<string, string>()
  let position = 0
  while (view.getUint32(position, true) === 0x04034b50) {
    const filenameLength = view.getUint16(position + 26, true)
    const extraLength = view.getUint16(position + 28, true)
    const size = view.getUint32(position + 18, true)
    const filenameStart = position + 30
    const payloadStart = filenameStart + filenameLength + extraLength
    const name = decoder.decode(buffer.subarray(filenameStart, filenameStart + filenameLength))
    found.set(name, decoder.decode(buffer.subarray(payloadStart, payloadStart + size)))
    position = payloadStart + size
  }
  expect(view.getUint32(position, true)).toBe(0x02014b50)
  return found
}

describe('local XLSX file generation', () => {
  it('produces a valid structured ZIP workbook with formatted dates, numeric zeros and safe text', () => {
    const sheets: ExcelSheet[] = [
      {
        name: 'Energy', columns: [
          { header: 'Date', type: 'date', width: 15 },
          { header: 'Calories (kcal)', type: 'number' },
          { header: 'Name', type: 'text' }
        ],
        rows: [
          ['2026-11-08', 0, 'Meal & <drink>'],
          ['2026-11-09', null, '=2+3']
        ]
      },
      { name: 'Weight Records', columns: [{ header: 'Date', type: 'date' }], rows: [] }
    ]
    const result = createXlsxWorkbook(sheets)
    const files = parts(result)
    expect(files.size).toBe(7)
    expect(files.get('[Content_Types].xml')).toContain('spreadsheetml.worksheet+xml')
    expect(files.get('xl/workbook.xml')).toContain('name="Weight Records"')
    expect(files.get('xl/worksheets/sheet1.xml')).toContain('state="frozen"')
    expect(files.get('xl/worksheets/sheet1.xml')).toContain('<autoFilter ref="A1:C3"/>')
    const xml = files.get('xl/worksheets/sheet1.xml')!
    expect(xml).toContain('<c r="B2" s="2"><v>0</v></c>')
    expect(xml).not.toContain('r="B3"')
    expect(xml).toContain('Meal &amp; &lt;drink&gt;')
    expect(xml).toContain('=2+3')
    expect(xml).not.toContain('<f>')
    expect(xml).toMatch(/<c r="A2" s="1"><v>\d+<\/v><\/c>/)
    expect(files.get('xl/styles.xml')).toContain('formatCode="yyyy-mm-dd"')
  })

  it('rejects inconsistent rows and duplicate sheet names', () => {
    expect(() => createXlsxWorkbook([
      { name: 'Test', columns: [{ header: 'Date' }, { header: 'Value' }], rows: [['2026-11-08']] }
    ])).toThrow('invalid column count')
    expect(() => createXlsxWorkbook([
      { name: 'Dup', columns: [{ header: 'Value' }], rows: [] },
      { name: 'Dup', columns: [{ header: 'Value' }], rows: [] }
    ])).toThrow('Invalid or duplicate')
  })
})

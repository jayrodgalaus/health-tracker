import type { ExcelColumn, ExcelSheet, ExcelValue } from '../domain/trendExcelReport'

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const textEncoder = new TextEncoder()

function xml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function columnName(index: number): string {
  let n = index + 1
  let name = ''
  while (n > 0) {
    n--
    name = String.fromCharCode(65 + n % 26) + name
    n = Math.floor(n / 26)
  }
  return name
}

/** Excel uses a 1900-based serial date with a historical leap-year bug. */
function dateSerial(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const date = Date.UTC(year, month - 1, day)
  if (new Date(date).toISOString().slice(0, 10) !== value) return null
  return Math.round((date - Date.UTC(1899, 11, 30)) / 86400000)
}

function cell(value: ExcelValue, column: ExcelColumn, ref: string, heading = false): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    return '<c r="' + ref + '" s="2"><v>' + value + '</v></c>'
  }
  if (!heading && column.type === 'date') {
    const serial = dateSerial(value)
    if (serial !== null) return '<c r="' + ref + '" s="1"><v>' + serial + '</v></c>'
  }
  // Inline strings are never formulas, even for names beginning with "=" or "+".
  return '<c r="' + ref + '" s="' + (heading ? 3 : 0) + '" t="inlineStr"><is><t xml:space="preserve">' +
    xml(value) + '</t></is></c>'
}

function sheetXml(sheet: ExcelSheet): string {
  if (!sheet.columns.length) throw new Error('An Excel worksheet needs at least one column.')
  if (sheet.columns.length > 16384) throw new Error('Too many Excel columns.')
  if (sheet.rows.length > 1048575) throw new Error('Too many Excel rows.')
  const lastColumn = columnName(sheet.columns.length - 1)
  const widths = sheet.columns.map((column, index) =>
    '<col min="' + (index + 1) + '" max="' + (index + 1) +
    '" width="' + Math.min(104, Math.max(10, column.width ?? 20)) + '" customWidth="1"/>').join('')
  const makeRow = (values: ExcelValue[], rowNumber: number, heading = false): string => {
    if (values.length !== sheet.columns.length) {
      throw new Error('Row ' + rowNumber + ' in ' + sheet.name + ' has an invalid column count.')
    }
    const cells = values.map((value, index) =>
      cell(value, sheet.columns[index]!, columnName(index) + rowNumber, heading)).join('')
    return '<row r="' + rowNumber + '"' + (heading ? ' ht="28" customHeight="1"' : '') + '>' + cells + '</row>'
  }
  const rows = [makeRow(sheet.columns.map(column => column.header), 1, true)]
  sheet.rows.forEach((values, index) => rows.push(makeRow(values, index + 2)))
  const lastRow = sheet.rows.length + 1
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<dimension ref="A1:' + lastColumn + lastRow + '"/>' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="18"/><cols>' + widths + '</cols>' +
    '<sheetData>' + rows.join('') + '</sheetData>' +
    '<autoFilter ref="A1:' + lastColumn + lastRow + '"/>' +
    '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>' +
    '</worksheet>'
}

const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF166534"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="4">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>' +
  '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

interface ZipFile { name: string; bytes: Uint8Array }
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function u16(buffer: DataView, offset: number, number: number): void {
  buffer.setUint16(offset, number, true)
}
function u32(buffer: DataView, offset: number, number: number): void {
  buffer.setUint32(offset, number, true)
}
/**
 * Standards-compliant ZIP with stored entries (no compression dependency).
 * Files stay on the device; the output is an ordinary offline .xlsx file.
 */
function zip(files: ZipFile[]): Uint8Array {
  if (files.length > 65535) throw new Error('Too many Excel archive parts.')
  const prepared = files.map(file => ({
    ...file, filename: textEncoder.encode(file.name), crc: crc32(file.bytes)
  }))
  const localBytes = prepared.reduce((sum, file) => sum + 30 + file.filename.length + file.bytes.length, 0)
  const centralBytes = prepared.reduce((sum, file) => sum + 46 + file.filename.length, 0)
  const output = new Uint8Array(localBytes + centralBytes + 22)
  const view = new DataView(output.buffer)
  let offset = 0
  const positions: number[] = []
  for (const file of prepared) {
    positions.push(offset)
    u32(view, offset, 0x04034b50)
    u16(view, offset + 4, 20)
    u16(view, offset + 6, 0x0800) // UTF-8 names
    u16(view, offset + 8, 0) // stored, not compressed
    u32(view, offset + 14, file.crc)
    u32(view, offset + 18, file.bytes.length)
    u32(view, offset + 22, file.bytes.length)
    u16(view, offset + 26, file.filename.length)
    output.set(file.filename, offset + 30)
    output.set(file.bytes, offset + 30 + file.filename.length)
    offset += 30 + file.filename.length + file.bytes.length
  }
  const centralStart = offset
  for (let i = 0; i < prepared.length; i++) {
    const file = prepared[i]!
    u32(view, offset, 0x02014b50)
    u16(view, offset + 4, 20)
    u16(view, offset + 6, 20)
    u16(view, offset + 8, 0x0800)
    u16(view, offset + 10, 0)
    u32(view, offset + 16, file.crc)
    u32(view, offset + 20, file.bytes.length)
    u32(view, offset + 24, file.bytes.length)
    u16(view, offset + 28, file.filename.length)
    u32(view, offset + 42, positions[i]!)
    output.set(file.filename, offset + 46)
    offset += 46 + file.filename.length
  }
  u32(view, offset, 0x06054b50)
  u16(view, offset + 8, prepared.length)
  u16(view, offset + 10, prepared.length)
  u32(view, offset + 12, offset - centralStart)
  u32(view, offset + 16, centralStart)
  return output
}

/** Produces a self-contained Excel file, without network calls or external packages. */
export function createXlsxWorkbook(sheets: readonly ExcelSheet[]): Uint8Array {
  if (!sheets.length) throw new Error('No report sheets to export.')
  const names = sheets.map(sheet => sheet.name)
  if (new Set(names).size !== names.length || names.some(name =>
    !name || name.length > 31 || /[\[\]:*?\/\\]/.test(name)
  )) throw new Error('Invalid or duplicate Excel worksheet names.')
  const sheetTags = sheets.map((sheet, index) =>
    '<sheet name="' + xml(sheet.name) + '" sheetId="' + (index + 1) +
    '" r:id="rId' + (index + 1) + '"/>').join('')
  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' + sheetTags + '</sheets></workbook>'
  const sheetRels = sheets.map((_, index) =>
    '<Relationship Id="rId' + (index + 1) +
    '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"' +
    ' Target="worksheets/sheet' + (index + 1) + '.xml"/>').join('')
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheetRels + '<Relationship Id="rId' + (sheets.length + 1) +
    '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>'
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets.map((_, index) => '<Override PartName="/xl/worksheets/sheet' + (index + 1) +
      '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
    '</Types>'
  const parts: ZipFile[] = [
    { name: '[Content_Types].xml', bytes: textEncoder.encode(contentTypes) },
    { name: '_rels/.rels', bytes: textEncoder.encode(rootRels) },
    { name: 'xl/workbook.xml', bytes: textEncoder.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', bytes: textEncoder.encode(rels) },
    { name: 'xl/styles.xml', bytes: textEncoder.encode(styles) }
  ]
  sheets.forEach((sheet, index) => parts.push({
    name: 'xl/worksheets/sheet' + (index + 1) + '.xml',
    bytes: textEncoder.encode(sheetXml(sheet))
  }))
  return zip(parts)
}

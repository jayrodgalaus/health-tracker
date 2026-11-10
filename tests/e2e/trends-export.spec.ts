import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('Trends exports an Excel workbook for its selected inclusive date range', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Date of birth' }).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('70')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button', { name: 'Create local profile' }).click()

  await page.goto('/trends')
  const filter = page.getByRole('region', { name: 'Trend date filters' })
  await filter.getByRole('button', { name: 'Custom' }).click()
  await filter.getByLabel('From').fill('2026-01-01')
  await filter.getByLabel('Through').fill('2026-01-02')
  const button = filter.getByRole('button', { name: 'Export trends to Excel' })
  await expect(button).toBeEnabled()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    button.click()
  ])
  expect(download.suggestedFilename()).toBe('health-tracker-trends-2026-01-01-to-2026-01-02.xlsx')
  const path = await download.path()
  expect(path).toBeTruthy()
  const archive = await readFile(path!)
  expect(archive.subarray(0, 4).toString('hex')).toBe('504b0304')
  const text = archive.toString('utf8')
  expect(text).toContain('name="Energy"')
  expect(text).toContain('name="Nutrition"')
  expect(text).toContain('name="Logged Fluids"')
  expect(text).toContain('name="Weight Records"')
  expect(text).toContain('<dimension ref="A1:N3"/>') // Header plus two daily Energy rows.
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('invalid custom dates disable Excel export', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Date of birth' }).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('70')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button', { name: 'Create local profile' }).click()

  await page.goto('/trends')
  const filter = page.getByRole('region', { name: 'Trend date filters' })
  await filter.getByRole('button', { name: 'Custom' }).click()
  await filter.getByLabel('From').fill('2026-01-02')
  await filter.getByLabel('Through').fill('2026-01-01')
  await expect(filter.getByRole('button', { name: 'Export trends to Excel' })).toBeDisabled()
})

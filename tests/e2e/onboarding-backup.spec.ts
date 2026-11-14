import { expect, test, type Page } from '@playwright/test'

async function createProfile(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Date of birth' }).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('70')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button', { name: 'Create local profile' }).click()
  await expect(page.getByRole('heading', { name: 'Daily goal alignment' })).toBeVisible()
}

test('onboarding can restore a validated JSON backup without a temporary profile', async ({ page }) => {
  await createProfile(page)
  await page.goto('/log/drink?water=1')
  await page.getByRole('button', { name: '+ 350 ml' }).click()
  await page.goto('/settings/data')
  await page.getByRole('button', { name: 'Prepare export preview' }).click()
  const ready = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download this validated JSON backup' }).click()
  const downloaded = await ready
  const path = await downloaded.path()
  expect(path).not.toBeNull()

  await page.getByRole('button', { name: 'Show deletion confirmation' }).click()
  await page.getByLabel('Type DELETE to confirm').fill('DELETE')
  await page.getByRole('button', { name: 'Permanently delete all local data' }).click()
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.getByText('Import existing JSON backup').click()
  await page.getByLabel('Choose JSON backup').setInputFiles(path!)
  await expect(page.getByText(/Verified backup:/)).toBeVisible()
  const restore = page.getByRole('button', { name: 'Restore existing backup' })
  await expect(restore).toBeDisabled()
  await page.getByLabel('Type REPLACE to confirm').fill('REPLACE')
  await restore.click()
  await expect(page.getByRole('heading', { name: 'Daily goal alignment' })).toBeVisible()
  await page.goto('/today')
  await expect(page.getByRole('link', { name: /^Fluids — 350 mL/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: /^Fluids — 350 mL/ })).toBeVisible()
})

test('onboarding refuses an invalid JSON file without creating a profile', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.getByText('Import existing JSON backup').click()
  await page.getByLabel('Choose JSON backup').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"formatVersion":99}')
  })
  await expect(page.getByRole('alert')).toContainText('Backup:')
  await expect(page.getByRole('button', { name: 'Restore existing backup' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
})

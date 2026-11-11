import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Date of birth' }).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('70')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button', { name: 'Create local profile' }).click()
  await expect(page.getByRole('heading', { name: 'Daily goal alignment' })).toBeVisible()
}

test('Goals page uses Profile design while retaining editable targets and history', async ({ page }) => {
  await onboard(page)
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/settings/goals')

  await expect(page.getByRole('heading', { name: 'Goals and targets' })).toBeVisible()
  await expect(page.getByRole('group', { name: /Goal direction/ })).toBeVisible()
  await expect(page.getByRole('group', { name: /Daily targets/ })).toBeVisible()
  await expect(page.getByRole('group', { name: /Calendar alignment rules/ })).toBeVisible()
  await expect(page.locator('form fieldset')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: /Goal history/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Settings' })).toHaveAttribute('href', '/settings')

  await page.getByLabel('Primary goal').selectOption('gain')
  await page.getByLabel('Optional calorie target (kcal/day)').fill('2250')
  await page.getByLabel('Optional protein target (g/day)').fill('110')
  await page.getByLabel('Calories aligned within ±%').fill('12')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(2)

  await page.getByRole('button', { name: 'Save goals' }).click()
  await expect(page.getByTestId('app-toast')).toContainText('Goals saved.')
  await page.reload()
  await expect(page.getByLabel('Primary goal')).toHaveValue('gain')
  await expect(page.getByLabel('Optional calorie target (kcal/day)')).toHaveValue('2250')
  await expect(page.getByLabel('Optional protein target (g/day)')).toHaveValue('110')
  await expect(page.getByLabel('Calories aligned within ±%')).toHaveValue('12')
})

test('Preferences uses matching cards and keeps independent save flows', async ({ page }) => {
  await onboard(page)
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/settings/preferences')

  await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Water quick-add amounts/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Calendar nutrient comparison limits/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Settings' })).toHaveAttribute('href', '/settings')

  await page.getByLabel('Preset 1 (ml)').fill('180')
  await page.getByRole('button', { name: 'Save water presets' }).click()
  await expect(page.getByTestId('app-toast')).toContainText('Water presets saved.')

  await page.getByLabel('Carbs upper limit (g/day)').fill('260')
  await page.getByLabel('Sodium upper limit (mg/day)').fill('2000')
  await page.getByRole('button', { name: 'Save nutrient limits' }).click()
  await expect(page.getByTestId('app-toast')).toContainText('Nutrient comparison limits saved.')

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(2)
  await page.reload()
  await expect(page.getByLabel('Preset 1 (ml)')).toHaveValue('180')
  await expect(page.getByLabel('Carbs upper limit (g/day)')).toHaveValue('260')
  await expect(page.getByLabel('Sodium upper limit (mg/day)')).toHaveValue('2000')
})

test('Data and About use the matching compact design without changing safety controls', async ({ page }) => {
  await onboard(page)
  await page.setViewportSize({ width: 320, height: 740 })

  await page.goto('/settings/data')
  const dataHeading = page.getByRole('heading', { name: 'Data and backups', exact: true })
  await expect(dataHeading).toBeVisible()
  await expect(dataHeading).toHaveCSS('font-size', '24px')
  await expect(page.getByRole('heading', { name: 'Your local records' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Export backup' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Import backup — replace all records' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Danger zone · Delete all local data' })).toBeVisible()
  await expect(page.locator('section.rounded-3xl')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Prepare export preview' })).toBeEnabled()
  await page.getByRole('button', { name: 'Show deletion confirmation' }).click()
  await expect(page.getByLabel('Type DELETE to confirm')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Permanently delete all local data' })).toBeDisabled()
  await page.getByRole('button', { name: 'Cancel deletion' }).click()
  await expect(page.getByLabel('Type DELETE to confirm')).toHaveCount(0)

  await page.goto('/settings/about')
  const aboutHeading = page.getByRole('heading', { name: 'About and health notice', exact: true })
  await expect(aboutHeading).toBeVisible()
  await expect(aboutHeading).toHaveCSS('font-size', '24px')
  await expect(page.locator('section.rounded-3xl')).toHaveCount(3)
  for (const title of ['Health information notice', 'Adult-only evaluations', 'Privacy and local storage']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  }
  await expect(page.getByText(/pre-existing medical conditions/)).toBeVisible()
  await expect(page.getByText(/No personal health history is uploaded or synced/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to Settings' })).toHaveAttribute('href', '/settings')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(2)
})

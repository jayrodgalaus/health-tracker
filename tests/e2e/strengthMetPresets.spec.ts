import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Date of birth' }).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('70')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button', { name: 'Create local profile' }).click()
}

test('strength workout presets provide MET previews and survive editing', async ({ page }) => {
  await onboard(page)
  await page.goto('/log/exercise')
  await page.getByLabel('Activity', { exact: true }).selectOption('Strength training')
  await page.getByLabel('Duration (minutes)').fill('30')
  const selector = page.getByLabel('Strength-training MET preset')
  await expect(selector).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Calculate net incremental kcal from a MET' })).toBeChecked()
  await expect(selector).toHaveValue('')
  await expect(page.getByText('Unavailable', { exact: true })).toBeVisible()
  await selector.selectOption('02054')
  await expect(page.getByText('≈ 91.9 kcal')).toBeVisible()
  await expect(page.getByLabel('Chosen activity MET (1–25)')).toHaveCount(0)
  await page.getByRole('button', { name: 'Save exercise' }).click()
  await expect(page.getByTestId('app-toast')).toContainText('Exercise saved.')

  const day = await page.evaluate(() => {
    const date = new Date()
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') +
      '-' + String(date.getDate()).padStart(2, '0')
  })
  await page.goto('/calendar/' + day + '/activity')
  await page.getByRole('link', { name: 'Edit / delete' }).last().click()
  await expect(page.getByLabel('Strength-training MET preset')).toHaveValue('02054')
  await expect(page.getByText('≈ 91.9 kcal')).toBeVisible()

  await page.getByLabel('Strength-training MET preset').selectOption('custom')
  const metInput = page.getByLabel('Chosen activity MET (1–25)')
  await metInput.fill('4.25')
  await expect(page.getByText('≈ 119.4 kcal')).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.goto('/calendar/' + day + '/activity')
  await page.getByRole('link', { name: 'Edit / delete' }).last().click()
  await expect(page.getByLabel('Strength-training MET preset')).toHaveValue('custom')
  await expect(page.getByLabel('Chosen activity MET (1–25)')).toHaveValue('4.25')
})

test('other activities retain manual MET and strength presets do not leak into another activity', async ({ page }) => {
  await onboard(page)
  await page.goto('/log/exercise')
  await page.getByLabel('Activity', { exact: true }).selectOption('Strength training')
  await page.getByLabel('Strength-training MET preset').selectOption('02058')
  await page.getByLabel('Activity', { exact: true }).selectOption('Table tennis')
  await expect(page.getByLabel('Strength-training MET preset')).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'No energy estimate' })).toBeChecked()
  await page.getByRole('radio', { name: 'Calculate net incremental kcal from a MET' }).check()
  await expect(page.getByLabel('Chosen activity MET (1–25)')).toBeVisible()

  await page.getByLabel('Activity', { exact: true }).selectOption('Other')
  await page.getByLabel('Custom activity').fill('Synthetic resistance session')
  await page.getByLabel('Include this as a logged strength-training day').check()
  await expect(page.getByLabel('Strength-training MET preset')).toBeVisible()
})

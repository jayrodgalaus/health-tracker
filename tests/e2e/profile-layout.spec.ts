import { expect, test } from '@playwright/test'

test('Profile uses three mobile-friendly cards and preserves editable settings', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Date of birth' }).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('70')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button', { name: 'Create local profile' }).click()
  await expect(page.getByRole('heading', { name: 'Daily goal alignment' })).toBeVisible()

  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/settings/profile')
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: /Units & display/ })).toBeVisible()
  await expect(page.getByRole('group', { name: /Personal details/ })).toBeVisible()
  await expect(page.getByRole('group', { name: /Activity & energy/ })).toBeVisible()
  await expect(page.locator('form fieldset')).toHaveCount(3)

  await page.getByRole('radio', { name: 'Age as of a date' }).check()
  await expect(page.getByLabel('Age (years)')).toBeVisible()
  await page.getByRole('radio', { name: 'Date of birth' }).check()
  await expect(page.getByRole('textbox', { name: 'Date of birth' })).toHaveValue('1990-03-12')

  await page.getByLabel('Height units').selectOption('ft-in')
  await expect(page.getByLabel('Height (feet)')).toBeVisible()
  await page.getByLabel('Height units').selectOption('cm')
  await expect(page.getByLabel('Height (cm)')).toHaveValue('170')

  await page.getByLabel('Fluid display units').selectOption('fl-oz')
  await page.getByLabel('General activity note (optional; not used in calculations)').selectOption('light')
  await page.getByLabel('Usual everyday movement (optional, excluding workouts)').selectOption('1.2')
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(horizontalOverflow).toBeLessThanOrEqual(2)

  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByTestId('app-toast')).toContainText('Profile saved.')
  await page.reload()
  await expect(page.getByLabel('Fluid display units')).toHaveValue('fl-oz')
  await expect(page.getByLabel('General activity note (optional; not used in calculations)')).toHaveValue('light')
  await expect(page.getByLabel('Usual everyday movement (optional, excluding workouts)')).toHaveValue('1.2')
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
})

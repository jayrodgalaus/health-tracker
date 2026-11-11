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

test('Today route hides calendar back-link; calendar days retain it, including direct links', async ({ page }) => {
  await onboard(page)
  await page.setViewportSize({ width: 320, height: 740 })
  const today = await page.evaluate(() => {
    const date = new Date()
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') +
      '-' + String(date.getDate()).padStart(2, '0')
  })
  const back = page.getByRole('link', { name: /Back to \d{4}-\d{2} calendar/ })

  await page.goto('/today')
  await expect(back).toHaveCount(0)
  const week = page.getByRole('navigation', { name: 'Week navigation' })
  const todayLink = week.getByRole('link', { name: 'Go to today' })
  const help = week.getByRole('link', { name: 'About this page: day detail' })
  await expect(todayLink).toBeVisible()
  await expect(help).toBeVisible()
  await expect(help).toHaveAttribute('href', '/settings/docs/day-detail')
  await expect(page.locator('#main-content > div > header > a[title="Documentation for this page"]')).toHaveCount(0)
  const todayBounds = await todayLink.boundingBox()
  const helpBounds = await help.boundingBox()
  expect(todayBounds).not.toBeNull()
  expect(helpBounds).not.toBeNull()
  expect(helpBounds!.x).toBeGreaterThanOrEqual(todayBounds!.x + todayBounds!.width)
  expect(helpBounds!.x - (todayBounds!.x + todayBounds!.width)).toBeLessThanOrEqual(12)
  expect(helpBounds!.y).toBeLessThan(todayBounds!.y + 12)
  expect(helpBounds!.width).toBeLessThan(todayBounds!.height)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(2)

  // The calendar's day selector navigates via /calendar/:dayKey, even for today.
  await page.goto('/calendar')
  await page.getByRole('link', { name: new RegExp('^' + today + ':') }).click()
  await expect(page).toHaveURL('/calendar/' + today)
  await expect(back).toHaveAttribute('href', '/calendar?month=' + today.slice(0, 7))
  await expect(page.getByRole('navigation', { name: 'Week navigation' })
    .getByRole('link', { name: 'About this page: day detail' })).toBeVisible()
  await back.click()
  await expect(page).toHaveURL('/calendar?month=' + today.slice(0, 7))

  // A directly loaded historical calendar day has the same back link.
  await page.goto('/calendar/2026-01-15')
  await expect(back).toHaveAttribute('href', '/calendar?month=2026-01')

  // Tab and direct Today routes never inherit a calendar link from history.
  await page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Today' }).click()
  await expect(page).toHaveURL('/today')
  await expect(back).toHaveCount(0)
  await page.goto('/today?date=2026-01-15')
  await expect(back).toHaveCount(0)

  // The week selector's Today link intentionally opens a calendar-date detail.
  await page.getByRole('navigation', { name: 'Week navigation' })
    .getByRole('link', { name: 'Go to today' }).click()
  await expect(page).toHaveURL('/calendar/' + today)
  await expect(back).toBeVisible()
})

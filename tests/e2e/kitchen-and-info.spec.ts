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

test('Kitchen is the new sixth-navigation layout destination, and its page is empty', async ({ page }) => {
  await onboard(page)
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 740 })
    await page.goto('/today')
    const nav = page.getByRole('navigation', { name: 'Primary navigation' })
    await expect(nav.getByRole('link')).toHaveCount(6)
    const labels = await nav.getByRole('link').allTextContents()
    expect(labels.map(text => text.trim())).toEqual(['Log', 'Calendar', 'Today', 'Trends', 'Kitchen', 'Settings'])
    await nav.getByRole('link', { name: 'Kitchen' }).click()
    await expect(page).toHaveURL('/kitchen')
    await expect(nav.getByRole('link', { name: 'Kitchen' })).toHaveAttribute('aria-current', 'page')
    const main = page.locator('#main-content')
    await expect(main.getByRole('heading', { name: 'Kitchen', exact: true })).toBeVisible()
    await expect(main.getByRole('link', { name: 'About this page: kitchen' }))
      .toHaveAttribute('href', '/settings/docs/kitchen')
    await expect(main.locator('section, article, form')).toHaveCount(0)
    await expect(main.getByText('Coming soon')).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)
  }
  await page.goto('/kitchen')
  await expect(page.getByRole('heading', { name: 'Kitchen', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'About this page: kitchen' }).click()
  await expect(page).toHaveURL('/settings/docs/kitchen')
  await expect(page.getByRole('heading', { name: 'Kitchen', exact: true })).toBeVisible()
})

test('small circled info icon sits next to titles on ordinary and Settings pages', async ({ page }) => {
  await onboard(page)
  await page.setViewportSize({ width: 320, height: 740 })
  for (const [url, title, topic] of [
    ['/log', 'Log', 'log'],
    ['/calendar', 'Your recorded days', 'calendar'],
    ['/trends', 'Recorded history', 'trends'],
    ['/log/saved-foods', 'Saved foods and drinks', 'food'],
    ['/settings/profile', 'Profile', 'profile'],
    ['/settings/about', 'About and health notice', 'about']
  ]) {
    await page.goto(url)
    const heading = page.getByRole('heading', { name: title, exact: true })
    await expect(heading).toBeVisible()
    const help = page.getByRole('link', { name: 'About this page: ' + topic })
    await expect(help).toBeVisible()
    await expect(help).toHaveAttribute('href', '/settings/docs/' + topic)
    const h = await heading.boundingBox()
    const a = await help.boundingBox()
    const icon = await help.locator('span[aria-hidden="true"]').boundingBox()
    expect(h).not.toBeNull()
    expect(a).not.toBeNull()
    expect(a!.x).toBeGreaterThanOrEqual(h!.x + h!.width - 1)
    expect(a!.x - (h!.x + h!.width)).toBeLessThanOrEqual(12)
    expect(a!.y).toBeLessThan(h!.y + 12)
    expect(icon?.width).toBe(18)
    expect(icon?.height).toBe(18)
    expect(a?.width).toBe(24)
    expect(a?.height).toBe(44)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)
  }
})

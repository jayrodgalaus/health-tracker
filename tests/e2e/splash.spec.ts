import { expect, test } from '@playwright/test'

test('initial startup animates the apple with falling trails and two bounces', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')

  const splash = page.getByRole('status', { name: 'Opening Health Tracker' })
  await expect(splash).toBeVisible()
  const apple = splash.locator('.loading-splash__apple')
  await expect(apple.locator('img')).toHaveAttribute('src', '/apple-splash.webp')
  await expect(apple).toHaveCSS('animation-name', 'apple-fall-bounce')
  await expect(apple).toHaveCSS('animation-duration', '3.1s')
  await expect(apple).toHaveCSS('animation-play-state', 'running')
  // The apple has landed after 2.1 seconds, but the last frame holds for 1 second.
  await expect.poll(() => apple.evaluate((element) => {
    const animation = element.getAnimations().find((item) => (item as CSSAnimation).animationName === 'apple-fall-bounce')
    return Number(animation?.currentTime ?? 0)
  }), { timeout: 6000 }).toBeGreaterThanOrEqual(2300)
  await expect(splash).toBeVisible()

  await expect(splash).toHaveCount(0, { timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
})

test('reduced motion skips the splash animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Opening Health Tracker' })).toHaveCount(0)
})

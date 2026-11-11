import { expect, test } from '@playwright/test'

test('Inter is loaded locally as the default app font, including form controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Track what matters to you.' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  const styles = await page.evaluate(() => {
    const heading = document.querySelector('h1')
    const input = document.querySelector('input')
    const button = document.querySelector('button')
    return {
      root: getComputedStyle(document.documentElement).fontFamily,
      heading: heading ? getComputedStyle(heading).fontFamily : '',
      input: input ? getComputedStyle(input).fontFamily : '',
      button: button ? getComputedStyle(button).fontFamily : '',
      loaded: document.fonts.check('400 16px "Inter Variable"')
    }
  })
  expect(styles.root).toContain('Inter Variable')
  expect(styles.heading).toContain('Inter Variable')
  expect(styles.input).toContain('Inter Variable')
  expect(styles.button).toContain('Inter Variable')
  expect(styles.loaded).toBe(true)
})

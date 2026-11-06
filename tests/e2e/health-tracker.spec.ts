import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Track what matters to you.'})).toBeVisible()
  await page.getByRole('textbox',{name:'Date of birth'}).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('70')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button',{name:'Create local profile'}).click()
  await expect(page.getByRole('heading',{name:'Your day, your pace.'})).toBeVisible()
}

test('mobile logging persists and the cached production PWA reloads offline',async({page,context})=>{
  await onboard(page)
  await page.goto('/log')
  await page.getByRole('button',{name:'+ Food',exact:true}).click()
  await page.getByLabel('Name',{exact:true}).fill('Synthetic cereal')
  await page.getByLabel('Amount consumed').fill('1.5')
  await page.getByLabel('Calories (kcal)').fill('230')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByText('Intake entry saved on this device.')).toBeVisible()
  await page.getByRole('button',{name:'+ 250'}).click()
  await expect(page.getByText('Logged 250 ml of water.')).toBeVisible()

  await page.goto('/today')
  await expect(page.getByRole('heading',{name:'Recorded nutrition and fluids'})).toBeVisible()
  await expect(page.getByText('345 kcal',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('250 ml',{exact:true}).first()).toBeVisible()

  // Register and activate service worker before cutting the network.
  await page.evaluate(async()=>{await navigator.serviceWorker.ready})
  await page.reload()
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.reload({waitUntil:'domcontentloaded'})
  await expect(page.getByRole('heading',{name:'Your day, your pace.'})).toBeVisible()
  await expect(page.getByText('345 kcal',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('250 ml',{exact:true}).first()).toBeVisible()
})

test('backup export, confirmed reset and replace restore preserve local entries',async({page})=>{
  await onboard(page)
  await page.goto('/log')
  await page.getByRole('button',{name:'+ 350'}).click()
  await expect(page.getByText('Logged 350 ml of water.')).toBeVisible()

  await page.goto('/settings/data')
  await page.getByRole('button',{name:'Prepare export preview'}).click()
  await expect(page.getByRole('heading',{name:/Ready to export/})).toBeVisible()
  await expect(page.getByText('Food / drink entries').first()).toBeVisible()
  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:'Download this validated JSON backup'}).click()
  const download=await downloadPromise
  const filepath=await download.path()
  expect(filepath).not.toBeNull()

  await page.getByRole('button',{name:'Show deletion confirmation'}).click()
  await page.getByLabel('Type DELETE to confirm').fill('DELETE')
  await page.getByRole('button',{name:'Permanently delete all local data'}).click()
  await expect(page.getByRole('heading',{name:'Track what matters to you.'})).toBeVisible()

  // Import works from onboarding through a new local profile, so create a
  // temporary one first; REPLACE must overwrite it, not merge with it.
  await onboardAfterReset(page)
  await page.goto('/settings/data')
  await page.getByLabel('Choose JSON file').setInputFiles(filepath!)
  await expect(page.getByRole('heading',{name:/Verified backup preview/})).toBeVisible()
  await page.getByLabel('Type REPLACE to confirm overwriting').fill('REPLACE')
  await page.getByRole('button',{name:'Replace all local data'}).click()
  await expect(page.getByRole('heading',{name:'Your day, your pace.'})).toBeVisible()
  await page.goto('/today')
  await expect(page.getByText('350 ml',{exact:true})).toBeVisible()
  await page.reload()
  await expect(page.getByText('350 ml',{exact:true})).toBeVisible()
})

async function onboardAfterReset(page:Page){
  await page.getByRole('textbox',{name:'Date of birth'}).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('72')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button',{name:'Create local profile'}).click()
  await expect(page.getByRole('heading',{name:'Your day, your pace.'})).toBeVisible()
}

test('malformed import never alters existing IndexedDB data',async({page})=>{
  await onboard(page)
  await page.goto('/log')
  await page.getByRole('button',{name:'+ 500'}).click()
  await expect(page.getByText('Logged 500 ml of water.')).toBeVisible()
  await page.goto('/settings/data')
  await page.getByLabel('Choose JSON file').setInputFiles({
    name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"formatVersion":999}')
  })
  await expect(page.getByRole('alert')).toContainText('Backup:')
  await page.goto('/today')
  await expect(page.getByText('500 ml',{exact:true})).toBeVisible()
})

test('320, 360, 390 and 430 px layouts do not force body horizontal scrolling',async({page})=>{
  await onboard(page)
  for(const width of [320,360,390,430]){
    await page.setViewportSize({width,height:844})
    for(const url of ['/today','/calendar','/trends','/settings/data']){
      await page.goto(url)
      await expect(page.locator('main')).toBeVisible()
      const size=await page.evaluate(()=>({
        document:document.documentElement.scrollWidth,viewport:window.innerWidth
      }))
      expect(size.document, 'horizontal document overflow at '+url+' / '+width+' px')
        .toBeLessThanOrEqual(size.viewport+2)
    }
  }
})

test('cached tabs support offline navigation and newly saved records', async ({page, context}) => {
  await onboard(page)
  await page.goto('/today')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  for (const [url, heading] of [
    ['/log', 'Log'],
    ['/calendar', 'Your recorded days'],
    ['/trends', 'Recorded history'],
    ['/settings', 'Settings'],
    ['/settings/data', 'Your local records']
  ] as const) {
    await page.goto(url, {waitUntil: 'domcontentloaded'})
    await expect(page.getByRole('heading', {name: heading, exact: true})).toBeVisible()
  }

  await page.goto('/log', {waitUntil: 'domcontentloaded'})
  await page.getByRole('button', {name: '+ 150'}).click()
  await expect(page.getByText('Logged 150 ml of water.')).toBeVisible()
  await page.goto('/today', {waitUntil: 'domcontentloaded'})
  await expect(page.getByText('150 ml', {exact: true}).first()).toBeVisible()
  await page.reload({waitUntil: 'domcontentloaded'})
  await expect(page.getByText('150 ml', {exact: true}).first()).toBeVisible()
})

test('keyboard users can skip to content and activate the primary tabs', async ({page}) => {
  await onboard(page)
  await page.goto('/today')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', {name: 'Skip to content'})
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()

  const nav = page.getByRole('navigation', {name: 'Primary navigation'})
  const calendar = nav.getByRole('link', {name: 'Calendar'})
  await calendar.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', {name: 'Your recorded days'})).toBeVisible()
  await expect(calendar).toHaveAttribute('aria-current', 'page')

  const trends = nav.getByRole('link', {name: 'Trends'})
  await trends.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', {name: 'Recorded history'})).toBeVisible()
  await expect(trends).toHaveAttribute('aria-current', 'page')
})

test('everyday movement presets explain their multiplier and persist without guessing a default', async ({page}) => {
  await onboard(page)
  await page.goto('/settings')
  const dropdown = page.getByRole('combobox', {name: /Usual everyday movement/})
  await expect(dropdown).toHaveValue('')
  await dropdown.selectOption('1.2')
  await expect(page.getByText(/Background kcal estimate = resting kcal × 1\.20/)).toBeVisible()
  await page.getByRole('button', {name: 'Save profile and goals'}).click()
  await expect(page.getByText("Saved to this browser's IndexedDB.")).toBeVisible()
  await page.reload()
  await expect(dropdown).toHaveValue('1.2')
  await dropdown.selectOption('')
  await page.getByRole('button', {name: 'Save profile and goals'}).click()
  await expect(page.getByText("Saved to this browser's IndexedDB.")).toBeVisible()
  await page.reload()
  await expect(dropdown).toHaveValue('')
})

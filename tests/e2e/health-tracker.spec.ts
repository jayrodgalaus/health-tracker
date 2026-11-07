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

test('shared branding banner is absent on onboarding and every main page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Your day, your data', {exact:true})).toHaveCount(0)
  await onboard(page)
  for (const route of [
    '/today', '/log', '/calendar', '/trends', '/settings',
    '/settings/profile', '/settings/goals', '/settings/preferences',
    '/settings/data', '/settings/docs', '/settings/docs/food', '/settings/about'
  ]) {
    await page.goto(route)
    await expect(page.getByText('Health Tracker', {exact:true})).toHaveCount(0)
    await expect(page.getByText('Your day, your data', {exact:true})).toHaveCount(0)
  }
  await expect(page.getByRole('navigation',{name:'Primary navigation'})).toBeVisible()
})


test('Log shows only quick actions, a weight card, then the day-completion button',async({page})=>{
  await onboard(page)
  await page.goto('/log?date=2026-01-15')
  await expect(page.getByRole('heading',{name:'Quick actions'})).toBeVisible()
  const actions=page.getByRole('navigation',{name:'Quick actions'})
  await expect(actions.getByRole('link')).toHaveCount(3)
  for(const label of ['+ Food','+ Drink','+ Exercise']){
    await expect(actions.getByRole('link',{name:label,exact:true})).toBeVisible()
  }
  await expect(page.getByRole('heading',{name:'Weight',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:/Recorded exercise|Entries for|Nutrition and fluids|Weight history/})).toHaveCount(0)
  await expect(page.locator('#main-content > div > :last-child')).toHaveText('Mark day complete')
  await page.getByLabel('Weight (kg)').fill('71.5')
  await page.getByRole('button',{name:'Save weight'}).click()
  await expect(page.getByText('Weight saved.')).toBeVisible()
  await page.getByRole('button',{name:'Mark day complete'}).click()
  await expect(page.getByRole('button',{name:'Reopen day'})).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('#main-content > div > :last-child')).toHaveText('Reopen day')
  await page.goto('/calendar/2026-01-15')
  await expect(page.getByRole('heading',{name:'Detailed entries · 2026-01-15'})).toBeVisible()
  await expect(page.getByText('71.5 kg measured')).toBeVisible()
  await page.getByRole('link',{name:'Add or edit weight'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15#weight$/)
  await expect(page.getByLabel('Weight (kg)')).toHaveValue('71.50')
  await page.getByLabel('Weight (kg)').fill('72')
  await page.getByRole('button',{name:'Update weight'}).click()
  await expect(page.getByText('Weight saved.')).toBeVisible()
  await page.getByRole('button',{name:'Reopen day'}).click()
  await expect(page.getByRole('button',{name:'Mark day complete'})).toHaveAttribute('aria-pressed','false')
})

test('dedicated food, drink and exercise forms save and Calendar can edit/delete them',async({page})=>{
  await onboard(page)
  await page.goto('/log?date=2026-01-15')
  await page.getByRole('link',{name:'+ Food',exact:true}).click()
  await expect(page).toHaveURL(/\/log\/food\?date=2026-01-15$/)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic cabbage')
  await page.getByLabel('Calories (kcal)').fill('25')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByText('Intake entry saved.')).toBeVisible()
  await page.getByRole('link',{name:'+ Food',exact:true}).click()
  await page.getByRole('link',{name:'+ Synthetic cabbage'}).click()
  await expect(page.getByRole('combobox',{name:'Name'})).toHaveValue('Synthetic cabbage')
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('25')
  await page.getByRole('link',{name:/Back to Log/}).click()
  await page.getByRole('link',{name:'+ Exercise',exact:true}).click()
  await page.getByLabel('Duration (minutes)').fill('30')
  await page.getByRole('button',{name:'Save exercise'}).click()
  await expect(page.getByText('Exercise saved.')).toBeVisible()
  await page.getByRole('link',{name:'+ Drink',exact:true}).click()
  await expect(page).toHaveURL(/\/log\/drink\?date=2026-01-15$/)
  await page.getByRole('link',{name:'Log plain water instead'}).click()
  await page.getByLabel('Volume (ml)').fill('250')
  await page.getByRole('button',{name:'Save water',exact:true}).click()
  await expect(page.getByText('Logged 250 ml of water.')).toBeVisible()
  await expect(page.getByRole('heading',{name:'Detailed entries'})).toHaveCount(0)
  await page.goto('/calendar/2026-01-15')
  await expect(page.getByText('Synthetic cabbage')).toBeVisible()
  await expect(page.getByText('Walking',{exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Drinks and water (1)'})).toBeVisible()
  await page.getByRole('link',{name:'Edit / delete'}).first().click()
  await expect(page).toHaveURL(/\/log\/food\?date=2026-01-15&edit=/)
  await expect(page.getByRole('heading',{name:'Edit food'})).toBeVisible()
  await page.getByRole('button',{name:'Delete entry'}).click()
  await page.getByRole('button',{name:'Confirm delete'}).click()
  await expect(page).toHaveURL(/\/calendar\/2026-01-15$/)
  await expect(page.getByText('Synthetic cabbage')).toHaveCount(0)
  await page.getByRole('link',{name:'Edit / delete'}).first().click()
  await expect(page).toHaveURL(/\/log\/drink\?date=2026-01-15&edit=/)
  await expect(page.getByRole('heading',{name:'Log water'})).toBeVisible()
  await expect(page.getByLabel('Volume (ml)')).toHaveValue('250')
  await page.getByRole('link',{name:/Back to Calendar/}).click()
  await page.getByRole('link',{name:'Edit / delete'}).last().click()
  await expect(page).toHaveURL(/\/log\/exercise\?date=2026-01-15&edit=/)
  await expect(page.getByRole('heading',{name:'Edit exercise'})).toBeVisible()
})

test('Calendar nutrient percentages remain visible as minimums when entries have missing data',async({page})=>{
  await onboard(page)
  await page.goto('/settings/profile')
  await page.getByRole('combobox',{name:'Sex-based reference for energy equation and RENI'}).selectOption('female')
  await page.getByRole('button',{name:'Save profile'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Profile saved.')

  await page.goto('/log/food?date=2026-01-15')
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic protein / fiber meal')
  await page.getByLabel('Protein (g)').fill('49.1')
  await page.getByLabel('Fiber (g)').fill('12.5')
  await page.getByLabel('Potassium (mg)').fill('1000')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')
  await page.goto('/calendar/2026-01-15')
  const nutrients=page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(nutrients.getByText('Protein (g)',{exact:true}).locator('..')).toContainText('49.1 g (79.2%)')
  await expect(nutrients.getByText('Fiber (g)',{exact:true}).locator('..')).toContainText('12.5 g (50.0%)')
  await expect(nutrients.getByText('Potassium (mg)',{exact:true}).locator('..')).toContainText('1,000 mg (50.0%)')
  await expect(nutrients.getByText('Carbs (g)',{exact:true}).locator('..')).not.toContainText('%')
  await expect(nutrients.getByText('Sodium (mg)',{exact:true}).locator('..')).not.toContainText('%')
  await expect(nutrients.getByText('Sugars (g)',{exact:true}).locator('..')).not.toContainText('%')
  await expect(nutrients).not.toContainText('NaN%')

  // A second item lacks these three nutrients. Its missing values must not
  // suppress the known percentages or be silently counted as zeros.
  await page.goto('/log/food?date=2026-01-15')
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic calories-only food')
  await page.getByLabel('Calories (kcal)').fill('120')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')
  await page.goto('/calendar/2026-01-15')
  const partial=page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(partial.getByText('Protein (g)',{exact:true}).locator('..')).toContainText('At least 49.1 g (≥79.2%)')
  await expect(partial.getByText('Fiber (g)',{exact:true}).locator('..')).toContainText('At least 12.5 g (≥50.0%)')
  await expect(partial.getByText('Potassium (mg)',{exact:true}).locator('..')).toContainText('At least 1,000 mg (≥50.0%)')
  await expect(partial).not.toContainText('Known for')
  await expect(partial).not.toContainText('FNRI PDRI')

  await page.goto('/settings/profile')
  await page.getByRole('combobox',{name:'Sex-based reference for energy equation and RENI'}).selectOption('')
  await page.getByRole('button',{name:'Save profile'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Profile saved.')
  await page.goto('/calendar/2026-01-15')
  const after=page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(after).not.toContainText('79.2%')
  await expect(after).toContainText('49.1 g')
  await expect(after).toContainText('50.0%')
})

test('Preferences carbs, sugar and sodium limits drive Calendar percentages, including partial logs', async ({page}) => {
  await onboard(page)
  await page.goto('/settings/preferences')
  await expect(page.getByRole('heading',{name:'Calendar nutrient comparison limits'})).toBeVisible()
  await page.getByLabel('Carbs upper limit (g/day)').fill('120')
  await page.getByLabel('Total sugars upper limit (g/day)').fill('40')
  await page.getByLabel('Sodium upper limit (mg/day)').fill('2000')
  await page.getByRole('button',{name:'Save nutrient limits'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Nutrient comparison limits saved.')
  await page.reload()
  await expect(page.getByLabel('Carbs upper limit (g/day)')).toHaveValue('120')
  await expect(page.getByLabel('Total sugars upper limit (g/day)')).toHaveValue('40')
  await expect(page.getByLabel('Sodium upper limit (mg/day)')).toHaveValue('2000')

  await page.goto('/log/food?date=2026-01-15')
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic sugar and sodium meal')
  await page.getByLabel('Carbs (g)').fill('75')
  await page.getByLabel('Sugars (g)').fill('20')
  await page.getByLabel('Sodium (mg)').fill('2400')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')
  await page.goto('/calendar/2026-01-15')
  const nutrients = page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(nutrients.getByText('Carbs (g)',{exact:true}).locator('..')).toContainText('75 g (62.5%)')
  await expect(nutrients.getByText('Sugars (g)',{exact:true}).locator('..')).toContainText('20 g (50.0%)')
  await expect(nutrients.getByText('Sodium (mg)',{exact:true}).locator('..')).toContainText('2,400 mg (120.0%)')
  await expect(nutrients.getByText('Sugars (g)',{exact:true}).locator('..')).not.toContainText('Custom upper limit')
  await expect(nutrients.getByText('Sodium (mg)',{exact:true}).locator('..')).not.toContainText('Custom upper limit')

  await page.goto('/log/food?date=2026-01-15')
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic entry without sugars or sodium')
  await page.getByLabel('Calories (kcal)').fill('100')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')
  await page.goto('/calendar/2026-01-15')
  const partial = page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(partial.getByText('Carbs (g)',{exact:true}).locator('..')).toContainText('At least 75 g (≥62.5%)')
  await expect(partial.getByText('Sugars (g)',{exact:true}).locator('..')).toContainText('At least 20 g (≥50.0%)')
  await expect(partial.getByText('Sodium (mg)',{exact:true}).locator('..')).toContainText('At least 2,400 mg (≥120.0%)')

  await page.goto('/settings/preferences')
  await page.getByLabel('Carbs upper limit (g/day)').fill('150')
  await page.getByLabel('Total sugars upper limit (g/day)').fill('')
  await page.getByLabel('Sodium upper limit (mg/day)').fill('3000')
  await page.getByRole('button',{name:'Save nutrient limits'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Nutrient comparison limits saved.')
  await page.goto('/calendar/2026-01-15')
  const updated = page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(updated.getByText('Carbs (g)',{exact:true}).locator('..')).toContainText('≥50.0%')
  await expect(updated.getByText('Sugars (g)',{exact:true}).locator('..')).not.toContainText('%')
  await expect(updated.getByText('Sodium (mg)',{exact:true}).locator('..')).toContainText('≥80.0%')
  await page.goto('/settings/preferences')
  await page.getByLabel('Carbs upper limit (g/day)').fill('')
  await page.getByRole('button',{name:'Save nutrient limits'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Nutrient comparison limits saved.')
  await page.goto('/calendar/2026-01-15')
  const noCarbsLimit = page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(noCarbsLimit.getByText('Carbs (g)',{exact:true}).locator('..')).not.toContainText('%')
  await expect(noCarbsLimit.getByText('Sodium (mg)',{exact:true}).locator('..')).toContainText('≥80.0%')
})

test('nutrient cards open per-entry food and drink pages with dash for unknown and zero preserved', async ({page}) => {
  await onboard(page)
  const date = '2026-01-15'

  await page.goto('/log/food?date=' + date)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic lentils')
  await page.getByLabel('Protein (g)').fill('12.5')
  await page.getByLabel('Sodium (mg)').fill('300')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')

  await page.goto('/log/drink?date=' + date)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic tea')
  await page.getByLabel('Protein (g)').fill('0')
  await page.getByLabel('Sodium (mg)').fill('50')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')

  await page.goto('/log/drink?date=' + date + '&water=1')
  await page.getByRole('button',{name:'+ 250 ml'}).click()
  await expect(page.getByText('Logged 250 ml of water.')).toBeVisible()

  await page.goto('/log/food?date=' + date)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic crackers')
  await page.getByLabel('Calories (kcal)').fill('90')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')

  await page.setViewportSize({width:360,height:780})
  await page.goto('/calendar/' + date)
  const cards = page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(cards.getByRole('link')).toHaveCount(7)
  await expect(cards).not.toContainText('Known for')
  await expect(cards).not.toContainText('no reference %')
  await expect(cards).not.toContainText('Custom upper limit:')
  await expect(cards).not.toContainText('Percentages compare')
  await cards.getByRole('link',{name:/Protein \(g\)/}).click()
  await expect(page).toHaveURL('/calendar/' + date + '/nutrients/proteinG')
  await expect(page.getByRole('heading',{name:'Protein (g)'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Foods (2)'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Drinks and water (2)'})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic lentils'}).getByText('12.5 g',{exact:true})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic crackers'}).getByText('-',{exact:true})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic tea'}).getByText('0 g',{exact:true})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Water'}).getByText('0 g',{exact:true})).toBeVisible()
  await expect(page.getByRole('region',{name:'Recorded nutrient total'})).toContainText('At least 12.5 g')
  const dimensions = await page.evaluate(() => ({document:document.documentElement.scrollWidth,viewport:window.innerWidth}))
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2)

  await page.getByRole('link',{name:/Back to day details/}).click()
  await expect(page).toHaveURL('/calendar/' + date)
  await page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..').getByRole('link',{name:/Sodium \(mg\)/}).click()
  await expect(page).toHaveURL('/calendar/' + date + '/nutrients/sodiumMg')
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic tea'}).getByText('50 mg',{exact:true})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Water'}).getByText('-',{exact:true})).toBeVisible()

  await page.getByRole('listitem').filter({hasText:'Synthetic lentils'}).getByRole('link',{name:'Edit entry'}).click()
  await expect(page.getByRole('heading',{name:'Edit food'})).toBeVisible()
  await page.goto('/calendar/' + date + '/nutrients/notAField')
  await expect(page.getByRole('alert')).toContainText('Invalid date or nutrient')
})

test('save confirmations appear as dismissible transient toasts outside the Log form', async ({page}) => {
  await onboard(page)
  // Onboarding records today's initial weight; use an unlogged historical date.
  await page.goto('/log?date=2026-01-15')
  await page.getByLabel('Weight (kg)').fill('71.25')
  await page.getByRole('button', {name:'Save weight'}).click()
  const notice=page.getByTestId('app-toast')
  await expect(notice).toHaveAttribute('role','status')
  await expect(notice).toContainText('Weight saved.')
  await expect(page.locator('#main-content').getByText('Weight saved.')).toHaveCount(0)
  await page.getByRole('button', {name:'Dismiss notification'}).click()
  await expect(notice).toHaveCount(0)
  await page.getByRole('button', {name:'Update weight'}).click()
  await expect(notice).toContainText('Weight saved.')
  await expect(notice).toHaveCount(0,{timeout:7000})
})

test('mobile logging persists and the cached production PWA reloads offline',async({page,context})=>{
  await onboard(page)
  await page.goto('/log')
  await page.getByRole('link',{name:'+ Food',exact:true}).click()
  await page.getByLabel('Name',{exact:true}).fill('Synthetic cereal')
  await page.getByLabel('Amount consumed').fill('1.5')
  await page.getByLabel('Calories (kcal)').fill('230')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByText('Intake entry saved.')).toBeVisible()
  await page.goto('/log/drink?water=1')
  await page.getByRole('button',{name:'+ 250 ml'}).click()
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
  await page.goto('/log/drink?water=1')
  await page.getByRole('button',{name:'+ 350 ml'}).click()
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
  await page.goto('/log/drink?water=1')
  await page.getByRole('button',{name:'+ 500 ml'}).click()
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
    for(const url of ['/today','/calendar','/trends','/settings/data','/settings/docs','/settings/docs/food']){
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
  await page.goto('/log/drink?water=1')
  await page.getByRole('button',{name:'+ 150 ml'}).click()
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

async function persistedBackgroundMultiplier(page: Page): Promise<number | null> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('health-tracker')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<number | null>((resolve, reject) => {
        const transaction = database.transaction('profiles', 'readonly')
        const request = transaction.objectStore('profiles').get('primary')
        request.onsuccess = () =>
          resolve((request.result as { backgroundActivityMultiplier?: number | null } | undefined)?.backgroundActivityMultiplier ?? null)
        request.onerror = () => reject(request.error)
      })
    } finally {
      database.close()
    }
  })
}

test('everyday movement presets persist independently of goals', async ({page}) => {
  await onboard(page)
  await page.goto('/settings/profile')
  const dropdown = page.getByRole('combobox', {name: /Usual everyday movement/})
  await expect(dropdown).toHaveValue('')
  await dropdown.selectOption('1.2')
  await page.getByRole('button', {name: 'Save profile'}).click()
  await expect(page.getByText('Profile saved.')).toBeVisible()
  await expect.poll(() => persistedBackgroundMultiplier(page)).toBe(1.2)
  await page.reload()
  await expect(dropdown).toHaveValue('1.2')

  await dropdown.selectOption('')
  await page.getByRole('button', {name: 'Save profile'}).click()
  await expect.poll(() => persistedBackgroundMultiplier(page)).toBeNull()
  await page.reload()
  await expect(dropdown).toHaveValue('')
})

test('Settings is a navigation list with dedicated pages and contextual Docs links', async ({page}) => {
  await onboard(page)
  await page.goto('/settings')
  const menu = page.getByRole('navigation', {name: 'Settings sections'})
  for (const label of ['Profile','Goals and targets','Preferences','Data and backups','Docs','About and health notice']) {
    await expect(menu.getByRole('link', {name:new RegExp('^'+label)})).toBeVisible()
  }
  await menu.getByRole('link', {name:/^Goals and targets/}).click()
  await expect(page).toHaveURL(/\/settings\/goals$/)
  await expect(page.getByRole('combobox',{name:'Primary goal'})).toBeVisible()
  await expect(page.getByRole('textbox',{name:'Date of birth'})).toHaveCount(0)
  await page.getByRole('link',{name:'Back to Settings'}).click()
  await menu.getByRole('link',{name:/^Profile/}).click()
  await expect(page).toHaveURL(/\/settings\/profile$/)
  await expect(page.getByRole('textbox',{name:'Date of birth'})).toBeVisible()
  await expect(page.getByRole('combobox',{name:'Primary goal'})).toHaveCount(0)
  await page.getByRole('link',{name:'Back to Settings'}).click()
  await menu.getByRole('link',{name:/^Preferences/}).click()
  await expect(page.getByRole('heading',{name:'Water quick-add amounts'})).toBeVisible()
  await page.getByRole('link',{name:'Back to Settings'}).click()
  await menu.getByRole('link',{name:/^Docs/}).click()
  await expect(page.getByRole('heading',{name:'Docs',exact:true})).toBeVisible()
  const contents = page.getByRole('navigation',{name:'Documentation contents'})
  await expect(contents.getByRole('link',{name:'Nutrient terms and units'})).toBeVisible()
  await contents.getByRole('link',{name:'Nutrient terms and units'}).click()
  await expect(page).toHaveURL(/\/settings\/docs\/nutrition$/)
  await expect(page.getByRole('heading',{name:'Nutrient terms and units'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Exercise and energy estimates'})).toHaveCount(0)
  await page.getByRole('link',{name:'Back to Docs'}).click()
  await expect(page.getByRole('navigation',{name:'Documentation contents'})).toBeVisible()
  await page.getByRole('link',{name:'Back to Settings'}).click()
  await menu.getByRole('link',{name:/^About and health notice/}).click()
  await expect(page.getByRole('heading',{name:'Health information notice'})).toBeVisible()
  await page.goto('/today')
  await page.getByRole('link',{name:'About this page: today'}).click()
  await expect(page).toHaveURL(/\/settings\/docs\/today$/)
  await expect(page.getByRole('heading',{name:'Today and daily totals'})).toBeVisible()
  await page.goto('/log')
  await page.getByRole('link',{name:'About this page: log'}).click()
  await expect(page).toHaveURL(/\/settings\/docs\/log$/)
  await expect(page.getByRole('heading',{name:'Daily logging'})).toBeVisible()
})

test('Docs topics navigate as independent pages, with direct links and offline reload', async ({page, context}) => {
  await onboard(page)
  await page.goto('/settings/docs')
  const contents = page.getByRole('navigation', {name: 'Documentation contents'})
  await expect(contents.getByRole('link')).toHaveCount(15)
  await contents.getByRole('link', {name:'Today and daily totals'}).click()
  await expect(page).toHaveURL(/\/settings\/docs\/today$/)
  await expect(page.getByRole('heading',{name:'Today and daily totals'})).toBeVisible()
  await expect(page.getByText('Calories consumed',{exact:false}).first()).toBeVisible()
  await page.getByRole('link', {name: 'Calendar and day completion',exact:true}).click()
  await expect(page).toHaveURL(/\/settings\/docs\/calendar$/)
  await expect(page.getByRole('heading',{name:'Calendar colors and day completion'})).toBeVisible()
  await page.getByRole('link',{name:'Back to Docs'}).click()
  await page.getByRole('link',{name:'Glossary'}).click()
  await expect(page).toHaveURL(/\/settings\/docs\/glossary$/)
  await expect(page.getByText('Nutrient snapshot',{exact:true})).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading',{name:'Glossary'})).toBeVisible()

  // Prior in-app /settings/docs#topic links continue to resolve.
  await page.goto('/settings/docs#food')
  await expect(page).toHaveURL(/\/settings\/docs\/food$/)
  await expect(page.getByRole('heading',{name:'Food lookup and nutrition labels'})).toBeVisible()
  await page.goto('/settings/docs/not-a-topic')
  await expect(page.getByRole('heading',{name:'Document not found'})).toBeVisible()
  await page.getByRole('link',{name:'Back to Docs'}).click()

  // Topic routes are part of the installed offline PWA and survive navigation.
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.goto('/settings/docs/exercise',{waitUntil:'domcontentloaded'})
  await expect(page.getByRole('heading',{name:'Exercise and energy estimates'})).toBeVisible()
  await page.reload({waitUntil:'domcontentloaded'})
  await expect(page.getByRole('heading',{name:'Exercise and energy estimates'})).toBeVisible()
})

test('explicit food lookup autofills verified per-100g nutrients without auto-contacting the provider', async ({page}) => {
  await onboard(page)
  let networkCalls = 0
  await page.route('https://world.openfoodfacts.org/cgi/search.pl?**', async route => {
    networkCalls++
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({
      count: 1, products: [{
        code: '3017624010701', product_name: 'Synthetic test oats',
        brands: 'Synthetic label', quantity: '400 g', product_quantity_unit: 'g',
        nutriments: {
          'energy-kcal_100g': 400,
          'proteins_100g': 13,
          'carbohydrates_100g': 68,
          'fat_100g': 7,
          'sodium_100g': 0.02,
          'sugars_100g': 1.2
        }
      }]
    })})
  })
  await page.goto('/log')
  await page.getByRole('link', {name: '+ Food', exact: true}).click()
  const name = page.getByRole('combobox', {name: 'Name'})
  await name.fill('Synthetic test')
  expect(networkCalls).toBe(0)
  await page.getByRole('button', {name: 'Search online'}).click()
  await expect(page.getByRole('option', {name: /Synthetic test oats.*Open Food Facts/})).toBeVisible()
  expect(networkCalls).toBe(1)
  await page.getByRole('option', {name: /Synthetic test oats.*Open Food Facts/}).click()
  await expect(name).toHaveValue('Synthetic test oats')
  await expect(page.getByRole('combobox', {name: 'Nutrition is per'})).toHaveValue('100g')
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('400')
  await expect(page.getByLabel('Protein (g)')).toHaveValue('13')
  await expect(page.getByLabel('Sodium (mg)')).toHaveValue('20')
  await expect(page.getByLabel('Fiber (g)')).toHaveValue('')
  await page.getByLabel('Amount consumed').fill('75')
  await page.getByRole('button', {name: 'Add to log'}).click()
  await expect(page.getByText('Intake entry saved.')).toBeVisible()
  const saved = await page.evaluate(async () => {
    const open = indexedDB.open('health-tracker')
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction('foodEntries', 'readonly')
        const req = tx.objectStore('foodEntries').getAll()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    } finally {
      db.close()
    }
  }) as Array<{
    nutrientsSnapshot: {energyKcal: number; proteinG: number; sodiumMg: number; fiberG: number | null}
    referenceNutrientsSnapshot: {energyKcal: number}
    nutritionSource?: {provider: string; productCode: string}
    labelBasis: {quantity: number; unit: string}
  }>
  const entry = saved.find(item => item.nutritionSource?.productCode === '3017624010701')
  expect(entry?.nutrientsSnapshot.energyKcal).toBe(300)
  expect(entry?.nutrientsSnapshot.proteinG).toBeCloseTo(9.75)
  expect(entry?.nutrientsSnapshot.sodiumMg).toBeCloseTo(15)
  expect(entry?.nutrientsSnapshot.fiberG).toBeNull()
  expect(entry?.referenceNutrientsSnapshot.energyKcal).toBe(400)
  expect(entry?.labelBasis).toEqual({quantity:100,unit:'g'})
})

test('saved foods remain selectable locally without online lookup', async ({page}) => {
  await onboard(page)
  let onlineSearches = 0
  await page.route('https://world.openfoodfacts.org/cgi/search.pl?**', async route => {
    onlineSearches++
    await route.abort()
  })
  await page.goto('/log/saved-foods')
  await page.getByRole('button', {name: '+ Save a label'}).click()
  await page.getByLabel('Product name').fill('Synthetic offline rice')
  await page.getByLabel('Brand (optional)').fill('Synthetic')
  await page.getByRole('combobox', {name: 'Label values per'}).selectOption('100g')
  await page.getByLabel('Calories (kcal)').fill('130')
  await page.getByRole('button', {name: 'Save label'}).click()
  await expect(page.getByText('Label saved.')).toBeVisible()

  await page.getByRole('link', {name: /Back to Food/}).click()
  await page.getByRole('combobox', {name: 'Name'}).fill('offline rice')
  const item = page.getByRole('option', {name: /Synthetic offline rice.*Saved/})
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('130')
  await expect(page.getByRole('combobox', {name: 'Nutrition is per'})).toHaveValue('100g')
  expect(onlineSearches).toBe(0)
})

test('saved beverage combobox scales both volume and calories once', async ({page}) => {
  await onboard(page)
  await page.goto('/log/saved-foods')
  await page.getByRole('button', {name: '+ Save a label'}).click()
  await page.getByLabel('Product name').fill('Synthetic serving drink')
  await page.getByRole('combobox', {name: 'Product type'}).selectOption('beverage')
  await page.getByLabel('Calories (kcal)').fill('50')
  await page.getByLabel('Fluid volume per reference portion (ml)').fill('250')
  await page.getByRole('button', {name: 'Save label'}).click()
  await expect(page.getByText('Label saved.')).toBeVisible()

  await page.goto('/log/drink')
  await page.getByRole('combobox', {name: 'Name'}).fill('serving drink')
  const saved = page.getByRole('option', {name: /Synthetic serving drink.*Saved/})
  await expect(saved).toBeVisible()
  await saved.click()
  await page.getByLabel('Amount consumed').fill('2')
  await expect(page.getByLabel('Total drink volume in logged portion (ml)')).toHaveValue('500')
  await page.getByRole('button', {name: 'Add to log'}).click()
  await expect(page.getByText('Intake entry saved.')).toBeVisible()
  await page.goto('/today')
  await expect(page.getByText('100 kcal',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('500 ml',{exact:true}).first()).toBeVisible()
})

test('offline USDA cabbage preparation dropdown autofills per-100-g and scales the eaten weight', async ({page, context}) => {
  await onboard(page)
  await page.goto('/today')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.goto('/log', {waitUntil:'domcontentloaded'})
  await page.getByRole('link', {name:'+ Food',exact:true}).click()
  await page.getByRole('combobox', {name:'Name'}).fill('cabbage')
  const preparation = page.getByRole('combobox', {name:'Ingredient variety / preparation'})
  await expect(preparation).toBeVisible()
  await expect(preparation.locator('option[value="169975"]')).toHaveText('Cabbage, raw')
  await expect(preparation.locator('option[value="169976"]')).toHaveText('Cabbage, cooked, boiled, drained, without salt')
  await preparation.selectOption('169976')
  await page.getByRole('button', {name:'Use ingredient nutrition'}).click()
  await expect(page.getByRole('combobox', {name:'Name'})).toHaveValue('Cabbage, cooked, boiled, drained, without salt')
  await expect(page.getByRole('combobox', {name:'Nutrition is per'})).toHaveValue('100g')
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('23')
  await expect(page.getByLabel('Protein (g)')).toHaveValue('1.27')
  await expect(page.getByLabel('Sodium (mg)')).toHaveValue('8')
  await expect(page.getByRole('link', {name:/USDA FoodData Central SR Legacy/})).toHaveAttribute('href', /169976/)
  await page.getByLabel('Amount consumed').fill('75')
  await page.getByRole('button', {name:'Add to log'}).click()
  await expect(page.getByText('Intake entry saved.')).toBeVisible()

  const logged = await page.evaluate(async () => {
    const open = indexedDB.open('health-tracker')
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    try {
      return await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction('foodEntries','readonly').objectStore('foodEntries').getAll()
        request.onsuccess = () => resolve(request.result as unknown[])
        request.onerror = () => reject(request.error)
      })
    } finally {db.close()}
  }) as Array<{
    nutritionSource: {provider:string; fdcId:number}
    nutrientsSnapshot: {energyKcal:number; sodiumMg:number; proteinG:number}
    referenceNutrientsSnapshot: {energyKcal:number}
    quantity:number; labelBasis:{quantity:number;unit:string}
  }>
  const cabbage = logged.find(item => item.nutritionSource?.fdcId === 169976)
  expect(cabbage?.nutritionSource.provider).toBe('usda-sr-legacy')
  expect(cabbage?.nutrientsSnapshot.energyKcal).toBe(17.25)
  expect(cabbage?.nutrientsSnapshot.sodiumMg).toBe(6)
  expect(cabbage?.nutrientsSnapshot.proteinG).toBeCloseTo(0.9525)
  expect(cabbage?.referenceNutrientsSnapshot.energyKcal).toBe(23)
  expect(cabbage?.labelBasis).toEqual({quantity:100,unit:'g'})
})

test('red/purple onion lookup supplies independently sourced raw USDA nutrition offline',async({page,context})=>{
  await onboard(page)
  await page.goto('/today')
  await page.evaluate(async()=>{await navigator.serviceWorker.ready})
  await page.reload()
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.goto('/log/food',{waitUntil:'domcontentloaded'})
  const name=page.getByRole('combobox',{name:'Name'})
  await name.fill('purple onion')
  const variety=page.getByRole('combobox',{name:'Ingredient variety / preparation'})
  await expect(variety.locator('option[value="790577"]')).toHaveText('Onions, red, raw')
  await variety.selectOption('790577')
  await page.getByRole('button',{name:'Use ingredient nutrition'}).click()
  await expect(name).toHaveValue('Onions, red, raw')
  await expect(page.getByRole('combobox',{name:'Nutrition is per'})).toHaveValue('100g')
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('44')
  await expect(page.getByLabel('Protein (g)')).toHaveValue('0.94')
  await expect(page.getByLabel('Fiber (g)')).toHaveValue('2.2')
  await expect(page.getByRole('link',{name:/USDA FoodData Central Foundation Foods/}))
    .toHaveAttribute('href',/790577/)
  await page.getByLabel('Amount consumed').fill('75')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByText('Intake entry saved.')).toBeVisible()
  const entries=await page.evaluate(async()=>{
    const req=indexedDB.open('health-tracker')
    const database=await new Promise<IDBDatabase>((resolve,reject)=>{
      req.onsuccess=()=>resolve(req.result)
      req.onerror=()=>reject(req.error)
    })
    try {
      return await new Promise<unknown[]>((resolve,reject)=>{
        const query=database.transaction('foodEntries','readonly').objectStore('foodEntries').getAll()
        query.onsuccess=()=>resolve(query.result as unknown[])
        query.onerror=()=>reject(query.error)
      })
    }finally{database.close()}
  }) as Array<{nutritionSource:{provider:string;fdcId:number;release:string};
    nutrientsSnapshot:{energyKcal:number;sugarsG:number|null};
    referenceNutrientsSnapshot:{energyKcal:number}}>
  const selected=entries.find(item=>item.nutritionSource?.fdcId===790577)
  expect(selected?.nutritionSource).toEqual({provider:'usda-foundation',fdcId:790577,release:'2026-04'})
  expect(selected?.referenceNutrientsSnapshot.energyKcal).toBe(44)
  expect(selected?.nutrientsSnapshot.energyKcal).toBe(33)
  expect(selected?.nutrientsSnapshot.sugarsG).toBeNull()
})

test('USDA rice variants distinguish cooked white and brown rice in the ingredient dropdown', async ({page}) => {
  await onboard(page)
  await page.goto('/log')
  await page.getByRole('link', {name:'+ Food',exact:true}).click()
  const name = page.getByRole('combobox', {name:'Name'})
  await name.fill('rice')
  const preparation = page.getByRole('combobox', {name:'Ingredient variety / preparation'})
  await expect(preparation.locator('option[value="169704"]')).toHaveText("Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)")
  await expect(preparation.locator('option[value="168878"]')).toHaveText('Rice, white, long-grain, regular, enriched, cooked')
  await preparation.selectOption('169704')
  await page.getByRole('button', {name:'Use ingredient nutrition'}).click()
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('123')
  await name.fill('rice')
  await expect(preparation.locator('option[value="168878"]')).toBeAttached()
  await preparation.selectOption('168878')
  await page.getByRole('button', {name:'Use ingredient nutrition'}).click()
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('130')
  await expect(page.getByLabel('Carbs (g)')).toHaveValue('28.17')
})

test('blanched cabbage query explains the nearest USDA boiled reference is not the same method', async ({page}) => {
  await onboard(page)
  await page.goto('/log')
  await page.getByRole('link', {name:'+ Food',exact:true}).click()
  await page.getByRole('combobox', {name:'Name'}).fill('blanched cabbage')
  await expect(page.getByText(/not an exact measurement of blanched cabbage/)).toBeVisible()
  await expect(page.getByRole('combobox', {name:'Ingredient variety / preparation'}).locator('option[value="169976"]')).toBeAttached()
})


test('log overview and dedicated input pages keep short date labels', async ({page}) => {
  await onboard(page)
  await page.goto('/today')
  await expect(page.getByLabel('Date',{exact:true})).toBeVisible()
  await page.goto('/log')
  await expect(page.getByLabel('Date',{exact:true})).toHaveCount(1)
  for(const [name,route] of [['+ Food','food'],['+ Drink','drink'],['+ Exercise','exercise']] as const){
    await page.getByRole('link',{name,exact:true}).click()
    await expect(page).toHaveURL(new RegExp('/log/'+route))
    await expect(page.getByLabel('Date',{exact:true})).toHaveCount(1)
    await expect(page.getByLabel('Date',{exact:true})).not.toHaveValue('')
    await page.getByRole('link',{name:/Back to Log/}).click()
  }
})

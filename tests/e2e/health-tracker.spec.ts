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

test('everyday movement presets explain and persist their multiplier without a hidden default', async ({page}) => {
  await onboard(page)
  await page.goto('/settings')
  const dropdown = page.getByRole('combobox', {name: /Usual everyday movement/})
  await expect(dropdown).toHaveValue('')
  await dropdown.selectOption('1.2')
  await expect(page.getByText(/Background kcal estimate = resting kcal × 1\.20/)).toBeVisible()
  await page.getByRole('button', {name: 'Save profile and goals'}).click()
  await expect(page.getByText('Profile and goal changes saved locally.')).toBeVisible()
  await expect.poll(() => persistedBackgroundMultiplier(page)).toBe(1.2)
  await page.reload()
  await expect(dropdown).toHaveValue('1.2')

  await dropdown.selectOption('')
  await page.getByRole('button', {name: 'Save profile and goals'}).click()
  await expect.poll(() => persistedBackgroundMultiplier(page)).toBeNull()
  await page.reload()
  await expect(dropdown).toHaveValue('')
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
  await page.getByRole('button', {name: '+ Food', exact: true}).click()
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
  await expect(page.getByText('Intake entry saved on this device.')).toBeVisible()
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
  await page.goto('/log')
  await page.getByRole('button', {name: '+ Save a label'}).click()
  await page.getByLabel('Product name').fill('Synthetic offline rice')
  await page.getByLabel('Brand (optional)').fill('Synthetic')
  await page.getByRole('combobox', {name: 'Label values per'}).selectOption('100g')
  await page.getByLabel('Calories (kcal)').fill('130')
  await page.getByRole('button', {name: 'Save label'}).click()
  await expect(page.getByText('Label saved locally.')).toBeVisible()

  await page.getByRole('button', {name: '+ Food', exact: true}).click()
  await page.getByRole('combobox', {name: 'Name'}).fill('offline rice')
  const item = page.getByRole('option', {name: /Synthetic offline rice.*Saved on device/})
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('130')
  await expect(page.getByRole('combobox', {name: 'Nutrition is per'})).toHaveValue('100g')
  expect(onlineSearches).toBe(0)
})

test('saved beverage combobox scales both volume and calories once', async ({page}) => {
  await onboard(page)
  await page.goto('/log')
  await page.getByRole('button', {name: '+ Save a label'}).click()
  await page.getByLabel('Product name').fill('Synthetic serving drink')
  await page.getByRole('combobox', {name: 'Product type'}).selectOption('beverage')
  await page.getByLabel('Calories (kcal)').fill('50')
  await page.getByLabel('Fluid volume per reference portion (ml)').fill('250')
  await page.getByRole('button', {name: 'Save label'}).click()
  await expect(page.getByText('Label saved locally.')).toBeVisible()

  await page.getByRole('button', {name: '+ Drink', exact: true}).click()
  await page.getByRole('combobox', {name: 'Name'}).fill('serving drink')
  const saved = page.getByRole('option', {name: /Synthetic serving drink.*Saved on device/})
  await expect(saved).toBeVisible()
  await saved.click()
  await page.getByLabel('Amount consumed').fill('2')
  await expect(page.getByLabel('Total drink volume in logged portion (ml)')).toHaveValue('500')
  await page.getByRole('button', {name: 'Add to log'}).click()
  await expect(page.getByText('Intake entry saved on this device.')).toBeVisible()
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
  await page.getByRole('button', {name:'+ Food',exact:true}).click()
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
  await expect(page.getByText('Intake entry saved on this device.')).toBeVisible()

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

test('USDA rice variants distinguish cooked white and brown rice in the ingredient dropdown', async ({page}) => {
  await onboard(page)
  await page.goto('/log')
  await page.getByRole('button', {name:'+ Food',exact:true}).click()
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
  await page.getByRole('button', {name:'+ Food',exact:true}).click()
  await page.getByRole('combobox', {name:'Name'}).fill('blanched cabbage')
  await expect(page.getByText(/not an exact measurement of blanched cabbage/)).toBeVisible()
  await expect(page.getByRole('combobox', {name:'Ingredient variety / preparation'}).locator('option[value="169976"]')).toBeAttached()
})

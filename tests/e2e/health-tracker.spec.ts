import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Track what matters to you.'})).toBeVisible()
  await page.getByRole('textbox',{name:'Date of birth'}).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('70')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button',{name:'Create local profile'}).click()
  await expect(page.getByRole('heading',{name:'Daily goal alignment'})).toBeVisible()
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


test('Log has five independent colored icon pills and a centered completion action at phone width', async ({page}) => {
  await onboard(page)
  await page.setViewportSize({width:320,height:720})
  await page.goto('/log?date=2026-01-15')
  const actions = page.getByRole('navigation',{name:'Log entry types'})
  await expect(page.getByText('Quick actions',{exact:true})).toHaveCount(0)
  await expect(actions.getByRole('link')).toHaveCount(5)
  await expect(actions).toHaveCSS('background-color','rgba(0, 0, 0, 0)')
  for (const [name, route] of [
    ['Food','food'], ['Drink','drink'], ['Exercise','exercise'], ['Weight','weight'], ['Saved food and drinks','saved-foods']
  ] as const) {
    const pill = actions.getByRole('link',{name,exact:true})
    await expect(pill).toHaveAttribute('href','/log/' + route + '?date=2026-01-15')
    await expect(pill.locator('[data-log-icon]')).toHaveCSS('border-radius','9999px')
    await expect(pill.locator('[data-log-icon] svg')).toHaveAttribute('stroke','white')
  }
  const circles = await actions.locator('[data-log-icon]').evaluateAll(
    elements => elements.map(element => getComputedStyle(element).backgroundColor)
  )
  expect(new Set(circles).size).toBe(5)
  const navBox = await actions.boundingBox()
  const completionBox = await page.getByRole('button',{name:'Mark day complete'}).boundingBox()
  expect(navBox).not.toBeNull()
  expect(completionBox).not.toBeNull()
  expect(Math.abs(completionBox!.x + completionBox!.width/2 - navBox!.x - navBox!.width/2)).toBeLessThan(2)
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(width).toBeLessThanOrEqual(2)
  await actions.getByRole('link',{name:'Weight',exact:true}).click()
  await expect(page).toHaveURL('/log/weight?date=2026-01-15')
  await expect(page.getByLabel('Weight (kg)')).toBeVisible()

  // Preserve compatibility with older links to the inline weight editor.
  await page.goto('/log?date=2026-01-15#weight')
  await expect(page).toHaveURL('/log/weight?date=2026-01-15')
})

test('Log reuses the fixed week picker and keeps all date changes inside Log', async ({page}) => {
  await onboard(page)
  await page.setViewportSize({width:320,height:720})
  await page.goto('/log?date=2026-01-15')
  const week = page.getByRole('navigation',{name:'Week navigation'})
  const days = week.getByRole('group',{name:'Week dates'}).locator('[data-week-day]')
  await expect(days).toHaveCount(7)
  await expect(week.locator('[data-week-day="2026-01-15"]')).toHaveAttribute('aria-current','date')
  await expect(page.getByLabel('Date',{exact:true})).toHaveCount(0)
  await expect(week.getByRole('link',{name:'2026-01-16 (Fri)'})).toHaveAttribute('href','/log?date=2026-01-16')
  await week.getByRole('link',{name:'2026-01-16 (Fri)'}).click()
  await expect(page).toHaveURL('/log?date=2026-01-16')
  await expect(page.getByRole('link',{name:'Food',exact:true})).toHaveAttribute('href','/log/food?date=2026-01-16')
  await expect(page.getByRole('link',{name:'Weight',exact:true})).toHaveAttribute('href','/log/weight?date=2026-01-16')
  await week.getByRole('button',{name:'Previous week'}).click()
  await expect(page).toHaveURL('/log?date=2026-01-09')
  await week.getByRole('button',{name:'Next week'}).click()
  await expect(page).toHaveURL('/log?date=2026-01-16')
  await week.getByRole('link',{name:'Go to today'}).click()
  const selected = await week.locator('[aria-current="date"]').getAttribute('data-week-day')
  await expect(page).toHaveURL('/log?date=' + selected)
  expect(selected).toBe(await page.evaluate(() => {
    const current = new Date()
    return current.getFullYear() + '-' + String(current.getMonth()+1).padStart(2,'0') + '-' + String(current.getDate()).padStart(2,'0')
  }))
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(2)
})

test('Today is exactly the current local Calendar day overview, never a selectable historical dashboard', async ({page}) => {
  await onboard(page)
  const day = await page.evaluate(() => {
    const date = new Date()
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') +
      '-' + String(date.getDate()).padStart(2, '0')
  })

  await page.goto('/today')
  await expect(page.getByRole('heading',{name:day,exact:true})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Daily goal alignment'})).toBeVisible()
  await expect(page.getByRole('region',{name:'Day completion status'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Day details for '+day})).toHaveClass(/sr-only/)
  await expect(page.getByRole('navigation',{name:'Week navigation'}).getByRole('link',{name:'Go to today'})).toBeVisible()
  const cards = page.getByRole('region',{name:'Day details by section'})
  await expect(cards.getByRole('link')).toHaveCount(5)
  await expect(page.getByRole('group',{name:'Week dates'}).locator('[data-week-day]')).toHaveCount(7)
  await expect(page.getByRole('navigation',{name:'Primary navigation'})
    .getByRole('link',{name:'Today'})).toHaveAttribute('aria-current','page')
  await expect(page.getByRole('heading',{name:'Your day, your pace.'})).toHaveCount(0)
  await expect(page.getByRole('navigation',{name:'Day navigation'})).toHaveCount(0)
  await expect(page.getByRole('region',{name:'Quick logging actions'})).toHaveCount(0)
  const todayRadar = page.getByRole('button',{name:'Show daily goal details'})
  await expect(todayRadar).toBeVisible()
  await expect(page.getByRole('list',{name:'Daily goals'})).toBeHidden()
  const todaySvg = await todayRadar.locator('svg[viewBox="0 0 320 306"]').innerHTML()

  // Today remains clickable even when today's date is already selected.
  await page.getByRole('navigation',{name:'Week navigation'})
    .getByRole('link',{name:'Go to today'}).click()
  await expect(page).toHaveURL('/calendar/' + day)
  await page.goto('/calendar/' + day)
  await expect(page.getByRole('region',{name:'Day details by section'}).getByRole('link')).toHaveCount(5)
  const calendarRadar = page.getByRole('button',{name:'Show daily goal details'})
  await expect(calendarRadar).toBeVisible()
  await expect(page.getByRole('list',{name:'Daily goals'})).toBeHidden()
  expect(await calendarRadar.locator('svg[viewBox="0 0 320 306"]').innerHTML()).toBe(todaySvg)
  await calendarRadar.click()
  await expect(page.getByRole('list',{name:'Daily goals'})).toBeVisible()
  await page.getByRole('button',{name:'Hide daily goal details'}).click()
  await expect(page.getByRole('list',{name:'Daily goals'})).toBeHidden()

  await page.goto('/today?date=2026-01-15')
  await expect(page.getByRole('heading',{name:day,exact:true})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'2026-01-15',exact:true})).toHaveCount(0)
  await page.getByRole('navigation',{name:'Week navigation'})
    .getByRole('button',{name:'Previous week'}).click()
  await expect(page).toHaveURL(/\/calendar\/\d{4}-\d{2}-\d{2}$/)
  await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Today'}).click()
  await expect(page).toHaveURL('/today')
  await expect(page.getByRole('heading',{name:day,exact:true})).toHaveCount(0)
})

test('Calendar month heading opens hidden native month selection and displays flush completed-day circles', async ({page}) => {
  await onboard(page)
  await page.goto('/log?date=2026-01-15')
  await page.getByRole('button',{name:'Mark day complete'}).click()
  await page.getByRole('dialog').getByRole('button',{name:'Confirm complete and lock'}).click()
  await expect(page.getByRole('button',{name:'Reopen day'})).toBeVisible()

  await page.setViewportSize({width:320,height:720})
  await page.goto('/calendar')
  await expect(page.getByRole('heading',{name:'Your recorded days'})).toBeVisible()
  await expect(page.getByText(/Phase \d/)).toHaveCount(0)
  await expect(page.getByText('Go to month',{exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Current month'})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Status legend'})).toHaveCount(0)
  await expect(page.getByLabel('Month status counts')).toHaveCount(0)
  const picker = page.getByLabel('Choose month')
  await expect(picker).toHaveAttribute('type','month')
  await expect(picker).toHaveCSS('opacity','0')
  const heading = page.getByRole('heading',{level:2})
  const pickerBox = await picker.boundingBox()
  const headingBox = await heading.boundingBox()
  expect(pickerBox).not.toBeNull()
  expect(headingBox).not.toBeNull()
  expect(pickerBox!.x).toBeLessThanOrEqual(headingBox!.x)
  expect(pickerBox!.x + pickerBox!.width).toBeGreaterThanOrEqual(headingBox!.x + headingBox!.width)

  await picker.fill('2026-01')
  await expect(page.getByRole('heading',{name:'January 2026'})).toBeVisible()
  const month = page.getByRole('region',{name:'January 2026 monthly calendar'})
  await expect(month).toBeVisible()
  await expect(month).toHaveCSS('background-color','rgba(0, 0, 0, 0)')
  await expect(month).toHaveCSS('border-top-width','0px')
  const completed = month.getByRole('link',{name:/2026-01-15: completed/})
  const open = month.getByRole('link',{name:'2026-01-14: not completed'})
  await expect(completed).toBeVisible()
  await expect(open).toBeVisible()
  await expect(completed).toHaveText('15')
  await expect(open).toHaveText('14')
  await expect(completed.locator('span')).toHaveClass(/bg-slate-200/)
  await expect(open.locator('span')).toHaveClass(/bg-transparent/)
  await expect(month.locator('a svg')).toHaveCount(0)
  const width = await page.evaluate(() => ({
    content:document.documentElement.scrollWidth,viewport:window.innerWidth
  }))
  expect(width.content).toBeLessThanOrEqual(width.viewport + 2)

  await page.getByRole('button',{name:'Previous month'}).click()
  await expect(page.getByRole('heading',{name:'December 2025'})).toBeVisible()
  await page.getByRole('button',{name:'Next month'}).click()
  await expect(page.getByRole('heading',{name:'January 2026'})).toBeVisible()
  await completed.click()
  await expect(page).toHaveURL('/calendar/2026-01-15')
  await page.goto('/trends')
  await expect(page.getByText(/Phase \d/)).toHaveCount(0)
})

test('completing a day requires confirmation, locks every form, and reopening restores editing', async({page}) => {
  await onboard(page)
  await page.goto('/log?date=2026-01-15')
  const actions = page.getByRole('navigation',{name:'Log entry types'})
  await expect(actions.getByRole('link')).toHaveCount(5)
  await actions.getByRole('link',{name:'Weight',exact:true}).click()
  await expect(page).toHaveURL('/log/weight?date=2026-01-15')
  await page.getByLabel('Weight (kg)').fill('71.5')
  await page.getByRole('button',{name:'Save weight'}).click()
  await expect(page.getByText('Weight saved.')).toBeVisible()
  await page.getByRole('link',{name:/Back to Log/}).click()

  await page.getByRole('button',{name:'Mark day complete'}).click()
  const confirmation=page.getByRole('dialog',{name:'Lock and complete 2026-01-15?'})
  await expect(confirmation).toBeVisible()
  await expect(confirmation).toContainText('will be saved exactly as they are now')
  await confirmation.getByRole('button',{name:'Cancel'}).click()
  await expect(confirmation).toHaveCount(0)
  await expect(page.getByRole('navigation',{name:'Log entry types'}).getByRole('link')).toHaveCount(5)

  await page.getByRole('button',{name:'Mark day complete'}).click()
  await page.getByRole('button',{name:'Confirm complete and lock'}).click()
  await expect(page.getByRole('heading',{name:'Day complete · Read only'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Reopen day'})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'Log entry types'})).toHaveCount(0)
  await expect(page.getByLabel('Weight (kg)')).toHaveCount(0)

  await page.goto('/calendar/2026-01-15/weight')
  await expect(page.getByRole('heading',{name:'Measured weight (1)'})).toBeVisible()
  await expect(page.getByText('71.5 kg measured')).toBeVisible()
  await expect(page.getByRole('link',{name:'Add or edit weight'})).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Edit / delete'})).toHaveCount(0)
  for (const section of ['nutrition','fluids','activity','weight']) {
    await page.goto('/calendar/2026-01-15/' + section)
    await expect(page.getByRole('link',{name:/Add or edit|Edit \/ delete/})).toHaveCount(0)
  }
  await page.goto('/log/food?date=2026-01-15')
  await expect(page.getByRole('heading',{name:'Completed day · Read only'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Add to log'})).toHaveCount(0)
  await page.goto('/log/drink?date=2026-01-15&water=1')
  await expect(page.getByRole('heading',{name:'Completed day · Read only'})).toBeVisible()
  await page.goto('/log/exercise?date=2026-01-15')
  await expect(page.getByRole('heading',{name:'Completed day · Read only'})).toBeVisible()
  await page.goto('/log/weight?date=2026-01-15')
  await expect(page.getByRole('heading',{name:'Completed day · Read only'})).toBeVisible()
  await expect(page.getByLabel('Weight (kg)')).toHaveCount(0)
  await page.goto('/calendar/2026-01-15')
  await expect(page.getByRole('link',{name:'+ Food'})).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Add / edit weight'})).toHaveCount(0)

  await page.goto('/calendar/2026-01-15')
  await page.getByRole('button',{name:'Reopen day'}).click()
  await expect(page.getByRole('button',{name:'Mark day complete'})).toBeVisible()
  await page.getByRole('link',{name:/^Weight —/}).click()
  await expect(page.getByRole('link',{name:'Add or edit weight'})).toBeVisible()
  await page.getByRole('link',{name:'Add or edit weight'}).click()
  await expect(page).toHaveURL('/log/weight?date=2026-01-15')
  await expect(page.getByLabel('Weight (kg)')).toHaveValue('71.50')
  await page.getByLabel('Weight (kg)').fill('72')
  await page.getByRole('button',{name:'Update weight'}).click()
  await expect(page.getByText('Weight saved.')).toBeVisible()
})

test('Today radar caps five goal scores, inverts calorie deviation and sodium excess, and toggles checklist', async ({page}) => {
  await onboard(page)
  await page.goto('/settings/goals')
  await page.getByLabel('Optional calorie target (kcal/day)').fill('1600')
  await page.getByLabel('Optional protein target (g/day)').fill('100')
  await page.getByLabel('Optional fiber target (g/day)').fill('25')
  await page.getByLabel('Fluid tracking target (ml/day)').fill('2000')
  await page.getByLabel('Optional sodium upper tracking limit (mg/day)').fill('2000')
  await page.getByRole('button',{name:'Save goals'}).click()
  await page.goto('/log/food')
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic daily radar meal')
  await page.getByLabel('Calories (kcal)').fill('1760')
  await page.getByLabel('Protein (g)').fill('100')
  await page.getByLabel('Fiber (g)').fill('12.5')
  await page.getByLabel('Sodium (mg)').fill('2020')
  await page.getByRole('button',{name:'Add to log'}).click()
  await page.goto('/log/drink')
  await page.getByRole('link',{name:'Log plain water instead'}).click()
  await page.getByLabel('Volume (ml)').fill('1000')
  await page.getByRole('button',{name:'Save water'}).click()

  await page.goto('/today')
  const chart = page.getByRole('button',{name:'Show daily goal details'})
  await expect(chart).toHaveAttribute('aria-expanded','false')
  await expect(page.getByRole('list',{name:'Daily goals'})).toBeHidden()
  for (const [code, expected] of [
    ['energyKcal','90%'],['proteinG','100%'],['fiberG','50%'],['fluidMl','50%'],['sodiumMg','90%']
  ]) {
    await expect(chart.locator('[data-radar-label="'+code+'"]')).toContainText(expected)
    await expect(chart.locator('[data-radar-point="'+code+'"]')).toHaveCount(1)
  }
  await expect(chart.locator('[data-radar-shape="complete"]')).toHaveCount(1)
  await chart.click()
  await expect(page.getByRole('button',{name:'Hide daily goal details'})).toHaveAttribute('aria-expanded','true')
  await expect(page.getByRole('list',{name:'Daily goals'}).getByRole('listitem')).toHaveCount(5)
  await page.getByRole('button',{name:'Hide daily goal details'}).click()
  await expect(page.getByRole('list',{name:'Daily goals'})).toBeHidden()
  const gradient = await page.getByRole('heading',{name:'Daily goal alignment'}).locator('..')
    .evaluate(element => getComputedStyle(element).backgroundImage)
  expect(gradient).toContain('linear-gradient')
  expect(gradient).toContain('11, 55, 55')
  await expect(page.getByRole('heading',{name:'Daily goal alignment'})).toHaveCSS('color','rgb(255, 255, 255)')
  await expect(chart).toHaveCSS('color','rgb(255, 255, 255)')
  await expect(chart.locator('[data-radar-label="energyKcal"]')).toHaveAttribute('fill','#ffffff')
  await expect(chart.locator('[data-radar-shape="complete"]')).toHaveAttribute('stroke','#ffffff')
  await expect(chart.locator('[data-radar-point="energyKcal"]')).toHaveAttribute('fill','#ffffff')
  await chart.click()
  const expandedList=page.getByRole('list',{name:'Daily goals'})
  await expect(expandedList).toHaveCSS('color','rgb(255, 255, 255)')
  await expect(expandedList.getByRole('img').first()).toHaveCSS('color','rgb(255, 255, 255)')
  const todayKey = await page.getByRole('navigation',{name:'Week navigation'})
    .locator('[aria-current="date"]').getAttribute('data-week-day')
  await page.goto('/calendar/' + todayKey)
  const calendarChart = page.getByRole('button',{name:'Show daily goal details'})
  await expect(calendarChart).toHaveAttribute('aria-expanded','false')
  await expect(page.getByRole('list',{name:'Daily goals'})).toBeHidden()
  for (const [code, expected] of [
    ['energyKcal','90%'],['proteinG','100%'],['fiberG','50%'],['fluidMl','50%'],['sodiumMg','90%']
  ]) {
    await expect(calendarChart.locator('[data-radar-label="'+code+'"]')).toContainText(expected)
  }
  await expect(calendarChart.locator('[data-radar-shape="complete"]')).toHaveCount(1)
  await calendarChart.click()
  await expect(page.getByRole('list',{name:'Daily goals'}).getByRole('listitem')).toHaveCount(5)
})

test('Today radar leaves metrics with missing coverage unplotted rather than zero', async ({page}) => {
  await onboard(page)
  await page.goto('/settings/goals')
  await page.getByLabel('Optional calorie target (kcal/day)').fill('1600')
  await page.getByLabel('Optional protein target (g/day)').fill('100')
  await page.getByRole('button',{name:'Save goals'}).click()
  await page.goto('/log/food')
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic incomplete radar entry')
  await page.getByLabel('Calories (kcal)').fill('1600')
  await page.getByRole('button',{name:'Add to log'}).click()
  await page.goto('/today')
  const radar = page.getByRole('button',{name:'Show daily goal details'})
  await expect(radar.locator('[data-radar-label="energyKcal"]')).toContainText('100%')
  await expect(radar.locator('[data-radar-label="proteinG"]')).toContainText('—')
  await expect(radar.locator('[data-radar-point="proteinG"]')).toHaveCount(0)
  await expect(radar.locator('[data-radar-shape="complete"]')).toHaveCount(0)
  const todayKey = await page.getByRole('navigation',{name:'Week navigation'})
    .locator('[aria-current="date"]').getAttribute('data-week-day')
  await page.goto('/calendar/' + todayKey)
  const calendarRadar = page.getByRole('button',{name:'Show daily goal details'})
  await expect(calendarRadar.locator('[data-radar-label="proteinG"]')).toContainText('—')
  await expect(calendarRadar.locator('[data-radar-point="proteinG"]')).toHaveCount(0)
})

test('completed daily goal alignment stays frozen after same-day target settings change', async ({page}) => {
  await onboard(page)
  await page.goto('/log')
  const today = (await page.getByRole('navigation',{name:'Week navigation'})
    .locator('[aria-current="date"]').getAttribute('data-week-day'))!
  await page.goto('/settings/goals')
  await page.getByLabel('Optional calorie target (kcal/day)').fill('2000')
  await page.getByRole('button',{name:'Save goals'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Goals saved.')
  await page.goto('/log/food?date=' + today)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic target meal')
  await page.getByLabel('Calories (kcal)').fill('2000')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')
  await page.goto('/log?date=' + today)
  await page.getByRole('button',{name:'Mark day complete'}).click()
  await page.getByRole('dialog').getByRole('button',{name:'Confirm complete and lock'}).click()
  await expect(page.getByRole('heading',{name:'Day complete · Read only'})).toBeVisible()
  await page.goto('/calendar/' + today)
  await page.getByRole('button',{name:'Show daily goal details'}).click()
  const assessment = page.getByRole('heading',{name:'Daily goal alignment'}).locator('..')
  const calories = page.getByRole('list',{name:'Daily goals'}).getByRole('listitem').filter({hasText:'Calories'})
  await expect(calories).toContainText('2,000 kcal / 2,000 kcal')
  await expect(calories.getByRole('img',{name:'Aligned'})).toBeVisible()
  await expect(page.getByRole('region',{name:'Day completion status'})).toContainText('Day completed.')
  await expect(assessment).not.toContainText('Review each rule and its source')
  await page.goto('/settings/goals')
  await page.getByLabel('Optional calorie target (kcal/day)').fill('1000')
  await page.getByRole('button',{name:'Save goals'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Goals saved.')
  await page.goto('/calendar/' + today)
  await page.getByRole('button',{name:'Show daily goal details'}).click()
  await expect(calories).toContainText('2,000 kcal / 2,000 kcal')
  await expect(calories.getByRole('img',{name:'Aligned'})).toBeVisible()
  await expect(calories).not.toContainText('1,000 kcal')
  await page.goto('/calendar/' + today)
  await page.getByRole('button',{name:'Show daily goal details'}).click()
  await page.getByRole('button',{name:'Reopen day'}).click()
  await expect(calories).toContainText('2,000 kcal / 1,000 kcal')
  await expect(calories.getByRole('img',{name:'Not evaluated'})).toBeVisible()
  await page.getByRole('button',{name:'Mark day complete'}).click()
  await page.getByRole('button',{name:'Confirm complete and lock'}).click()
  await expect(calories.getByRole('img',{name:'Significant deviation'})).toBeVisible()
  await expect(calories).toContainText('2,000 kcal / 1,000 kcal')
})

test('Calendar day details show an expandable radar with calories, fluid and sodium goal breakdown', async ({page}) => {
  await onboard(page)
  await page.goto('/log')
  const day = (await page.getByRole('navigation',{name:'Week navigation'})
    .locator('[aria-current="date"]').getAttribute('data-week-day'))!
  await page.goto('/settings/goals')
  await page.getByLabel('Optional calorie target (kcal/day)').fill('1600')
  await page.getByLabel('Fluid tracking target (ml/day)').fill('2300')
  await page.getByLabel('Optional sodium upper tracking limit (mg/day)').fill('2000')
  await page.getByRole('button', {name:'Save goals'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Goals saved.')

  await page.goto('/log/food?date=' + day)
  await page.getByRole('combobox', {name:'Name'}).fill('Synthetic daily meal')
  await page.getByLabel('Calories (kcal)').fill('1499.5')
  await page.getByLabel('Sodium (mg)').fill('1905.3')
  await page.getByRole('button', {name:'Add to log'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')
  await page.goto('/log/drink?date=' + day + '&water=1')
  await page.getByLabel('Volume (ml)').fill('1850')
  await page.getByRole('button', {name:'Save water'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Logged 1850 ml of water.')

  await page.goto('/log?date=' + day)
  await page.getByRole('button', {name:'Mark day complete'}).click()
  await page.getByRole('dialog').getByRole('button', {name:'Confirm complete and lock'}).click()
  await expect(page.getByRole('button', {name:'Reopen day'})).toBeVisible()
  await page.goto('/calendar/' + day)
  const calendarRadar = page.getByRole('button',{name:'Show daily goal details'})
  await expect(calendarRadar).toBeVisible()
  await expect(page.getByRole('list',{name:'Daily goals'})).toBeHidden()
  await expect(calendarRadar.locator('[data-radar-label="energyKcal"]')).toContainText('93.7%')
  await calendarRadar.click()

  const completion = page.getByRole('region', {name:'Day completion status'})
  const checklist = page.getByRole('list', {name:'Daily goals'})
  await expect(completion).toContainText('Day completed.')
  await expect(completion.getByRole('button', {name:'Reopen day'})).toHaveText('Reopen')
  await expect(checklist.getByRole('listitem')).toHaveCount(3)
  const calories = checklist.getByRole('listitem').filter({hasText:'Calories'})
  const fluids = checklist.getByRole('listitem').filter({hasText:'Fluid'})
  const sodium = checklist.getByRole('listitem').filter({hasText:'Sodium'})
  await expect(calories).toContainText('1,499.5 kcal / 1,600 kcal')
  await expect(calories.getByRole('img', {name:'Aligned'})).toBeVisible()
  await expect(calories.locator('svg[role="img"]')).toHaveCount(1)
  await expect(fluids).toContainText('1,850 ml / 2,300 ml')
  await expect(fluids.getByRole('img', {name:'Needs attention'})).toBeVisible()
  await expect(sodium).toContainText('1,905.3 mg / 2,000 mg')
  await expect(sodium.getByRole('img', {name:'Aligned'})).toBeVisible()
  await expect(checklist.locator('svg[role="img"]')).toHaveCount(3)
  await expect(checklist).not.toContainText(/✅|⚠️|❌|➖/)
  const assessment = page.getByRole('heading', {name:'Daily goal alignment'}).locator('..')
  await expect(assessment).not.toContainText('Coverage:')
  await expect(assessment).not.toContainText('Review each rule and its source')
  await expect(assessment).not.toContainText('These are versioned tracking rules')
  await expect(assessment.getByRole('button', {name:'Reopen day'})).toHaveCount(0)
})

test('fixed seven-day navigation uses circular dates and pill groups without horizontal scrolling', async ({page}) => {
  await onboard(page)
  await page.setViewportSize({width:320, height:720})
  await page.goto('/calendar/2026-01-15')
  const navigation = page.getByRole('navigation', {name:'Week navigation'})
  const days = navigation.getByRole('group',{name:'Week dates'}).locator('[data-week-day]')
  await expect(days).toHaveCount(7)
  await expect(days.nth(3)).toHaveAttribute('aria-current','date')
  await expect(days.nth(3)).toHaveAttribute('data-week-day','2026-01-15')
  const geometry = await days.evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect()
    const circle = element.querySelector('span.rounded-full')!
    return {
      x:bounds.x, y:bounds.y, width:bounds.width, height:bounds.height,
      paddingTop:getComputedStyle(element).paddingTop,
      paddingBottom:getComputedStyle(element).paddingBottom,
      gap:getComputedStyle(element).gap,
      outerRadius:getComputedStyle(element).borderTopLeftRadius,
      circleRadius:getComputedStyle(circle).borderTopLeftRadius,
      circleWidth:circle.getBoundingClientRect().width
    }
  }))
  expect(geometry).toHaveLength(7)
  expect(Math.max(...geometry.map(item => item.y)) - Math.min(...geometry.map(item => item.y))).toBeLessThan(2)
  expect(geometry.every(item => item.outerRadius === '9999px' && item.circleRadius === '9999px')).toBe(true)
  expect(geometry.every(item => item.circleWidth === 32)).toBe(true)
  expect(geometry.every(item => item.height === 72)).toBe(true)
  expect(geometry.every(item => item.paddingTop === '4px' && item.paddingBottom === '4px')).toBe(true)
  expect(geometry.every(item => item.gap === '4px')).toBe(true)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(2)
  await navigation.getByRole('link',{name:'2026-01-16 (Fri)'}).click()
  await expect(page).toHaveURL('/calendar/2026-01-16')
  await navigation.getByRole('button',{name:'Previous week'}).click()
  await expect(page).toHaveURL('/calendar/2026-01-09')
  await navigation.getByRole('button',{name:'Next week'}).click()
  await expect(page).toHaveURL('/calendar/2026-01-16')
  await navigation.getByRole('link',{name:'Go to today'}).click()
  const current = await page.evaluate(() => {
    const now = new Date()
    return now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0')
  })
  await expect(page).toHaveURL('/calendar/' + current)
})

test('future days and weeks are unavailable in Today, Calendar, and direct routes',async ({page}) => {
  await page.clock.install({time:new Date('2026-11-04T12:00:00Z')})
  await onboard(page)
  await page.goto('/today')
  const nav = page.getByRole('navigation',{name:'Week navigation'})
  const week = nav.getByRole('group',{name:'Week dates'})
  await expect(week.locator('[data-week-day]')).toHaveCount(7)
  await expect(week.locator('[data-week-day="2026-11-04"]')).toHaveAttribute('aria-current','date')
  await expect(week.locator('[data-week-day="2026-11-06"]')).toHaveAttribute('aria-disabled','true')
  await expect(nav.getByRole('button',{name:'Next week'})).toBeDisabled()
  await expect(nav.getByRole('link',{name:'2026-11-06 (Fri)'})).toHaveCount(0)
  await page.goto('/log?date=2026-11-04')
  const logWeek = page.getByRole('navigation',{name:'Week navigation'})
  await expect(logWeek.locator('[data-week-day="2026-11-06"]')).toHaveAttribute('aria-disabled','true')
  await expect(logWeek.getByRole('link',{name:'2026-11-06 (Fri)'})).toHaveCount(0)
  await expect(logWeek.getByRole('button',{name:'Next week'})).toBeDisabled()
  await page.goto('/calendar?month=2026-11')
  const month = page.getByRole('region',{name:'November 2026 monthly calendar'})
  await expect(month.getByLabel('2026-11-06: future date unavailable')).toBeVisible()
  await expect(month.getByRole('link',{name:/2026-11-06/})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Next month'})).toBeDisabled()
  await page.goto('/calendar/2026-11-06')
  await expect(page.getByRole('alert')).toContainText('Future dates are not selectable')
  await expect(page.getByRole('heading',{name:'2026-11-06',exact:true})).toHaveCount(0)
})

test('dedicated food, drink and exercise forms save and Calendar can edit/delete them',async({page})=>{
  await onboard(page)
  await page.goto('/log?date=2026-01-15')
  await page.getByRole('link',{name:'Food',exact:true}).click()
  await expect(page).toHaveURL(/\/log\/food\?date=2026-01-15$/)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic cabbage')
  await page.getByLabel('Calories (kcal)').fill('25')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByText('Intake entry saved.')).toBeVisible()
  await page.getByRole('link',{name:'Food',exact:true}).click()
  await page.getByRole('link',{name:'+ Synthetic cabbage'}).click()
  await expect(page.getByRole('combobox',{name:'Name'})).toHaveValue('Synthetic cabbage')
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('25')
  await page.getByRole('link',{name:/Back to Log/}).click()
  await page.getByRole('link',{name:'Exercise',exact:true}).click()
  await page.getByLabel('Duration (minutes)').fill('30')
  await page.getByLabel('Distance (km)').fill('2.5')
  await page.getByRole('button',{name:'Save exercise'}).click()
  await expect(page.getByText('Exercise saved.')).toBeVisible()
  await page.getByRole('link',{name:'Drink',exact:true}).click()
  await expect(page).toHaveURL(/\/log\/drink\?date=2026-01-15$/)
  await page.getByRole('link',{name:'Log plain water instead'}).click()
  await page.getByLabel('Volume (ml)').fill('250')
  await page.getByRole('button',{name:'Save water',exact:true}).click()
  await expect(page.getByText('Logged 250 ml of water.')).toBeVisible()
  await expect(page.getByRole('heading',{name:'Detailed entries'})).toHaveCount(0)
  await page.goto('/calendar/2026-01-15/nutrition')
  await expect(page.getByText('Synthetic cabbage')).toBeVisible()
  await page.getByRole('link',{name:'Edit / delete'}).first().click()
  await expect(page).toHaveURL(/\/log\/food\?date=2026-01-15&edit=/)
  await expect(page.getByRole('heading',{name:'Edit food'})).toBeVisible()
  await page.getByRole('button',{name:'Delete entry'}).click()
  await page.getByRole('button',{name:'Confirm delete'}).click()
  await expect(page).toHaveURL(/\/calendar\/2026-01-15$/)
  await page.goto('/calendar/2026-01-15/fluids')
  await expect(page.getByRole('heading',{name:'Drinks and water (1)'})).toBeVisible()
  await page.getByRole('link',{name:'Edit / delete'}).first().click()
  await expect(page).toHaveURL(/\/log\/drink\?date=2026-01-15&edit=/)
  await expect(page.getByRole('heading',{name:'Log water'})).toBeVisible()
  await expect(page.getByLabel('Volume (ml)')).toHaveValue('250')
  await page.getByRole('link',{name:/Back to Calendar/}).click()
  await page.goto('/calendar/2026-01-15/activity')
  await expect(page.getByText('Walking',{exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Edit / delete'}).last().click()
  await expect(page).toHaveURL(/\/log\/exercise\?date=2026-01-15&edit=/)
  await expect(page.getByRole('heading',{name:'Edit exercise'})).toBeVisible()
})

test('five illustrated Calendar cards route to their own detailed sections and keep nutritious drinks separate from water', async ({page}) => {
  await onboard(page)
  const day = '2026-01-15'
  await page.goto('/log/food?date=' + day)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic rice bowl')
  await page.getByLabel('Calories (kcal)').fill('310')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')

  await page.goto('/log/drink?date=' + day)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic fruit juice')
  await page.getByLabel('Calories (kcal)').fill('95')
  await page.getByLabel('Sugars (g)').fill('22')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')
  await page.goto('/log/drink?date=' + day + '&water=1')
  await page.getByRole('button',{name:'+ 250 ml'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Logged 250 ml of water.')

  await page.goto('/log/exercise?date=' + day)
  await page.getByLabel('Duration (minutes)').fill('30')
  await page.getByLabel('Distance (km)').fill('2.5')
  await page.getByRole('button',{name:'Save exercise'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Exercise saved.')
  await page.goto('/log?date=' + day)
  await page.getByRole('link',{name:'Weight',exact:true}).click()
  await expect(page).toHaveURL('/log/weight?date=' + day)
  await page.getByLabel('Weight (kg)').fill('71.5')
  await page.getByRole('button',{name:'Save weight'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Weight saved.')

  await page.setViewportSize({width:360,height:800})
  await page.goto('/calendar/' + day)
  const cards = page.getByRole('region',{name:'Day details by section'})
  await expect(cards.getByRole('link')).toHaveCount(5)
  await expect(cards.locator('svg[viewBox="0 0 64 64"]')).toHaveCount(5)
  await expect(page.getByRole('heading',{name:'Daily goal alignment'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Recorded nutrition and fluids'})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Detailed entries · ' + day})).toHaveCount(0)
  const energyCard = cards.getByRole('link',{name:/^Energy —/})
  const nutritionCard = cards.getByRole('link',{name:/^Nutrition —/})
  const fluidsCard = cards.getByRole('link',{name:/^Fluids —/})
  const activityCard = cards.getByRole('link',{name:/^Activity —/})
  const weightCard = cards.getByRole('link',{name:/^Weight —/})
  await expect(energyCard).toBeVisible()
  await expect(nutritionCard).toContainText('405 kcal')
  await expect(fluidsCard).toContainText('≥250 mL')
  await expect(activityCard).toContainText(/(?:≈ |≥)[\d,.]+ kcal/)
  await expect(weightCard).toContainText('71.5 kg')
  await expect(cards).not.toContainText('Est. difference:')
  for (const card of [energyCard, nutritionCard, fluidsCard, activityCard, weightCard]) {
    await expect(card.getByText('View details', {exact:true})).toBeVisible()
  }
  const layerStyles = await cards.getByRole('link').evaluateAll(links =>
    links.map(element => {
      const blob = element.querySelector('[data-card-layer="blob"]')!
      const illustration = element.querySelector('[data-card-layer="illustration"]')!
      const title = element.querySelector('h3')!
      const value = element.querySelector('p')!
      const pill = element.querySelector('span.rounded-full.border')!
      const circle = pill.querySelector('span.rounded-full')!
      const bounds = element.getBoundingClientRect()
      const blobBounds = blob.getBoundingClientRect()
      const iconBounds = illustration.getBoundingClientRect()
      return {
        centered: getComputedStyle(element).textAlign,
        blobPosition: getComputedStyle(blob).position,
        blobRight: bounds.right - blobBounds.right,
        blobTop: blobBounds.top - bounds.top,
        blobRadius: parseFloat(getComputedStyle(blob).borderTopLeftRadius),
        cardHeight: bounds.height,
        iconWidth: iconBounds.width,
        titleToValueGap: value.getBoundingClientRect().top - title.getBoundingClientRect().bottom,
        blobZ: getComputedStyle(blob).zIndex,
        iconPosition: getComputedStyle(illustration).position,
        iconZ: getComputedStyle(illustration).zIndex,
        titleZ: getComputedStyle(title).zIndex,
        valueZ: getComputedStyle(value).zIndex,
        pillZ: getComputedStyle(pill).zIndex,
        iconCenterDx: (iconBounds.left + iconBounds.width / 2) - (blobBounds.left + blobBounds.width / 2),
        iconCenterDy: (iconBounds.top + iconBounds.height / 2) - (blobBounds.top + blobBounds.height / 2),
        pillRadius: parseFloat(getComputedStyle(pill).borderTopLeftRadius),
        pillBorder: getComputedStyle(pill).borderTopWidth,
        pillBorderColor: getComputedStyle(pill).borderTopColor,
        pillBackground: getComputedStyle(pill).backgroundColor,
        circleBackground: getComputedStyle(circle).backgroundColor,
        circleWidth: circle.getBoundingClientRect().width,
        circleHeight: circle.getBoundingClientRect().height
      }
    }))
  expect(layerStyles).toHaveLength(5)
  for (const styling of layerStyles) {
    expect(styling.centered).toBe('center')
    expect(styling.blobPosition).toBe('absolute')
    // Blob is offset from the *card edge*, not its padded content box.
    expect(styling.blobRight).toBeGreaterThanOrEqual(-7)
    expect(styling.blobRight).toBeLessThanOrEqual(-3)
    expect(styling.blobTop).toBeGreaterThanOrEqual(-7)
    expect(styling.blobTop).toBeLessThanOrEqual(-3)
    expect(styling.blobRadius).toBeGreaterThanOrEqual(48)
    expect(styling.cardHeight).toBeGreaterThanOrEqual(216)
    expect(styling.cardHeight).toBeLessThanOrEqual(230)
    expect(styling.iconWidth).toBe(56)
    expect(styling.titleToValueGap).toBeGreaterThanOrEqual(0)
    expect(styling.titleToValueGap).toBeLessThanOrEqual(4)
    expect(styling.blobZ).toBe('0')
    expect(styling.iconPosition).toBe('absolute')
    for (const z of [styling.iconZ, styling.titleZ, styling.valueZ, styling.pillZ]) {
      expect(z).toBe('10')
    }
    expect(Math.abs(styling.iconCenterDx)).toBeLessThan(2)
    expect(Math.abs(styling.iconCenterDy)).toBeLessThan(2)
    expect(styling.pillRadius).toBeGreaterThan(18)
    expect(styling.pillBorder).toBe('1px')
    expect(styling.pillBorderColor).toBe(styling.circleBackground)
    expect(styling.pillBackground).not.toBe(styling.circleBackground)
    expect(styling.circleWidth).toBe(styling.circleHeight)
  }
  const widths = await cards.getByRole('link').evaluateAll(links =>
    links.slice(0,4).map(link => link.getBoundingClientRect().width))
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(2)
  const bounds = await page.evaluate(() => ({document: document.documentElement.scrollWidth, viewport: window.innerWidth}))
  expect(bounds.document).toBeLessThanOrEqual(bounds.viewport + 2)
  await page.setViewportSize({width:320,height:800})
  const narrowBounds = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth, viewport: window.innerWidth
  }))
  expect(narrowBounds.document).toBeLessThanOrEqual(narrowBounds.viewport + 2)
  await expect(cards.locator('[data-card-layer="blob"]')).toHaveCount(5)
  await expect(cards.locator('[data-card-layer="illustration"] svg')).toHaveCount(5)

  await cards.getByRole('link',{name:/^Energy —/}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/energy')
  await expect(page.getByRole('heading',{name:'Recorded intake and estimated energy'})).toBeVisible()
  await page.getByRole('link',{name:/Back to day details/}).click()

  await page.getByRole('link',{name:/^Nutrition —/}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/nutrition')
  await expect(page.getByRole('heading',{name:'Nutrients',exact:true})).toBeVisible()
  await expect(page.getByText('Synthetic rice bowl')).toBeVisible()
  await expect(page.getByRole('heading',{name:'Other drinks (1)'})).toBeVisible()
  await expect(page.getByText('Synthetic fruit juice')).toBeVisible()
  await expect(page.getByText('Water',{exact:true})).toHaveCount(0)
  await page.getByRole('link',{name:/Sugars \(g\)/}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/nutrients/sugarsG')
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic fruit juice'})
    .getByText('22 g',{exact:true})).toBeVisible()
  await page.getByRole('link',{name:/Back to nutrition/}).click()
  await page.getByRole('link',{name:/Back to day details/}).click()

  await page.getByRole('link',{name:/^Fluids —/}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/fluids')
  await expect(page.getByRole('heading',{name:'Drinks and water (2)'})).toBeVisible()
  await expect(page.getByText('Synthetic fruit juice')).toBeVisible()
  await expect(page.getByText('Water',{exact:true})).toBeVisible()
  await expect(page.getByRole('region',{name:'Daily fluid total'})).toContainText('250 ml')
  await page.getByRole('link',{name:/Back to day details/}).click()

  await page.getByRole('link',{name:/^Activity —/}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/activity')
  await expect(page.getByRole('heading',{name:'Logged activity'})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Exercise (1)'})).toBeVisible()
  await page.getByRole('link',{name:/Back to day details/}).click()

  await page.getByRole('link',{name:/^Weight —/}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/weight')
  await expect(page.getByRole('heading',{name:'Measured weight (1)'})).toBeVisible()
  await expect(page.getByText('71.5 kg measured')).toBeVisible()
  await page.goto('/calendar/2026-01-14')
  const emptyCards = page.getByRole('region',{name:'Day details by section'})
  await expect(emptyCards.getByRole('link',{name:/^Weight — No record/})).toBeVisible()
  await expect(emptyCards.getByRole('link',{name:/^Activity — —/})).toBeVisible()
  await expect(emptyCards.getByRole('link',{name:/^Nutrition — —/})).toBeVisible()
  await page.goto('/calendar/' + day + '/unsupported')
  await expect(page.getByRole('alert')).toContainText('Invalid date or section')
})

test('Calendar nutrition has flat full-width calories and seven centered pastel nutrient tiles', async ({page}) => {
  await onboard(page)
  const day = '2026-01-15'
  await page.goto('/log/food?date=' + day)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic nutrition layout meal')
  await page.getByLabel('Calories (kcal)').fill('1499.5')
  await page.getByLabel('Protein (g)').fill('90.2')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')

  await page.setViewportSize({width:320,height:720})
  await page.goto('/calendar/' + day + '/nutrition')
  await expect(page.getByRole('heading',{name:'Recorded nutrition',exact:true})).toHaveCount(0)
  await expect(page.getByText('1 foods · 0 other drinks')).toHaveCount(0)
  const summary = page.getByRole('region',{name:'Nutrition summary'})
  const calories = page.getByRole('region',{name:'Calories consumed'})
  const nutrients = page.getByRole('region',{name:'Nutrients'})
  await expect(calories.getByRole('heading',{name:'Calories consumed'})).toHaveClass(/text-lg/)
  await expect(calories.getByRole('heading',{name:'Calories consumed'})).toHaveClass(/font-semibold/)
  await expect(nutrients.getByRole('heading',{name:'Nutrients'})).toHaveClass(/text-lg/)
  await expect(nutrients.getByRole('heading',{name:'Nutrients'})).toHaveClass(/font-semibold/)
  await expect(calories).toContainText('1,499.5 kcal')
  const dimensions = await page.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth, viewport: window.innerWidth
  }))
  expect(dimensions.docWidth).toBeLessThanOrEqual(dimensions.viewport + 2)
  const sectionStyles = await summary.evaluate(element => {
    const outer = element.getBoundingClientRect()
    const kcal = element.querySelector('[aria-labelledby="calories-consumed-heading"]')!
    const nutrientContainer = element.querySelector('[aria-labelledby="nutrients-heading"]')!
    return {
      outerWidth: outer.width,
      caloriesWidth: kcal.getBoundingClientRect().width,
      caloriesBorder: getComputedStyle(kcal).borderTopWidth,
      nutrientsBorder: getComputedStyle(nutrientContainer).borderTopWidth,
      caloriesBackground: getComputedStyle(kcal).backgroundColor,
      nutrientsBackground: getComputedStyle(nutrientContainer).backgroundColor
    }
  })
  expect(Math.abs(sectionStyles.outerWidth - sectionStyles.caloriesWidth)).toBeLessThan(2)
  expect(sectionStyles.caloriesBorder).toBe('0px')
  expect(sectionStyles.nutrientsBorder).toBe('0px')
  expect(sectionStyles.caloriesBackground).toBe('rgba(0, 0, 0, 0)')
  expect(sectionStyles.nutrientsBackground).toBe('rgba(0, 0, 0, 0)')

  const cards = nutrients.getByRole('link')
  await expect(cards).toHaveCount(7)
  const styles = await cards.evaluateAll(elements => elements.map(element => ({
    color: getComputedStyle(element).backgroundColor,
    textAlign: getComputedStyle(element).textAlign
  })))
  expect(styles.every(item => item.textAlign === 'center')).toBe(true)
  expect(new Set(styles.map(item => item.color)).size).toBe(7)
  await expect(cards.filter({hasText:'Protein (g)'})).toContainText('90.2 g')
  await cards.filter({hasText:'Protein (g)'}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/nutrients/proteinG')
  await page.getByRole('link',{name:/Back to nutrition/}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/nutrition')
  await expect(page.getByRole('heading',{name:'Foods and meals (1)'})).toBeVisible()
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
  await page.goto('/calendar/2026-01-15/nutrition')
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
  await page.goto('/calendar/2026-01-15/nutrition')
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
  await page.goto('/calendar/2026-01-15/nutrition')
  const after=page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(after).not.toContainText('79.2%')
  await expect(after).toContainText('49.1 g')
  await expect(after).toContainText('50.0%')
})

test('plain water never reduces nutrient coverage while fluid volume still accumulates', async ({page}) => {
  await onboard(page)
  const day = '2026-01-15'
  await page.goto('/settings/preferences')
  await page.getByLabel('Sodium upper limit (mg/day)').fill('2000')
  await page.getByRole('button',{name:'Save nutrient limits'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Nutrient comparison limits saved.')
  await page.goto('/log/food?date=' + day)
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic known sodium meal')
  await page.getByLabel('Sodium (mg)').fill('1905.3')
  await page.getByLabel('Calories (kcal)').fill('450')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page).toHaveURL(/\/log\?date=2026-01-15$/)
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')
  for (let i = 0; i < 3; i++) {
    await page.goto('/log/drink?date=' + day + '&water=1')
    await page.getByRole('button',{name:'+ 250 ml'}).click()
    await expect(page.getByTestId('app-toast')).toContainText('Logged 250 ml of water.')
  }
  await page.goto('/calendar/' + day + '/nutrition')
  const summary = page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(summary.getByRole('link',{name:/Sodium \(mg\)/})).toContainText('1,905.3 mg (95.3%)')
  await expect(summary.getByRole('link',{name:/Sodium \(mg\)/})).not.toContainText('At least')
  await expect(page.getByRole('heading',{name:'Other drinks (0)'})).toBeVisible()
  await page.goto('/calendar/' + day + '/fluids')
  await expect(page.getByRole('region',{name:'Daily fluid total'})).toContainText('750 ml')
  await expect(page.getByRole('heading',{name:'Drinks and water (3)'})).toBeVisible()
  const drinks = page.getByRole('heading',{name:'Drinks and water (3)'}).locator('..')
  await expect(drinks).not.toContainText('Calories')
  await page.goto('/calendar/' + day + '/nutrition')
  await summary.getByRole('link',{name:/Sodium \(mg\)/}).click()
  await expect(page).toHaveURL('/calendar/' + day + '/nutrients/sodiumMg')
  await expect(page.getByRole('heading',{name:'Other drinks (0)'})).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('region',{name:'Recorded nutrient total'})).toContainText('1,905.3 mg')
  await expect(page.getByRole('region',{name:'Recorded nutrient total'})).not.toContainText('At least')
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
  await page.goto('/calendar/2026-01-15/nutrition')
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
  await page.goto('/calendar/2026-01-15/nutrition')
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
  await page.goto('/calendar/2026-01-15/nutrition')
  const updated = page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..')
  await expect(updated.getByText('Carbs (g)',{exact:true}).locator('..')).toContainText('≥50.0%')
  await expect(updated.getByText('Sugars (g)',{exact:true}).locator('..')).not.toContainText('%')
  await expect(updated.getByText('Sodium (mg)',{exact:true}).locator('..')).toContainText('≥80.0%')
  await page.goto('/settings/preferences')
  await page.getByLabel('Carbs upper limit (g/day)').fill('')
  await page.getByRole('button',{name:'Save nutrient limits'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Nutrient comparison limits saved.')
  await page.goto('/calendar/2026-01-15/nutrition')
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
  await page.goto('/calendar/' + date + '/nutrition')
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
  await expect(page.getByRole('heading',{name:'Other drinks (1)'})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic lentils'}).getByText('12.5 g',{exact:true})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic crackers'}).getByText('-',{exact:true})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic tea'}).getByText('0 g',{exact:true})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Water'})).toHaveCount(0)
  await expect(page.getByRole('region',{name:'Recorded nutrient total'})).toContainText('At least 12.5 g')
  const dimensions = await page.evaluate(() => ({document:document.documentElement.scrollWidth,viewport:window.innerWidth}))
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2)

  await page.getByRole('link',{name:/Back to nutrition/}).click()
  await expect(page).toHaveURL('/calendar/' + date + '/nutrition')
  await page.getByRole('heading',{name:'Nutrients',exact:true}).locator('..').getByRole('link',{name:/Sodium \(mg\)/}).click()
  await expect(page).toHaveURL('/calendar/' + date + '/nutrients/sodiumMg')
  await expect(page.getByRole('listitem').filter({hasText:'Synthetic tea'}).getByText('50 mg',{exact:true})).toBeVisible()
  await expect(page.getByRole('listitem').filter({hasText:'Water'})).toHaveCount(0)

  await page.getByRole('listitem').filter({hasText:'Synthetic lentils'}).getByRole('link',{name:'Edit entry'}).click()
  await expect(page.getByRole('heading',{name:'Edit food'})).toBeVisible()
  await page.goto('/calendar/' + date + '/nutrients/notAField')
  await expect(page.getByRole('alert')).toContainText('Invalid date or nutrient')
})

test('walking and running derive any third pace value live and require two supplied values', async ({page}) => {
  await onboard(page)
  await page.goto('/log/exercise?date=2026-01-15')
  const day = '2026-01-15'
  const activity = page.getByLabel('Activity')
  const duration = page.getByLabel('Duration (minutes)')
  const distance = page.getByLabel('Distance (km)')
  const speed = page.getByLabel('Speed (km/h)')
  const incline = page.getByLabel('Incline (°, uphill only)')
  await expect(page.getByLabel(/Intensity/)).toHaveCount(0)
  await page.getByRole('button',{name:'Save exercise'}).click()
  await expect(page.getByRole('alert')).toContainText('at least two valid values')
  await distance.fill('3')
  await expect(duration).toHaveValue('')
  await expect(speed).toHaveValue('')
  await page.getByRole('button',{name:'Save exercise'}).click()
  await expect(page.getByRole('alert')).toContainText('at least two valid values')
  await duration.fill('30')
  await expect(speed).toHaveValue('6')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await distance.fill('4')
  await expect(speed).toHaveValue('8')
  await speed.fill('5')
  await expect(duration).toHaveValue('48')
  await duration.fill('30')
  await expect(distance).toHaveValue('2.5')
  await speed.fill('')
  await expect(distance).toHaveValue('')
  await expect(duration).toHaveValue('30')
  await speed.fill('5')
  await expect(distance).toHaveValue('2.5')
  await incline.fill('2.8624')
  await expect(page.getByText(/≈ .* kcal/).first()).toBeVisible()
  await page.getByRole('button',{name:'Save exercise'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Exercise saved.')
  await page.goto('/calendar/'+day+'/activity')
  await expect(page.getByText('30 min')).toBeVisible()
  await expect(page.getByText('2.5 km')).toBeVisible()
  await expect(page.getByText('5 km/h')).toBeVisible()
  await page.getByRole('heading',{name:'Walking',exact:true}).locator('..')
    .getByRole('link',{name:'Edit / delete'}).click()
  await expect(duration).toHaveValue('30')
  await expect(distance).toHaveValue('2.5')
  await expect(speed).toHaveValue('5')
  await speed.fill('6')
  await expect(duration).toHaveValue('25')
  await page.getByRole('button',{name:'Save changes'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Exercise updated.')

  await page.goto('/log/exercise?date='+day)
  await activity.selectOption('Running')
  await duration.fill('30')
  await speed.fill('12')
  await expect(distance).toHaveValue('6')
  await distance.fill('3')
  await expect(duration).toHaveValue('15')
  await duration.fill('20')
  await expect(speed).toHaveValue('9')
  await incline.fill('2.8624')
  await page.getByRole('button',{name:'Save exercise'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Exercise saved.')
  await page.goto('/calendar/'+day+'/activity')
  await expect(page.getByText('20 min')).toBeVisible()
  await expect(page.getByText('3 km')).toBeVisible()
  await expect(page.getByText('9 km/h')).toBeVisible()
})

test('save confirmations appear as dismissible transient toasts outside the Log form', async ({page}) => {
  await onboard(page)
  // Onboarding records today's initial weight; use an unlogged historical date.
  await page.goto('/log?date=2026-01-15')
  await page.getByRole('link',{name:'Weight',exact:true}).click()
  await expect(page).toHaveURL('/log/weight?date=2026-01-15')
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
  await page.getByRole('link',{name:'Food',exact:true}).click()
  await page.getByLabel('Name',{exact:true}).fill('Synthetic cereal')
  await page.getByLabel('Amount consumed').fill('1.5')
  await page.getByLabel('Calories (kcal)').fill('230')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByText('Intake entry saved.')).toBeVisible()
  await page.goto('/log/drink?water=1')
  await page.getByRole('button',{name:'+ 250 ml'}).click()
  await expect(page.getByText('Logged 250 ml of water.')).toBeVisible()

  await page.goto('/today')
  await expect(page.getByRole('region',{name:'Day details by section'})
    .getByRole('link',{name:/^Nutrition — 345 kcal/})).toBeVisible()
  await expect(page.getByRole('region',{name:'Day details by section'})
    .getByRole('link',{name:/^Fluids — 250 mL/})).toBeVisible()

  // Register and activate service worker before cutting the network.
  await page.evaluate(async()=>{await navigator.serviceWorker.ready})
  await page.reload()
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.reload({waitUntil:'domcontentloaded'})
  await expect(page.getByRole('heading',{name:'Daily goal alignment'})).toBeVisible()
  await expect(page.getByRole('link',{name:/^Nutrition — 345 kcal/})).toBeVisible()
  await expect(page.getByRole('link',{name:/^Fluids — 250 mL/})).toBeVisible()
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
  await expect(page.getByRole('heading',{name:'Daily goal alignment'})).toBeVisible()
  await page.goto('/today')
  await expect(page.getByRole('link',{name:/^Fluids — 350 mL/})).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link',{name:/^Fluids — 350 mL/})).toBeVisible()
})

async function onboardAfterReset(page:Page){
  await page.getByRole('textbox',{name:'Date of birth'}).fill('1990-03-12')
  await page.getByLabel('Height (cm)').fill('170')
  await page.getByLabel(/Initial measured weight/).fill('72')
  await page.getByLabel('Primary goal').selectOption('maintain')
  await page.getByRole('button',{name:'Create local profile'}).click()
  await expect(page.getByRole('heading',{name:'Daily goal alignment'})).toBeVisible()
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
  await expect(page.getByRole('link',{name:/^Fluids — 500 mL/})).toBeVisible()
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
  await expect(page.getByRole('link',{name:/^Fluids — 150 mL/})).toBeVisible()
  await page.reload({waitUntil: 'domcontentloaded'})
  await expect(page.getByRole('link',{name:/^Fluids — 150 mL/})).toBeVisible()
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
  await page.getByRole('link',{name:'About this page: day detail'}).click()
  await expect(page).toHaveURL(/\/settings\/docs\/day-detail$/)
  await expect(page.getByRole('heading',{name:'Day details and explainable rules'})).toBeVisible()
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
  await page.getByRole('link', {name: 'Food', exact: true}).click()
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

test('Saved food and drinks opens from Log with separate tabbed cards and keeps the chosen date', async ({page}) => {
  await onboard(page)
  const day = '2026-01-15'
  await page.setViewportSize({width:320,height:720})
  await page.goto('/log?date=' + day)
  await expect(page.getByRole('link',{name:'Saved food and drinks'})).toHaveAttribute(
    'href','/log/saved-foods?date=' + day
  )
  await page.getByRole('link',{name:'Saved food and drinks'}).click()
  await expect(page).toHaveURL('/log/saved-foods?date=' + day)
  await expect(page.getByRole('heading',{name:'Saved foods and drinks'})).toBeVisible()
  const foods = page.getByRole('tab',{name:'Foods'})
  const drinks = page.getByRole('tab',{name:'Drinks'})
  await expect(foods).toHaveAttribute('aria-selected','true')
  await expect(drinks).toHaveAttribute('aria-selected','false')
  const tablist = page.getByRole('tablist',{name:'Saved item categories'})
  await expect(tablist).toHaveCSS('border-top-left-radius','9999px')
  await expect(tablist).toHaveCSS('border-top-width','2px')
  await expect(tablist).toHaveCSS('column-gap','0px')
  await expect(tablist).toHaveCSS('padding','0px')
  await expect(foods).toHaveCSS('border-top-left-radius','9999px')
  await expect(foods).toHaveCSS('background-color','rgb(15, 118, 110)')
  await expect(foods).toHaveCSS('color','rgb(255, 255, 255)')
  const panel = page.getByRole('tabpanel')
  await expect(panel).toHaveAttribute('aria-labelledby',await foods.getAttribute('id') ?? '')
  await expect(panel).toContainText('No saved foods yet.')
  await page.getByRole('button',{name:'+ Save a food'}).click()
  await expect(page.getByRole('combobox',{name:'Product type'})).toHaveValue('food')
  await page.getByLabel('Product name').fill('Synthetic apple')
  await page.getByLabel('Calories (kcal)').fill('92')
  await page.getByRole('button',{name:'Save label'}).click()
  await expect(panel.getByRole('heading',{name:'Synthetic apple'})).toBeVisible()
  await drinks.click()
  await expect(drinks).toHaveAttribute('aria-selected','true')
  await expect(drinks).toHaveCSS('background-color','rgb(15, 118, 110)')
  await expect(drinks).toHaveCSS('color','rgb(255, 255, 255)')
  await expect(foods).not.toHaveCSS('background-color','rgb(15, 118, 110)')
  await expect(panel).toContainText('No saved drinks yet.')
  await expect(panel.getByRole('heading',{name:'Synthetic apple'})).toHaveCount(0)
  await page.getByRole('button',{name:'+ Save a drink'}).click()
  await expect(page.getByRole('combobox',{name:'Product type'})).toHaveValue('beverage')
  await page.getByLabel('Product name').fill('Synthetic juice')
  await page.getByLabel('Calories (kcal)').fill('45')
  await page.getByLabel('Fluid volume per reference portion (ml)').fill('220')
  await page.getByRole('button',{name:'Save label'}).click()
  await expect(panel.getByRole('heading',{name:'Synthetic juice'})).toBeVisible()
  await foods.click()
  await expect(panel.getByRole('heading',{name:'Synthetic apple'})).toBeVisible()
  await expect(panel.getByRole('heading',{name:'Synthetic juice'})).toHaveCount(0)
  await panel.getByRole('button',{name:'Log this'}).click()
  await expect(page).toHaveURL(url => url.pathname === '/log/food' &&
    url.searchParams.get('date') === day && Boolean(url.searchParams.get('saved')))
  await expect(page.getByRole('combobox',{name:'Name'})).toHaveValue('Synthetic apple')
  await expect(page.getByRole('link',{name:'Manage saved foods and drinks'})).toHaveCount(0)
  await page.goto('/log/drink?date='+day)
  await expect(page.getByRole('link',{name:'Manage saved foods and drinks'})).toHaveCount(0)
  await page.goto('/log/saved-foods?date='+day)
  await expect(page.getByRole('tab',{name:'Foods'})).toHaveAttribute('aria-selected','true')
  await page.getByRole('link',{name:/Back to Log/}).click()
  await expect(page).toHaveURL('/log?date='+day)
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(2)
})

test('saved foods remain selectable locally without online lookup', async ({page}) => {
  await onboard(page)
  let onlineSearches = 0
  await page.route('https://world.openfoodfacts.org/cgi/search.pl?**', async route => {
    onlineSearches++
    await route.abort()
  })
  await page.goto('/log/saved-foods')
  await page.getByRole('tab',{name:'Foods'}).click()
  await page.getByRole('button', {name: '+ Save a food'}).click()
  await page.getByLabel('Product name').fill('Synthetic offline rice')
  await page.getByLabel('Brand (optional)').fill('Synthetic')
  await page.getByRole('combobox', {name: 'Label values per'}).selectOption('100g')
  await page.getByLabel('Calories (kcal)').fill('130')
  await page.getByRole('button', {name: 'Save label'}).click()
  await expect(page.getByText('Label saved.')).toBeVisible()

  await page.getByRole('link', {name: /Back to Log/}).click()
  await page.getByRole('link', {name:'Food',exact:true}).click()
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
  await page.getByRole('tab',{name:'Drinks'}).click()
  await page.getByRole('button', {name: '+ Save a drink'}).click()
  await page.getByLabel('Product name').fill('Synthetic serving drink')
  await expect(page.getByRole('combobox',{name:'Product type'})).toHaveValue('beverage')
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
  await expect(page.getByRole('link',{name:/^Nutrition — 100 kcal/})).toBeVisible()
  await expect(page.getByRole('link',{name:/^Fluids — 500 mL/})).toBeVisible()
})

test('offline USDA cabbage preparation dropdown autofills per-100-g and scales the eaten weight', async ({page, context}) => {
  await onboard(page)
  await page.goto('/today')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.goto('/log', {waitUntil:'domcontentloaded'})
  await page.getByRole('link', {name:'Food',exact:true}).click()
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
  await page.getByRole('link', {name:'Food',exact:true}).click()
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
  await page.getByRole('link', {name:'Food',exact:true}).click()
  await page.getByRole('combobox', {name:'Name'}).fill('blanched cabbage')
  await expect(page.getByText(/not an exact measurement of blanched cabbage/)).toBeVisible()
  await expect(page.getByRole('combobox', {name:'Ingredient variety / preparation'}).locator('option[value="169976"]')).toBeAttached()
})


test('Food and Drink camera fills label fields locally and moves above navigation as the user scrolls', async ({page}) => {
  await page.addInitScript(() => {
    (window as unknown as { Tesseract: unknown }).Tesseract = {
      createWorker: async () => ({
        recognize: async (file: File) => ({data:{text: file.name.includes('drink')
          ? 'Nutrition Facts\nServing Size 330 ml\nCalories 145\nTotal Sugars 35g\nSodium 0.04g'
          : 'Nutrition Facts\nAmount per 100 g\nCalories 210\nProtein 12g\nTotal Fat 6g\nSodium 250mg'}}),
        terminate: async () => {}
      })
    }
  })
  await onboard(page)
  await page.setViewportSize({width:320,height:720})
  await page.goto('/log/food?date=2026-01-15')
  const camera = page.getByRole('button',{name:'Scan nutrition label'})
  await expect(camera).toBeVisible()
  await expect(camera).toHaveAttribute('data-compact','false')
  await expect(camera.locator('svg[stroke="white"]')).toBeVisible()
  const expanded = await camera.locator('span.rounded-full').boundingBox()
  expect(expanded?.width).toBe(72)
  await page.evaluate(() => window.scrollTo(0,document.body.scrollHeight))
  await expect(camera).toHaveAttribute('data-compact','true')
  const compact = await camera.locator('span.rounded-full').boundingBox()
  expect(compact?.width).toBe(36)
  const position = await page.evaluate(() => ({
    camera:document.querySelector('[data-camera-fab]')!.getBoundingClientRect().toJSON(),
    nav:document.querySelector('nav[aria-label="Primary navigation"]')!.getBoundingClientRect().toJSON(),
    viewport:innerWidth
  }))
  expect(position.camera.bottom).toBeLessThan(position.nav.top)
  expect(position.camera.right).toBeLessThanOrEqual(position.viewport-12)
  await page.evaluate(()=>window.scrollBy(0,-300))
  await expect(camera).toHaveAttribute('data-compact','false')
  const restore = await camera.locator('span.rounded-full').boundingBox()
  expect(restore?.width).toBe(72)

  const picture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR9sAAAAASUVORK5CYII=','base64')
  await page.getByLabel('Nutrition label photo').setInputFiles({
    name:'food-label.png',mimeType:'image/png',buffer:picture
  })
  await expect(page.getByRole('status')).toContainText('Filled 4 recognized nutrition values.')
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('210')
  await expect(page.getByLabel('Protein (g)')).toHaveValue('12')
  await expect(page.getByLabel('Fat (g)',{exact:true})).toHaveValue('6')
  await expect(page.getByLabel('Sodium (mg)')).toHaveValue('250')
  await expect(page.getByLabel('Sugars (g)')).toHaveValue('')
  await expect(page.getByLabel('Nutrition is per')).toHaveValue('100g')
  await expect(page.getByLabel('Amount consumed')).toHaveValue('100')
  await page.getByRole('combobox',{name:'Name'}).fill('Synthetic scanned label')
  await page.getByRole('button',{name:'Add to log'}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Intake entry saved.')

  await page.goto('/log/drink?date=2026-01-15')
  await expect(camera).toHaveAttribute('data-compact','false')
  await page.getByLabel('Nutrition label photo').setInputFiles({
    name:'drink-label.png',mimeType:'image/png',buffer:picture
  })
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('145')
  await expect(page.getByLabel('Sugars (g)')).toHaveValue('35')
  await expect(page.getByLabel('Sodium (mg)')).toHaveValue('40')
  await expect(page.getByLabel('Nutrition is per')).toHaveValue('custom')
  await expect(page.getByLabel('Label quantity')).toHaveValue('330')
  await expect(page.getByLabel('Label unit')).toHaveValue('ml')
  await expect(page.getByLabel('Amount consumed')).toHaveValue('330')
  await expect(page.getByLabel('Consumed unit')).toHaveValue('ml')
  await page.goto('/log/drink?date=2026-01-15&water=1')
  await expect(page.getByRole('button',{name:'Scan nutrition label'})).toHaveCount(0)
})

test('real same-origin OCR recognizes a synthetic printed label on device', async ({page}) => {
  test.setTimeout(120000)
  await onboard(page)
  await page.goto('/log/food?date=2026-01-15')
  // Generate a synthetic label: no real personal data or photographed records.
  const pixels = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width=1200
    canvas.height=520
    const context=canvas.getContext('2d')!
    context.fillStyle='#ffffff'
    context.fillRect(0,0,1200,520)
    context.fillStyle='#111111'
    context.font='bold 78px Arial'
    context.fillText('Calories 240',70,135)
    context.fillText('Protein 12g',70,265)
    context.fillText('Sodium 250mg',70,395)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const outsideRequests:string[]=[]
  page.on('request',request => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) outsideRequests.push(request.url())
  })
  await page.getByLabel('Nutrition label photo').setInputFiles({
    name:'synthetic-nutrition.png',mimeType:'image/png',buffer:Buffer.from(pixels,'base64')
  })
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('240',{timeout:90000})
  await expect(page.getByLabel('Protein (g)')).toHaveValue('12')
  await expect(page.getByLabel('Sodium (mg)')).toHaveValue('250')
  expect(outsideRequests).toEqual([])
})

test('PWA serves nutrition OCR assets from its own origin', async ({page})=>{
  await onboard(page)
  for (const path of [
    '/ocr/tesseract.min.js','/ocr/worker.min.js',
    '/ocr/core/tesseract-core-lstm.wasm.js',
    '/ocr/core/tesseract-core-lstm.wasm',
    '/ocr/lang/eng.traineddata.gz'
  ]) {
    const resource = await page.request.get(path)
    expect(resource.ok(),path).toBe(true)
  }
})

test('dedicated logging forms are unboxed with no repeated card headings', async ({page}) => {
  await onboard(page)
  const day='2026-01-15'
  for (const [path, title, fieldLabel] of [
    ['/log/food', 'Add food', 'Name'],
    ['/log/drink', 'Add drink', 'Name'],
    ['/log/exercise', 'Add exercise', 'Activity'],
    ['/log/weight', 'Log weight', 'Weight (kg)']
  ] as const) {
    await page.goto(path+'?date='+day)
    await expect(page.getByRole('heading',{name:title,exact:true})).toHaveCount(1)
    const field=page.getByLabel(fieldLabel,{exact:true})
    const form=page.locator('#main-content form')
    await expect(form).toHaveCount(1)
    await expect(form).toHaveCSS('background-color','rgba(0, 0, 0, 0)')
    await expect(form).toHaveCSS('border-top-width','0px')
    await expect(form).toHaveCSS('padding-left','0px')
    await expect(field).toBeVisible()
  }
  await expect(page.getByRole('heading',{name:'Weight',exact:true})).toHaveCount(0)
  await expect(page.getByRole('region',{name:'Measured weight'})).toBeVisible()

  await page.goto('/log/drink?date='+day+'&water=1')
  await expect(page.getByRole('heading',{name:'Log water',exact:true})).toHaveCount(1)
  const waterForm=page.locator('form').filter({has:page.getByLabel('Volume (ml)')})
  await expect(waterForm).toHaveCount(1)
  await expect(waterForm).toHaveCSS('background-color','rgba(0, 0, 0, 0)')
  await expect(waterForm).toHaveCSS('border-top-width','0px')
  await expect(page.getByRole('region',{name:'Water logging'})).toBeVisible()
  await page.getByLabel('Volume (ml)').fill('350')
  await page.getByRole('button',{name:'Save water',exact:true}).click()
  await expect(page.getByTestId('app-toast')).toContainText('Logged 350 ml of water.')
})

test('Today and Log show seven day pills while dedicated input pages keep date inputs', async ({page}) => {
  await onboard(page)
  await page.goto('/today')
  await expect(page.locator('h1')).toHaveClass(/sr-only/)
  await expect(page.getByRole('navigation',{name:'Week navigation'}).locator('[data-week-day]')).toHaveCount(7)
  await expect(page.getByLabel('Date',{exact:true})).toHaveCount(0)

  await page.goto('/log?date=2026-01-15')
  const week = page.getByRole('navigation',{name:'Week navigation'})
  await expect(week.locator('[data-week-day]')).toHaveCount(7)
  await expect(week.locator('[data-week-day="2026-01-15"]')).toHaveAttribute('aria-current','date')
  await expect(page.getByLabel('Date',{exact:true})).toHaveCount(0)
  for (const [name,route] of [['Food','food'],['Drink','drink'],['Exercise','exercise']] as const) {
    await page.getByRole('link',{name,exact:true}).click()
    await expect(page).toHaveURL('/log/'+route+'?date=2026-01-15')
    await expect(page.getByLabel('Date',{exact:true})).toHaveCount(1)
    await expect(page.getByLabel('Date',{exact:true})).toHaveValue('2026-01-15')
    await page.getByRole('link',{name:/Back to Log/}).click()
  }
})
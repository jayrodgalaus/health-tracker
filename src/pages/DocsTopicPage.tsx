import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DOCS_TOPICS, type DocsTopicId } from './docsTopics'

// Preserve the original documentation wording. Routes display one chapter at a time.
const DOCS_CONTENT: Record<DocsTopicId, ReactNode> = {
  'today': (
    <>

      <p><strong>Today</strong> displays the selected local calendar date. The arrows and date picker can show older days without altering stored records. Quick actions add food, drink, water, exercise or a measured weight to that day.</p>
      <p><strong>Calories consumed</strong> sums recorded food and drink calories when known. <strong>Estimated total expended</strong> combines an optional resting/background estimate with known additional workout energy. <strong>Estimated difference</strong> is consumed minus expended, not a prediction of weight gain or loss. These remain separate metrics.</p>
      <p><strong>Live expenditure and difference:</strong> Known logged workout energy is shown immediately, including on days not marked complete. When the background estimate and every logged workout's energy estimate are available, the app shows estimated <em>full-day</em> expenditure—even before completion. This is a provisional full-day estimate, <strong>not calories already burned so far</strong>. More food or activity may still be logged. The difference also appears live when a non-water food or drink entry exists and energy is known for every relevant intake entry, using <strong>known consumed kcal − estimated full-day expended kcal</strong>. A negative difference is not a measured calorie deficit or a prediction of weight change.</p>
      <p><strong>Unknowns and coverage:</strong> If some workouts have unknown calories, the card can show <strong>Known portion</strong> of logged workout energy, but total expenditure and difference remain unknown. If no workouts have been logged on an open day, the app does not assume their energy is zero; on a completed day with no workouts the logged workout increment is zero only for that archived record. Missing food calorie values, water-only intake, or unavailable background energy also prevent a difference. The calculations remain live without marking the day complete; calendar scoring still requires completion.</p>
      <p>A day with missing entries, incomplete nutrients or unknown exercise calories does not get invented totals. The app can show <strong>At least</strong> a known amount for partially recorded intake. Water and other drinks contribute fluid once; caloric drinks contribute nutrition only once.</p>
      <p>Marking a day complete asks for confirmation, then locks its records and archives its daily goal evaluation. Reopening unlocks edits and discards that saved evaluation until it is completed again. See <Link className="underline" to="/settings/docs/calendar">Calendar and day completion</Link>.</p>
    </>
  ),
  'log': (
    <>

      <p>The <strong>Log</strong> page contains three quick actions—<strong>+ Food</strong>, <strong>+ Drink</strong>, and <strong>+ Exercise</strong>—that open separate input pages. Below them, a weight card records the selected day's measured weight, followed by the <strong>Mark day complete</strong> / <strong>Reopen day</strong> button. Logged entries and their edit/delete controls are viewed through Calendar day details. Use <strong>Food</strong> to log a consumed food and its label basis, quantity and known nutrients. The optional meal field groups breakfast, lunch, dinner and snacks. Use <strong>Drink</strong> for fluids that may also contain calories. <strong>Plain water</strong> is logged as measured fluid only. It contributes nothing to calorie/nutrient totals or coverage; its stored zero-energy snapshot is retained for historical data integrity. Other drinks can have real nutrients or unknown values. Reusable saved foods and favorites are available through the food/drink entry pages.</p>
      <p>Entries on open days can be edited, repeated or deleted. Completed dates are read-only until reopened. Every log stores its own historical label snapshot. Editing a reusable food never rewrites a past meal. A serving count is never silently converted into grams or milliliters without a declared conversion.</p>
      <p>Local log dates use the device's calendar date, independent of audit timestamps. Changing an entry's date moves the log without rewriting unrelated days.</p>
    </>
  ),
  'food': (
    <>

      <p><strong>Local saved foods:</strong> Matching labels appear in the editable food-name combobox as you type, including offline.</p>
      <p><strong>USDA FoodData Central SR Legacy:</strong> 7,793 reference foods from the April 2018 release are bundled in the app. Search an ingredient, then choose its exact variety and preparation (raw, cooked, boiled, white, brown and so forth). Nutrients populate using the selected record's <strong>per 100 g</strong> edible weight. This lookup works offline, requires no API key and preserves the USDA food ID with your entry. These are historical reference averages, not live lab measurements. <a className="underline" href="https://fdc.nal.usda.gov/download-datasets/" target="_blank" rel="noopener noreferrer">USDA dataset and license</a>.</p>
      <p>For example, USDA reference cabbage is 25 kcal/100 g raw (FDC 169975) and 23 kcal/100 g cooked, boiled and drained without salt (FDC 169976). Cooked brown long-grain rice (FDC 169704) is 123 kcal/100 g; cooked enriched white long-grain rice (FDC 168878) is 130 kcal/100 g. Different preparations are separate records. A blanched-cabbage search may return boiled-and-drained cabbage as a comparison, <strong>not an identical measured preparation</strong>. Water absorption, seasoning and cooking methods change values.</p>
      <p><strong>Red (purple) onion:</strong> The older SR Legacy catalog contains generic raw onion (40 kcal/100 g) and yellow sautéed onion (123 kcal/100 g), but no separately named red/purple variety. An additional <strong>USDA Foundation Foods (April 2026)</strong> record provides <strong>Onions, red, raw</strong> at 44 kcal/100 g (FDC 790577). Both “red onion” and “purple onion” find that separately measured raw variety offline. No red-onion-specific sautéed values are available in these bundled records; cooking and oil change calorie density, so do not treat yellow sautéed or raw red values as measured sautéed red onion. Unreported nutrients stay unknown.</p>
      <p><strong>Open Food Facts:</strong> Press <strong>Search online</strong> to look up packaged and branded products. The app sends only your typed search query to the service; it does not upload your profile, logged meals, weight or goals. Search is intentionally not triggered on every keystroke to respect rate limits. Open Food Facts labels are community contributed and may be incomplete or inaccurate. <a className="underline" href="https://world.openfoodfacts.org/" target="_blank" rel="noopener noreferrer">Open Food Facts</a> data use the <a className="underline" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">ODbL license</a>.</p>
      <p><strong>Serving basis:</strong> The label may give values per serving, piece, 100 g, 100 ml, or a custom reference amount. For a per-100-g label, eating 75 g multiplies every known nutrient by 0.75. Mass (g or oz) and volume (ml or fl-oz) are separate; a piece cannot be converted into mass without a real serving definition. Imported data remains editable—verify the package or preparation before saving. Missing nutrient values stay unknown, not zero.</p>
    </>
  ),
  'nutrition': (
    <>

      <dl className="space-y-2">
        <div><dt className="font-semibold">Calories (kcal)</dt><dd>Food energy recorded for the selected label basis; not a measurement of calories your body absorbs.</dd></div>
        <div><dt className="font-semibold">Protein (g)</dt><dd>Grams of protein. A user-set protein target is treated as a minimum tracking target.</dd></div>
        <div><dt className="font-semibold">Carbohydrates (g)</dt><dd>Reported carbohydrate grams; includes sugars and other carbohydrate components according to the source label.</dd></div>
        <div><dt className="font-semibold">Fat / saturated fat (g)</dt><dd>Total and saturated fat recorded separately. Saturated fat is a part of total fat, not an additional amount to add.</dd></div>
        <div><dt className="font-semibold">Fiber (g)</dt><dd>Reported dietary fiber, a user-configurable minimum tracking target.</dd></div>
        <div><dt className="font-semibold">Sugars (g)</dt><dd>Reported total sugars; included within carbohydrates, not an extra calorie category.</dd></div>
        <div><dt className="font-semibold">Sodium and potassium (mg)</dt><dd>Minerals recorded in milligrams. When an online label reports sodium in grams, the importer multiplies by 1,000 to store mg.</dd></div>
        <div><dt className="font-semibold">Fluids (ml)</dt><dd>Measured drink volume, separate from nutrient energy. Food's intrinsic moisture is not counted as logged fluid.</dd></div>
      </dl>
      <p><strong>Coverage and unknown values:</strong> Each of the seven nutrient cards shows the known logged total (and a reference percentage when applicable). Tapping a card on Today or Calendar opens that nutrient's detail page for the selected date. The page lists <strong>every food and non-water drink entry</strong> with its stored nutrient amount for the consumed serving, including entries where the nutrient is unknown. Explicitly logged plain water is excluded from all nutrient and calorie calculations and from nutrient detail lists, but still contributes its measured volume to fluid totals. A <strong>-</strong> (dash) means no nutrient amount was recorded for that entry; a measured zero is shown as <strong>0 g</strong> or <strong>0 mg</strong>, never a dash. An incomplete total is labeled <strong>At least</strong>, and a partial percentage is preceded by <strong>≥</strong> because unreported nutrients could raise the total. The cards omit reference descriptions and coverage notes to stay compact; the detailed rows show where data is missing.</p>
      <p><strong>Calendar nutrient percentages:</strong> On Calendar → Day details → Nutrients, percentages compare known amounts against their applicable daily reference values. Protein, fiber and potassium use age-appropriate FNRI PDRI references; age is calculated for the selected date. Partial logs still show a minimum amount and ≥ percentage, because missing nutrient entries could increase the total. When nothing is known the percent is unknown, not zero; an explicitly recorded zero shows 0.0%.</p>
      <p>The comparison uses the <a className="underline" href="https://fnri.dost.gov.ph/images/images/news/PDRI-2018.pdf" target="_blank" rel="noopener noreferrer">FNRI-DOST 2015 Philippine Dietary Reference Intakes (revised 2018)</a>: protein <strong>RNI</strong> is 72 g male / 61 g female at 18, and 71 g male / 62 g female at 19+; fiber is compared with the <strong>upper end of its AI range</strong> (23 g at 18; 25 g at 19+); potassium uses the <strong>AI of 2,000 mg</strong> for 18+. RNI means Recommended Nutrient Intake, while AI means Adequate Intake (not a precise personal requirement). Values are reference comparisons, not personal prescriptions or Calendar scores; results above 100% are not necessarily better.</p>
      <p><strong>Carbohydrates, total sugars and sodium</strong> have no fixed single-value RENI upper-limit percentage in this app. If you enter optional <Link className="underline" to="/settings/preferences">custom upper limits in Preferences</Link>, Calendar compares logged carbohydrates (g), total sugars (g) and sodium (mg) against <em>your</em> limits. 120% means 120% of that limit used, not an achievement or health diagnosis. Unset limits display a prompt to set them. These preferences apply to all viewed Calendar dates, including past days, but never change logged foods or dated scoring goals. Fat still has no gram-based RENI percentage; sodium AI is not treated as an upper limit. Missing equation sex selection leaves the protein reference unavailable, and comparisons do not account for pregnancy, lactation or medical conditions.</p>
    </>
  ),
  'exercise': (
    <>

      <p>Record activity name, date, optional time/notes and a strength-training flag; the old Light/Moderate/Vigorous selector has been removed. For <strong>walking and running</strong>, enter distance (km), duration (minutes) or both. Optionally enter speed (km/h) and uphill incline angle (°). Distance-only entries keep recorded minutes unknown; no minutes are fabricated. All other activities continue to require a duration.</p>
      <p><strong>Speed precedence:</strong> when supplied, your entered speed drives the energy calculation. Otherwise, if both distance and duration are logged, speed is calculated from them. If speed cannot be calculated, the estimate uses an explicit reference pace: <strong>walking 5 km/h</strong> or <strong>running 10 km/h</strong>. If distance and speed are both available, calculation time is derived from them and a separately recorded duration remains unchanged; conflicting inputs should be corrected. With duration only, it estimates using that time and the entered or default speed.</p>
      <p><strong>Speed-sensitive flat-ground energy:</strong> the app interpolates <a className="underline" href="https://pacompendium.com/walking/" target="_blank" rel="noopener noreferrer">2024 Adult Compendium walking METs</a> or <a className="underline" href="https://pacompendium.com/running/" target="_blank" rel="noopener noreferrer">running METs</a> across supported paces, instead of assigning calories to vague intensity labels. Supported walking speeds are 2–8 km/h and running speeds 6–25 km/h. Net kcal = <strong>(pace MET − 1) × 3.5 × recorded weight (kg) ÷ 200 × calculation minutes</strong>. Speed can affect calories over a fixed distance, though the total does not necessarily rise sharply with every increase in pace.</p>
      <p><strong>Incline:</strong> an optional 0–15° uphill angle is converted into grade fraction using <strong>tan(angle × π ÷ 180)</strong> and adds the uphill oxygen demand using the <a className="underline" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12419060/" target="_blank" rel="noopener noreferrer">ACSM metabolic equations</a>: for walking <strong>1.8 × speed (m/min) × grade fraction</strong>, for running <strong>0.9 × speed (m/min) × grade fraction</strong>, converted to net kcal with weight and calculation minutes. This uphill addition is applied once, not as a second workout. Leaving incline blank assumes level ground <em>for the model</em> without creating a measured 0° value. Downhill and angles above 15° are not modeled. Existing percentage-based workouts display the same slope converted to degrees. A route that goes uphill and downhill cannot be represented accurately by a single average grade, and outdoor terrain/wind/load may change actual energy.</p>
      <p><strong>Live preview and other methods:</strong> the bottom of the exercise form uses the same deterministic calculation as Today, Calendar and Trends and updates as inputs change. An adult age and same-day or earlier recorded weight are required for calculated workout kcal. Manual ACTIVE/incremental kcal can be entered without weight, and user-entered MET × duration remains an option for other activities. Historical distance-only/time-only estimates and recorded intensity values remain intact for data compatibility, but intensity is no longer asked or displayed. Only one workout energy method contributes to daily expenditure. Workout estimates are not measured and are unavailable without sufficient evidence. Known logged workout kcal are displayed immediately even on an open day; a complete set of workout estimates plus background inputs yields a provisional full-day expenditure estimate. If some workout estimates are unknown, the known portion and coverage are shown but total expenditure is withheld. No workouts logged on an open day is not zero. The energy difference appears provisionally when both intake energy and total estimated expenditure are assessable; day evaluation still requires completion.</p>
    </>
  ),
  'weight': (
    <>

      <p>Only one primary measured weight is kept per local date. Edit a mistaken entry or move it to the correct date rather than creating a duplicate. Values are stored in kilograms and displayed in your selected units (kg or lb).</p>
      <p>Unmeasured days are gaps, not zero values. For a workout or resting estimate, the most recent prior measurement may be used as an explicit carried-forward <em>calculation input</em>; it is not presented as an actual measurement for that later date. No future measurement is used to estimate a past day.</p>
    </>
  ),
  'calendar': (
    <>

      <p>The calendar visualizes <strong>on target</strong>, <strong>mixed / needs attention</strong>, <strong>off target</strong> and <strong>incomplete / no evaluation</strong>. Green, amber, red and neutral gray respectively describe alignment against <em>your configured targets</em>, never medical health or morality.</p>
      <p>A day is evaluated overall only if you explicitly <strong>Mark day complete</strong>, the applicable adult and target requirements are met, and every configured supported nutrient or fluid target has assessable records. Otherwise it stays neutral/incomplete. A rest day or unlogged day is never graded negatively.</p>
      <p><strong>Completion safety:</strong> Mark day complete opens a confirmation describing the read-only lock. Confirm to archive the daily assessment and its target values. Completed food, water, exercise and weight entries cannot be edited, deleted or moved to another date, even through old editor links. Reopen day unlocks the date and discards its archived evaluation; when completed again it uses applicable settings. JSON backups preserve locked snapshots.</p>
      <p>Calendar entry symbols: <strong>●</strong> food/drink, <strong>◆</strong> exercise and <strong>▴</strong> recorded weight. These symbols indicate logged records, not a score. Tap a date to see the compact goal checklist and recorded entries. Uncompleted days use goals selected by their effective dates; completed days keep the archived target values and rule results.</p>
    </>
  ),
  'day-detail': (
    <>

      <p>A day detail shows recorded foods, drinks, exercise, weight, nutrient totals, estimated expenditure, and the review state. Each nutrient card opens its own dated food-and-drink breakdown; unknown per-entry amounts display a dash, and known zeroes stay zero. The <strong>Daily goal alignment</strong> checklist displays one row per configured goal, with the recorded amount and applicable target. Its symbols are ✅ aligned, ⚠️ needs attention, ❌ significant deviation and ➖ not evaluated (including days not yet completed). A partial known amount is shown with ≥; missing data is a dash, not a zero. The completion status and a compact <strong>Reopen</strong> or <strong>Mark complete</strong> action sit directly above the checklist. Detailed evaluation thresholds and methods remain in Goals and this Docs section rather than appearing as lengthy on-page rule explanations.</p>
      <p>The app's evaluation rule version is saved in each completed-day snapshot. Changes to goal history, targets, profile settings or scoring rules do not rescore a locked day. Reopening discards the snapshot and allows a new evaluation when completed again. Older completed records are archived once when migrating or importing legacy backups, using the historical information available at that point; original completion-time settings may no longer be recoverable.</p>
    </>
  ),
  'trends': (
    <>

      <p>Choose 7, 30, 90 or custom dates (up to 366 inclusive calendar days). Graphs show recorded calorie intake, approximate expenditure and difference, measured weight (only on real measurement dates), selected nutrients, fluids, and weekly exercise summaries.</p>
      <p>Missing points are gaps, not zero. Charts use the same calculation rules as Today and Calendar, and include textual coverage alongside visual trends. <strong>Calendar alignment %</strong> divides on-target assessable completed days by <em>all assessable completed days</em>, not by all days in the range.</p>
      <p>Differences in kcal are estimates, not exact measurements or predictions of body-weight change.</p>
    </>
  ),
  'profile': (
    <>

      <p>Your <strong>Profile</strong> records age or date of birth, height, mass/height/fluid display units, a general activity note, optional equation constant and an optional non-workout movement multiplier. Unit changes convert display units without rewriting measured history. Weight measurements are edited in Log, not Profile.</p>
      <p>The general activity note is descriptive and <strong>not</strong> used by the energy equation. The optional movement dropdown provides illustrative non-workout factors: resting-only ×1.00, mostly seated ×1.10, light movement ×1.20, regularly standing/walking ×1.35, active routine ×1.50, and demanding physical routine ×1.60. These are approximate product presets, not clinically validated activity classes. An older manually saved factor can be kept unchanged.</p>
      <p>Adult <strong>resting energy</strong> is approximately <strong>10 × weight kg + 6.25 × height cm − 5 × age years + constant</strong>, using the selected Mifflin–St Jeor equation constant (+5 or −161). An explicit constant, valid age, height and recorded current/prior weight are required. Non-workout background = resting estimate × chosen multiplier; the selected factor excludes separately logged workouts. Leaving these optional inputs blank does not affect simple logging.</p>
    </>
  ),
  'goals': (
    <>

      <p>Goals are <strong>maintain weight</strong>, <strong>track toward lower weight</strong>, <strong>track toward higher weight</strong> or <strong>general wellness</strong>. Selecting a goal never automatically prescribes a calorie deficit or target. The user chooses daily calorie, protein, fiber, sodium upper limit and fluid targets; unset targets are not scored.</p>
      <p>Goal revisions have an <strong>effective date</strong> and do not delete historical goal periods. Open days use whichever goal is effective for that date. Once a day is completed, its evaluated targets, results and rules are frozen and independent of later Settings changes. Future-dated goals do not immediately change the current goal.</p>
      <p>Default <strong>energy alignment</strong>: within ±15% of the calorie target is aligned; beyond that through ±30% needs attention, and beyond ±30% is a large deviation. <strong>Minimum targets</strong> (protein, fiber, fluid): meeting or exceeding a chosen minimum is aligned, 50–99.9% needs attention, and below 50% is a large deviation. <strong>Sodium upper limit</strong>: at or below the chosen amount is aligned; up to 30% above needs attention, and more than 30% above is a large deviation. These bands can be adjusted for future dated goal revisions. None are clinical reference ranges.</p>
      <p>For a completed assessable day, all aligned = on target; at least one attention and no large deviation = mixed; any large deviation = off target. If even one configured rule cannot be assessed, the overall day is incomplete.</p>
    </>
  ),
  'preferences': (
    <>

      <p>Under Settings → Preferences you can adjust four quick-add water buttons; entries use milliliters internally. You can always log custom amounts, and no water is invented from missing days.</p>
      <p>Optional <strong>carbohydrates (g/day)</strong>, <strong>total sugars (g/day)</strong> and <strong>sodium (mg/day)</strong> daily upper comparison limits are also available. Leaving a field blank disables its percentage. The Calendar uses known amounts against your chosen limit, labeling missing-data percentages as minimums (≥). These are tracking preferences, not personalized nutritional prescriptions or day evaluation scores. They use local IndexedDB and survive backup/export. For locked dates, the comparison limits in force when completion was confirmed are preserved in the archived day snapshot; open days use current preferences.</p>
    </>
  ),
  'data': (
    <>

      <p>Personal records live in <strong>IndexedDB via Dexie</strong> in this browser, not a cloud account. The installable offline PWA caches its application assets separately from your personal records. Switching browser profiles, clearing site data, or uninstalling can erase local records. A second device will not automatically have the same data.</p>
      <p><strong>Export</strong> creates a local versioned JSON backup of eight data stores: profiles, dated goals, reusable foods, food/drink entries, exercise, weights, day reviews and app preferences. The file contains personal lifestyle data, is <strong>not encrypted automatically</strong>, and should be stored securely. Verify the download exists.</p>
      <p><strong>Import</strong> validates the selected JSON on your device, displays record counts, then requires you to type <strong>REPLACE</strong>. It overwrites all currently stored data, not merges; export the existing records first. Failed validation or failed transactional writes leave prior records intact. <strong>DELETE</strong> clears local data irreversibly without a backup and has a separate explicit confirmation. These destructive warnings remain visible beside the actions in the app.</p>
    </>
  ),
  'about': (
    <>

      <p><strong>Health information notice:</strong> This app provides general, estimated nutrition and activity evaluations for personal tracking. Evaluations may be inaccurate or inappropriate for people with pre-existing medical conditions, people taking medications that affect metabolism or fluid balance, and people with other circumstances that alter nutritional or exercise needs. It is not a medical device and does not diagnose, treat, or replace advice from a qualified healthcare professional.</p>
      <p>Adult-oriented energy estimates and weight-goal evaluations do not apply to people under 18. Basic logging remains available. No clinical diagnoses, condition histories, account, synchronization or automatic cloud storage are part of the tracker. External Open Food Facts lookups occur only on explicit user searches.</p>
    </>
  ),
  'glossary': (
    <>

      <dl className="space-y-2">
        <div><dt className="font-semibold">Assessable / not evaluated</dt><dd>Whether enough complete, applicable recorded evidence exists to compare a metric against a user-set target.</dd></div>
        <div><dt className="font-semibold">Complete day</dt><dd>A date explicitly marked complete by you, not inferred from the presence of entries.</dd></div>
        <div><dt className="font-semibold">Reference basis</dt><dd>The source label quantity that a nutrient value describes, e.g. one serving or 100 g.</dd></div>
        <div><dt className="font-semibold">Nutrient snapshot</dt><dd>A copy of the original per-basis and consumed nutrients saved with a log, independent of later changes to a saved food or public reference.</dd></div>
        <div><dt className="font-semibold">Gross vs net calories</dt><dd>Gross activity energy includes energy expended at rest; net/active is additional energy beyond rest. The tracker adds only net activity energy to background.</dd></div>
        <div><dt className="font-semibold">Estimated difference</dt><dd>Logged consumed kcal minus estimated total expended kcal, only when both are sufficiently known.</dd></div>
        <div><dt className="font-semibold">Effective-dated goals</dt><dd>Goal revisions are linked to a date, so past days use the goal relevant to their period.</dd></div>
        <div><dt className="font-semibold">Local date</dt><dd>The device's calendar day key, stored independently from UTC audit timestamps.</dd></div>
      </dl>
    </>
  )
}

export function DocsTopicPage() {
  const { topic } = useParams<{ topic: string }>()
  const current = DOCS_TOPICS.find(item => item.id === topic)
  if (!current) {
    return <div className="space-y-4">
      <h1 className="text-3xl font-bold">Document not found</h1>
      <p className="text-sm text-slate-600">There isn't a Docs page for this topic.</p>
      <Link to="/settings/docs" className="inline-flex min-h-11 items-center font-semibold text-evergreen-700 underline">Back to Docs</Link>
    </div>
  }
  const index = DOCS_TOPICS.findIndex(item => item.id === current.id)
  const previous = index > 0 ? DOCS_TOPICS[index - 1] : undefined
  const next = index < DOCS_TOPICS.length - 1 ? DOCS_TOPICS[index + 1] : undefined
  return <div className="space-y-6">
    <header>
      <Link to="/settings/docs" className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline">Back to Docs</Link>
      <h1 id="docs-topic-title" className="mt-3 text-3xl font-bold tracking-tight">{current.label}</h1>
    </header>
    <article aria-labelledby="docs-topic-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-3 text-sm leading-7 text-slate-700">{DOCS_CONTENT[current.id]}</div>
    </article>
    <nav aria-label="Browse documentation" className="flex flex-wrap justify-between gap-3 text-sm font-semibold">
      {previous ? <Link to={'/settings/docs/'+previous.id} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-evergreen-700">‹ {previous.label}</Link> : <span />}
      {next && <Link to={'/settings/docs/'+next.id} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-evergreen-700">{next.label} ›</Link>}
    </nav>
  </div>
}

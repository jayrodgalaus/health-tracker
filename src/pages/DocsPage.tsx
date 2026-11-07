import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

const sections = [
  {id:'today', label:'Today and daily totals'},
  {id:'log', label:'Daily logging'},
  {id:'food', label:'Food lookup and nutrition labels'},
  {id:'nutrition', label:'Nutrient terms and units'},
  {id:'exercise', label:'Exercise and energy estimates'},
  {id:'weight', label:'Weight and historical records'},
  {id:'calendar', label:'Calendar colors and day completion'},
  {id:'day-detail', label:'Day details and explainable rules'},
  {id:'trends', label:'Trends and coverage'},
  {id:'profile', label:'Profile and daily background movement'},
  {id:'goals', label:'Goals, tracking targets and thresholds'},
  {id:'preferences', label:'Water quick-add preferences'},
  {id:'data', label:'Storage, backup and restoration'},
  {id:'about', label:'Health notice and limitations'},
  {id:'glossary', label:'Glossary'}
] as const

function Section({id, title, children}: {id:string; title:string; children:ReactNode}) {
  return <section id={id} className="scroll-mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-bold text-evergreen-900">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-slate-700">{children}</div>
    <a href="#docs-top" className="inline-flex min-h-11 items-center text-sm font-semibold text-evergreen-700 underline">Back to Docs contents</a>
  </section>
}

export function DocsPage() {
  const {hash} = useLocation()
  useEffect(() => {
    if (!hash) return
    const id = decodeURIComponent(hash.slice(1))
    document.getElementById(id)?.scrollIntoView({block:'start'})
  }, [hash])

  return <div id="docs-top" className="space-y-6">
    <header>
      <Link to="/settings" className="text-sm font-semibold text-evergreen-700 underline">Back to Settings</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Docs</h1>
      <p className="mt-2 text-sm text-slate-600">Reference guide for the app's terms, records, calculations, food data and safety boundaries.</p>
    </header>
    <nav aria-label="Documentation contents" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-bold">Contents</h2>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {sections.map(item => <li key={item.id}>
          <a className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-evergreen-700 hover:bg-evergreen-50" href={'#'+item.id}>{item.label}</a>
        </li>)}
      </ul>
    </nav>
    <Section id="today" title="Today and daily totals">
      <p><strong>Today</strong> displays the selected local calendar date. The arrows and date picker can show older days without altering stored records. Quick actions add food, drink, water, exercise or a measured weight to that day.</p>
      <p><strong>Calories consumed</strong> sums recorded food and drink calories when known. <strong>Estimated total expended</strong> combines an optional resting/background estimate with known additional workout energy. <strong>Estimated difference</strong> is consumed minus expended, not a prediction of weight gain or loss. These remain separate metrics.</p>
      <p>A day with missing entries, incomplete nutrients or unknown exercise calories does not get invented totals. The app can show <strong>At least</strong> a known amount for partially recorded intake. Water and other drinks contribute fluid once; caloric drinks contribute nutrition only once.</p>
      <p>Only users can mark a day complete; that action controls whether a daily goal evaluation is eligible. See <a className="underline" href="#calendar">Calendar and day completion</a>.</p>
    </Section>
    <Section id="log" title="Daily logging">
      <p>Use <strong>Food</strong> to log a consumed food and its label basis, quantity and known nutrients. The optional meal field groups breakfast, lunch, dinner and snacks. Use <strong>Drink</strong> for fluids that may also contain calories. <strong>Water</strong> is logged with measured volume and known zero calories; other nutrient values are not guessed. Reusable saved foods, favorites and recent entries speed up future logging.</p>
      <p>Entries can be edited, repeated or deleted. Every log stores its own historical label snapshot. Editing a reusable food never rewrites a past meal. A serving count is never silently converted into grams or milliliters without a declared conversion.</p>
      <p>Local log dates use the device's calendar date, independent of audit timestamps. Changing an entry's date moves the log without rewriting unrelated days.</p>
    </Section>
    <Section id="food" title="Food lookup and nutrition labels">
      <p><strong>Local saved foods:</strong> Matching labels appear in the editable food-name combobox as you type, including offline.</p>
      <p><strong>USDA FoodData Central SR Legacy:</strong> 7,793 reference foods from the April 2018 release are bundled in the app. Search an ingredient, then choose its exact variety and preparation (raw, cooked, boiled, white, brown and so forth). Nutrients populate using the selected record's <strong>per 100 g</strong> edible weight. This lookup works offline, requires no API key and preserves the USDA food ID with your entry. These are historical reference averages, not live lab measurements. <a className="underline" href="https://fdc.nal.usda.gov/download-datasets/" target="_blank" rel="noopener noreferrer">USDA dataset and license</a>.</p>
      <p>For example, USDA reference cabbage is 25 kcal/100 g raw (FDC 169975) and 23 kcal/100 g cooked, boiled and drained without salt (FDC 169976). Cooked brown long-grain rice (FDC 169704) is 123 kcal/100 g; cooked enriched white long-grain rice (FDC 168878) is 130 kcal/100 g. Different preparations are separate records. A blanched-cabbage search may return boiled-and-drained cabbage as a comparison, <strong>not an identical measured preparation</strong>. Water absorption, seasoning and cooking methods change values.</p>
      <p><strong>Open Food Facts:</strong> Press <strong>Search online</strong> to look up packaged and branded products. The app sends only your typed search query to the service; it does not upload your profile, logged meals, weight or goals. Search is intentionally not triggered on every keystroke to respect rate limits. Open Food Facts labels are community contributed and may be incomplete or inaccurate. <a className="underline" href="https://world.openfoodfacts.org/" target="_blank" rel="noopener noreferrer">Open Food Facts</a> data use the <a className="underline" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">ODbL license</a>.</p>
      <p><strong>Serving basis:</strong> The label may give values per serving, piece, 100 g, 100 ml, or a custom reference amount. For a per-100-g label, eating 75 g multiplies every known nutrient by 0.75. Mass (g or oz) and volume (ml or fl-oz) are separate; a piece cannot be converted into mass without a real serving definition. Imported data remains editable—verify the package or preparation before saving. Missing nutrient values stay unknown, not zero.</p>
    </Section>
    <Section id="nutrition" title="Nutrient terms and units">
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
      <p><strong>Coverage</strong> tells you how many entries report a particular value. If any entry lacks it, a displayed sum may read <strong>At least</strong>, or stay <strong>Unknown</strong> when no known values exist. A recorded zero is different from a blank field.</p>
    </Section>
    <Section id="exercise" title="Exercise and energy estimates">
      <p>Record activity name, duration, optional intensity, strength-training classification, time and notes. A rest day is not a failed day; weekly summaries count only recorded activity. A missing workout log is not proof that no movement happened.</p>
      <p><strong>MET</strong> means metabolic equivalent of task. The app never guesses a MET from an exercise name or intensity: you enter it if you have a source. Additional <strong>net</strong> workout energy is approximately <strong>max(0, MET − 1) × 3.5 × recorded weight (kg) ÷ 200 × minutes</strong>. Weight is taken from that day or the most recent earlier measurement, never from the future.</p>
      <p><strong>Manual active kcal</strong> must represent exercise energy above rest, not gross workout calories that already include resting expenditure. Workout energy is added once to the non-workout background estimate. Unknown workout energy remains unknown. Adult-oriented energy estimates are withheld for users younger than 18 or with unconfirmed adult age.</p>
    </Section>
    <Section id="weight" title="Weight and historical records">
      <p>Only one primary measured weight is kept per local date. Edit a mistaken entry or move it to the correct date rather than creating a duplicate. Values are stored in kilograms and displayed in your selected units (kg or lb).</p>
      <p>Unmeasured days are gaps, not zero values. For a workout or resting estimate, the most recent prior measurement may be used as an explicit carried-forward <em>calculation input</em>; it is not presented as an actual measurement for that later date. No future measurement is used to estimate a past day.</p>
    </Section>
    <Section id="calendar" title="Calendar colors and day completion">
      <p>The calendar visualizes <strong>on target</strong>, <strong>mixed / needs attention</strong>, <strong>off target</strong> and <strong>incomplete / no evaluation</strong>. Green, amber, red and neutral gray respectively describe alignment against <em>your configured targets</em>, never medical health or morality.</p>
      <p>A day is evaluated overall only if you explicitly <strong>Mark day complete</strong>, the applicable adult and target requirements are met, and every configured supported nutrient or fluid target has assessable records. Otherwise it stays neutral/incomplete. A rest day or unlogged day is never graded negatively.</p>
      <p>Calendar entry symbols: <strong>●</strong> food/drink, <strong>◆</strong> exercise and <strong>▴</strong> recorded weight. These symbols indicate logged records, not a score. Tap a date to view entries and individual rule explanations. Goals are selected from their effective dates.</p>
    </Section>
    <Section id="day-detail" title="Day details and explainable rules">
      <p>A day detail shows recorded foods, drinks, exercise, weight, nutrient coverage, estimated expenditure, and the review state. The <strong>Review each rule and its source</strong> control lists your actual value, configured target, units, rule result and why a rule passed, needs attention, or could not be evaluated. These live calculations stay inspectable even though general explanatory notes have moved to Docs.</p>
      <p>The app's rule version is 1.0.0. Historic raw data and dated goals are preserved; status results may be recomputed if the implementation of the rules changes later.</p>
    </Section>
    <Section id="trends" title="Trends and coverage">
      <p>Choose 7, 30, 90 or custom dates (up to 366 inclusive calendar days). Graphs show recorded calorie intake, approximate expenditure and difference, measured weight (only on real measurement dates), selected nutrients, fluids, and weekly exercise summaries.</p>
      <p>Missing points are gaps, not zero. Charts use the same calculation rules as Today and Calendar, and include textual coverage alongside visual trends. <strong>Calendar alignment %</strong> divides on-target assessable completed days by <em>all assessable completed days</em>, not by all days in the range.</p>
      <p>Differences in kcal are estimates, not exact measurements or predictions of body-weight change.</p>
    </Section>
    <Section id="profile" title="Profile and everyday movement">
      <p>Your <strong>Profile</strong> records age or date of birth, height, mass/height/fluid display units, a general activity note, optional equation constant and an optional non-workout movement multiplier. Unit changes convert display units without rewriting measured history. Weight measurements are edited in Log, not Profile.</p>
      <p>The general activity note is descriptive and <strong>not</strong> used by the energy equation. The optional movement dropdown provides illustrative non-workout factors: resting-only ×1.00, mostly seated ×1.10, light movement ×1.20, regularly standing/walking ×1.35, active routine ×1.50, and demanding physical routine ×1.60. These are approximate product presets, not clinically validated activity classes. An older manually saved factor can be kept unchanged.</p>
      <p>Adult <strong>resting energy</strong> is approximately <strong>10 × weight kg + 6.25 × height cm − 5 × age years + constant</strong>, using the selected Mifflin–St Jeor equation constant (+5 or −161). An explicit constant, valid age, height and recorded current/prior weight are required. Non-workout background = resting estimate × chosen multiplier; the selected factor excludes separately logged workouts. Leaving these optional inputs blank does not affect simple logging.</p>
    </Section>
    <Section id="goals" title="Goals, targets and adjustable rules">
      <p>Goals are <strong>maintain weight</strong>, <strong>track toward lower weight</strong>, <strong>track toward higher weight</strong> or <strong>general wellness</strong>. Selecting a goal never automatically prescribes a calorie deficit or target. The user chooses daily calorie, protein, fiber, sodium upper limit and fluid targets; unset targets are not scored.</p>
      <p>Goal revisions have an <strong>effective date</strong> and do not delete historical goal periods. An earlier date uses whichever goal was in force for that date. Future-dated goals do not immediately change the current goal.</p>
      <p>Default <strong>energy alignment</strong>: within ±15% of the calorie target is aligned; beyond that through ±30% needs attention, and beyond ±30% is a large deviation. <strong>Minimum targets</strong> (protein, fiber, fluid): meeting or exceeding a chosen minimum is aligned, 50–99.9% needs attention, and below 50% is a large deviation. <strong>Sodium upper limit</strong>: at or below the chosen amount is aligned; up to 30% above needs attention, and more than 30% above is a large deviation. These bands can be adjusted for future dated goal revisions. None are clinical reference ranges.</p>
      <p>For a completed assessable day, all aligned = on target; at least one attention and no large deviation = mixed; any large deviation = off target. If even one configured rule cannot be assessed, the overall day is incomplete.</p>
    </Section>
    <Section id="preferences" title="Water quick-add preferences">
      <p>Under Settings → Preferences you can adjust the four quick-add water buttons. Entries use milliliters internally. You can always log a custom water amount; no water is invented from unlogged days.</p>
    </Section>
    <Section id="data" title="Data, backup and restoration">
      <p>Personal records live in <strong>IndexedDB via Dexie</strong> in this browser, not a cloud account. The installable offline PWA caches its application assets separately from your personal records. Switching browser profiles, clearing site data, or uninstalling can erase local records. A second device will not automatically have the same data.</p>
      <p><strong>Export</strong> creates a local versioned JSON backup of eight data stores: profiles, dated goals, reusable foods, food/drink entries, exercise, weights, day reviews and app preferences. The file contains personal lifestyle data, is <strong>not encrypted automatically</strong>, and should be stored securely. Verify the download exists.</p>
      <p><strong>Import</strong> validates the selected JSON on your device, displays record counts, then requires you to type <strong>REPLACE</strong>. It overwrites all currently stored data, not merges; export the existing records first. Failed validation or failed transactional writes leave prior records intact. <strong>DELETE</strong> clears local data irreversibly without a backup and has a separate explicit confirmation. These destructive warnings remain visible beside the actions in the app.</p>
    </Section>
    <Section id="about" title="Health information notice and limitations">
      <p><strong>Health information notice:</strong> This app provides general, estimated nutrition and activity evaluations for personal tracking. Evaluations may be inaccurate or inappropriate for people with pre-existing medical conditions, people taking medications that affect metabolism or fluid balance, and people with other circumstances that alter nutritional or exercise needs. It is not a medical device and does not diagnose, treat, or replace advice from a qualified healthcare professional.</p>
      <p>Adult-oriented energy estimates and weight-goal evaluations do not apply to people under 18. Basic logging remains available. No clinical diagnoses, condition histories, account, synchronization or automatic cloud storage are part of the tracker. External Open Food Facts lookups occur only on explicit user searches.</p>
    </Section>
    <Section id="glossary" title="Glossary">
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
    </Section>
  </div>
}

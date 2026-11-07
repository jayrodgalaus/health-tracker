# Optional food lookup — source, privacy and data integrity

Requested after v1 scope (§4.4 and §11 of the Development Guide).

## Source and limitations

**Open Food Facts**: https://world.openfoodfacts.org/ — an openly licensed,
community-contributed product/label catalog. Data are under the **Open Database
License (ODbL) 1.0**: https://opendatacommons.org/licenses/odbl/1-0/.
Please attribute Open Food Facts when reusing its data. This feature displays
attribution directly under the food combobox and links back to the selected
product.

- The API supports legacy plain-language search through
  `/cgi/search.pl`; v2/v3 structured search is not text search. This is
  why the integration uses the legacy read-only search endpoint.
- The provider documents **10 search requests/minute/IP** and specifically
  discourages search-as-you-type. Our app sends requests **only when the user
  presses Search online**, limits results to 12 and fields to those needed,
  and caps requests to six per minute per browser tab. No API key is embedded.
- Browsers do not allow JavaScript to set a custom User-Agent. The browser
  sends its normal User-Agent; our request identifies the client with
  `app_name=HealthTracker` and `app_version=0.1.0`. For broader public
  deployment, register the application's API usage with Open Food Facts and
  review its terms. A proxy/backend is **not** part of the app.
- Some generic/unpackaged foods, regional products, or nutrition labels will
  not be available. Nutrition is user contributed and **not guaranteed
  correct**. Always verify the packet label.

Official API docs: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/.

USDA FoodData Central is **not** integrated: its official API requires a key
that must not be shipped in a public client-side application. No credentials
or secrets are added.

## What leaves the device

Only the **typed product search text**, along with ordinary browser HTTP
metadata (e.g. IP/User-Agent), is sent to Open Food Facts on an explicit
click. The app does not send logged meals, profile details, goals, weight,
dates, analytics, or IndexedDB contents. No remote account, database,
automatic background search or synchronization is introduced.

## What is recorded

An imported suggestion sets the name, known nutrition-label fields and an
explicit reference basis (100 g or, for products explicitly presented by
volume, 100 ml). For drinks, the fluid amount remains separate from
calories. Selecting a locally saved drink with a declared fluid volume per
serving will scale the logged fluid amount from its selected serving count;
missing volumes remain unknown and no density conversion is assumed. The user chooses and can edit the **consumed quantity**, compatible
unit and each nutrient before committing. No grams-to-ml conversion is
invented. Unknown nutrient fields remain null, while explicitly known
zero stays zero.

`FoodEntry` includes an optional `nutritionSource` object containing
provider, product code and lookup timestamp. This preserves attribution
through local editing, recent-log reuse and JSON backup/restore.
Historical reference and consumed nutrient snapshots remain immutable
relative to later changes in the public catalog. Existing entries retain
their data and do not require a schema migration; the optional provenance
field is supported by backup validation.

Saved-food suggestions read Dexie **locally** and are still available
offline. Online lookup failure does not prevent free-text logging, existing
saved-food selection or entry editing.

## Verification

Vitest mocks the provider payload and network response. Chromium E2E
intercepts and fakes the external response to test opt-in search,
selection, unit basis, nutrient mapping, sodium conversion, blank
unknown values, quantity scaling and immutable logged provenance.
It also tests local saved-food combobox suggestions without network use.
Manual testing remains required for real-provider CORS/rate behavior,
accuracy, regional coverage, iOS Safari and Android Chrome.

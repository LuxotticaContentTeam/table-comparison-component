# Product Comparison Table

Cross-brand landing page module: a **comparison table** between two or more
products. Desktop shows every product as a column; mobile always shows two and,
when the json holds more, adds a dropdown over each column to swap which two.

Nothing about the brand or the number of products is hardcoded. The table is
built from the content json: N products become N columns, N attributes become N
rows. Adding a product means adding an object to the json — no code, no markup.

Built on `dev-boilerplate-modules`, with the build pipeline taken from
`4-card-section-module` (which fixed a number of boilerplate bugs — see
[The build pipeline](#the-build-pipeline)). This repository is independent from
both: no shared remote, no shared history.

Design: Figma `SGH - RB META APEROL` — `1020-42173` desktop, `1020-47170`
mobile, `1020-36519` the title (which the Figma files under mobile but which
ships on desktop too). **The CSS is SGH's, at every product count.** Two frames
in `LC_RBM Aperol - Luna` were read for structure the SGH file does not cover —
`5720-35673` (three products on desktop) and `5720-35891` (the compact product
switcher) — but that is a different brand's design system and none of its
values ship here. See [Design](#design).

**HANDOFF.md** sits next to this file and covers what this one does not: the
decisions taken and why, what was tried and rejected, the storefront research
behind `productApi.js`, and the traps already paid for once. Read it before
picking the work back up.

## Requirements

- Node.js >= 20
- Gulp 4 CLI

## Commands

| Command | What it does |
| --- | --- |
| `npm ci` | Install the exact locked dependencies. Use this over `npm install`: it is what CI runs. |
| `npm run dev` / `npm run serve` | Prompts for variant and language, then serves on <http://localhost:347> with BrowserSync. |
| `npm run build` | Production build into `dist/`; optionally creates a versioned `release/`. |
| `npm run new` | Scaffold an additional brand variant. |
| `npm run remove` / `npm run delete` | Delete a variant. Same task under two names. |
| `npm run proxy` | CORS-Anywhere proxy for local API calls. |

### Running without the prompts

Both commands normally prompt: `dev` asks for the variant and then the language,
`build` asks whether to cut a release and then for the variant (a production
build ships every locale, so it never asks for one). Set `VARIANT` and the
questions are skipped — this is what makes the build usable in CI, where there
is no terminal to answer them:

```bash
VARIANT=SGH npm run build              # one brand
VARIANT=SGH RELEASE=yes npm run build  # and write release/SGH/<version>/
```

| Variable | |
| --- | --- |
| `VARIANT` | Required to skip the prompt. Must exist in `projectConfig.json` > `variants`; an unknown value fails the build instead of silently building the wrong brand. |
| `LANGUAGE` | Optional, and dev-only — a production build ships every locale in one json. Defaults to the variant's first locale. Must be one the variant actually has. |
| `RELEASE` | Optional, `yes`/`true`/`1` to also produce `release/<VARIANT>/<version>/`. This is the "Create release?" prompt. |

Building several brands means running the build once per variant — the pipeline
handles one variant per run by design and wipes `dist/` between runs. Only
`release/` keeps them side by side.

## Where things are

```
src/
  views/main/main.pug                        module container + table skeleton, shared
  views/main/<BRAND>/main.pug                brand-specific markup, if any
  views/main/<BRAND>/live/live.html          asset script tag for the release preview (build tokens, not hand-edited)
  scss/critical.scss                         the only css that travels in the fragment
  scss/components/_comparison-table.scss     layout, toggle, dropdowns — shared
  scss/variants/<BRAND>/_variables.scss      design tokens, per brand
  scss/variants/<BRAND>/main.scss            imports the shared component
  js/main.js                                 entry: css, json, info store, lazy init
  js/contents.js                             builds the table from the json
  js/modules/bootstrap.js                    injects the stylesheet, fetches the json
  js/modules/comparisonState.js              which products are on screen, filter state
  js/modules/productApi.js                   live price, PDP link and packshot
  js/variants/<BRAND>/info_store.js          locale detection, per brand
  json/variants/<BRAND>/json.json            copy, rows and products, per locale
  static/images/<BRAND>/                     images, namespaced per brand
  static/fonts/<BRAND>/                      dev-only webfonts
```

Brand-named folders under `static/` are filtered at build time
(`tasks/staticAsset.task.js`): a build of one brand does not ship another
brand's images or fonts.

## The content json

One file per brand, `src/json/variants/<BRAND>/json.json`. Everything the module
renders comes from here, except price, PDP link and packshot — see
[Live product data](#live-product-data).

```jsonc
{
  "comparison": {
    // Shared strings. They live at this level on purpose: they are the same
    // for every product, so repeating them per product would be N chances to
    // let the copy drift.
    "title":                { "en-us": "Tech highlights" },
    "subtitle":             { "en-us": "See what’s been added and enhanced…" },
    "onlyDifferencesLabel": { "en-us": "Only show differences" },
    "shopNowLabel":         { "en-us": "Shop now" },
    "priceLabel":           { "en-us": "Starting from" },
    "selectLabel":          { "en-us": "Select a model" },
    "selectorIcon":         "SGH/chevron-down.svg",      // chevron on the compact switcher

    "api": { "store": { "en-us": { "storeId": "10152", "langId": "-1" } } },

    // The ROWS. Label and filter flag are declared once, here — not repeated
    // inside every product.
    "rows": [
      { "id": "camera",  "label": { "en-us": "Camera" },  "hideWhenOnlyDifferences": false },
      { "id": "meta-ai", "label": { "en-us": "Meta AI" }, "hideWhenOnlyDifferences": true  }
    ],

    // The PRODUCTS. Array order is column order. Two or more.
    "products": [
      {
        "id": "rbm-gen-3",
        "upc": "8056597988377",                              // reference only, nothing resolves from it
        "pdpUrl": "/us/ray-ban-meta/rw4006-8056597988377",   // fallback, and how productId is scraped
        "productId": "3074457345618661050",                  // the fast path: one request, no scraping
        "name": { "en-us": "Ray-Ban | Meta Gen 3" },
        "meta": { "en-us": "3 Colors" },                     // the small line above the name
        "family": { "en-us": "Ray-Ban Meta" },               // eyebrow in the compact switcher
        "shortName": { "en-us": "Gen 3" },                   // its value; falls back to `name`
        "badge": {
          "label": { "en-us": "Camera + Audio" },
          "icon": "SGH/badge-photo.svg"                      // relative to the environment image path
        },
        "cells": {
          // A cell value is one string, or a list of specification lines.
          // The list is the common case: each line becomes its own paragraph,
          // so the copy breaks where it was written to break rather than
          // wherever the column happens to end.
          "camera":  { "value": { "en-us": ["Camera resolution: 12 MP ultra-wide", "Image capture: 3024x4032 pixels"] } },
          "meta-ai": { "value": { "en-us": ["AI Chatbot", "Live AI"] } }
        }
      }
    ]
  }
}
```

The examples above show one locale per value for readability; the file itself
carries `en-us` and `en`, and any other locale is optional — see
[Language](#language).

**`cells` is an object keyed by row id, not an array.** A positional array
would mean every product has to be re-ordered in step whenever a row moves, and
a product one entry short would shift every cell below it into the wrong row
with nothing to warn you. Keyed by id, a missing cell is just a missing cell.

**`hideWhenOnlyDifferences` sits on the row, not on the cell.** The row is by
definition the same question asked of every product, so the answer to "does
this row disappear when the filter is on" is one answer. Repeating it per
product would allow two products to disagree about their shared row, and
something would then have to arbitrate.

### The "only show differences" toggle

It is rendered **only when the table holds exactly two products.**

This is not only what the design shows — the three-product frame has no toggle —
it is the only case where the flag means anything. With three products a row can
be identical for A and B and different for C, so "hide the rows that are the
same" has no single answer, and a flag authored once per row would be wrong for
at least one pair. Rather than guess, the toggle is not offered.

### Adding a product

Append an object to `products`. Give it an `id` unique within the file, a
`name`, and a `cells` entry for every row id. That is all: the table grows a
column, and below the desktop breakpoint the switchers appear by themselves as
soon as there are more than two products.

Add `family` and `shortName` too if the table will ever hold more than two
products — they are what the switcher shows, and without them it falls back to
the full name on one line.

### Adding a row

Append an object to `rows`, then add a cell under that id to **every** product.

## Live product data

Price, PDP link and packshot go stale on their own, so they are not authored.
They come from the storefront:

```
GET /wcs/resources/store/{storeId}/products/{productId}?langId={langId}
```

The call is **relative**, so it is same-origin and needs no CORS header —
unlike the content json, which is fetched from the asset host. `storeId` and
`langId` come from `comparison.api.store` when authored, otherwise from
`window.ct_data`. Verified on `stage.sunglasshut.com` (store `10152`, catalog
`20602`).

What the module takes from the response:

| | Field |
| --- | --- |
| price | `prices` — see [Which price](#which-price), it is not the obvious one |
| PDP link | `links.url` |
| packshot | `images[]` sorted by `sequence`, falling back to `variantImageUrl` |
| name | `brand` + `model`, used only if the json authors none |

The response also carries `frameMaterial`, `lensMaterial`, `lensColor`,
`frameColor`, `polarized`, `frameShape`, `size`, `fit`, `madeIn` and more.
Those are **not** read: the comparison copy is editorial and translated, and
the API returns English attribute values that would bypass the content json.

### Which price

A product carries **several price lists**, and picking the wrong one puts a
plausible, wrong number on a live page. Neither "the first one" nor a fixed
preferred name is right. The rule, in `pickPrices` (`modules/productApi.js`):

1. **Ignore `RxPriceList*`.** It quotes the frame fitted with prescription
   lenses — a different product from the sunglasses on the page, and often
   cheaper.
2. **The list price is the highest `listPrice`** among the remaining lists.
3. **A promotion counts only when its date window is open now.** A list with no
   `startDate` / `endDate` is *not* a promotion.
4. No live promotion → one number, the list price. Otherwise the offer, the list
   price struck through, and the storefront's own `badge` string, which is shown
   verbatim rather than recomputed.

Step 3 is the one that is easy to get wrong, and it is not a guess. On
`rb3548n` the `Extended Sites Catalog Asset Store` list quotes 191 → 153 with
**empty** dates, and the PDP shows a flat $191 — the entry is data that is not
in force. Honouring it would have advertised a 20% discount that does not
exist.

Derived from four live PDPs and then confirmed by predicting a fifth:

| product | what the module renders | what the PDP shows |
| --- | --- | --- |
| `rb3548n` | `$191.00` | `$191.00` |
| `tf4214u` | `$244.50` / `$489.00` / 50% off | identical |
| `jc4011` | `$293.30` / `$419.00` / 30% off | identical |
| `ar8146` | `$270.90` / `$387.00` / 30% off | identical |

If prices ever start disagreeing with the PDP, this is the function to re-derive
— against real PDPs, not against the payload alone.

### ⚠️ The endpoint takes a product id, not a UPC

There is no lookup by UPC on Sunglass Hut. Verified, all of these fail:

| Tried | Result |
| --- | --- |
| `/products/<upc>` | 200 with an empty `{}` — no 404, so nothing raises |
| `/products/byUpc/<upc>`, `/products/upc/<upc>`, `/products?upc=` | 404 |
| `/customProductInfo/byPartNumbers/<list>` (what persol.com uses) | 404 — not deployed on SGH |
| `/productview/byPartNumber`, `/bySearchTerm`, `/byIds` | 404 |
| site search by UPC | 404 |

The PDP url is not UPC-routed either: the model slug is significant, so
`/us/ray-ban/xxx-8053672689679` is a 404 while the real slug answers 200.

So a product needs one of two things in the json:

- **`productId`** — the fast path. One request per product, nothing to scrape.
  This is what a shipping json should carry.
- **`pdpUrl`** — the fallback. The module fetches the PDP once and reads
  `product-id="…"` out of its markup, then makes the same request. It costs an
  extra ~170 KB html round trip per product and breaks if that attribute is
  ever renamed.

`upc` is always authored as the human-readable key, but nothing resolves from
it.

**To get a `productId` from a PDP url:**

```bash
curl -s "https://stage.sunglasshut.com/us/ray-ban/rb3548n-8053672689679" \
  | grep -oE 'product-id="[0-9]+"' | head -1
```

Ids are not all the same shape — `732332` and `3074457345618661580` are both
real — so treat them as opaque strings.

**Nothing blanks the column.** The table is built from the authored json first
and enriched with whatever the API returns. A dead product costs that column its
price, not the module.

## Language

The locale comes from the **`lang` attribute on the `<html>` tag** and nothing
else:

| | `/us` | `/ca-en` | `/ca-fr` |
| --- | --- | --- | --- |
| `<html lang>` | `en-US` | `en-CA` | `fr-CA` |
| -> `info_store.lang` | `en` | `en` | `fr` |
| -> `info_store.country` | `en-us` | `en-ca` | `fr-ca` |

It is server-rendered — already in the markup before any script runs — so the
module resolves its locale on the first tick and renders immediately. This
replaced a `ct_data` / `wcs_config` lookup that is deprecated, lands seconds
after navigation on a cold load, and whose globals disagree with each other.

`ct_data` is still read for `storeId` / `langID`, because it is the only place
the storefront publishes them — but never for the locale, and an authored
`comparison.api.store` entry wins over it.

Every translatable value in the json is an object keyed by locale, resolved
through `getTrad()` (`src/js/modules/utils.js`) — the same function, line for
line, as in `4-card-section-module`.

**No locale is mandatory.** A missing key is not an error, it is the normal
state of a market whose copy has not landed yet. The lookup walks:

| | Looks for | Example on a `fr-CA` page |
| --- | --- | --- |
| 1 | the exact `country` | `fr-ca` |
| 2 | the `lang` alone | `fr` |
| 3 | any key starting with `lang` | `fr-fr`, `fr-be`… |
| 4 | `en-us` | the shipped copy |
| 5 | `en` | |
| 6 | the first key present | |

So a language with no copy of its own renders English rather than nothing, and
adding a language means adding its key next to `en-us` — nothing else changes,
in the json or in the code:

```jsonc
"shopNowLabel": {
  "en-us": "Shop now",
  "en":    "Shop now",
  "fr":    "Acheter"      // added later; every other locale keeps falling back
}
```

⚠️ **The one rule: never leave a key as an empty string.** Steps 1–3 match the
key, not its content, so an empty `fr-ca` renders blank instead of falling
through to `fr`. A locale with no copy yet has **no key at all**.

The json ships **eight** locales — `en-us`, `en`, `fr`, `fr-ca`, `es`, `es-mx`,
`de`, `nl` — the same set `4-card-section-module` carries for this campaign, so
the two modules read as one campaign on the same page. Shared wording and the
register of each language (`fr`/`fr-ca` vouvoiement, `de` *du*, `es` *tú*, `nl`
*je*) were taken from that file rather than invented here.

`en` is strictly belt and braces — step 3 would already reach `en-us` from any
`en-XX` market — but it makes the fallback visible to whoever adds the next
locale. A market with no key of its own, `it-IT` say, still renders the English
copy rather than nothing.

⚠️ Only `en-us` and `en` are the transcribed Figma copy. The other six were
produced against `4-card-section-module`'s approved terminology and have **not
been through the copy team** — see `_meta.translationStatus` in the json.

There is no project-wide locale list: the keys present in a brand's json **are**
that brand's locale list, and that is what the dev prompt offers
(`tasks/prompt.task.js` > `localesForVariant`).

One thing is deliberately **not** a translation: `comparison.api.store` is
looked up by exact `country`, then `lang`, and never falls back to English. A
store id is market configuration, not copy — an unlisted market falls back to
`window.ct_data`, which is right, where inheriting the US store id would be
silently wrong.

### Other brands: check before porting this

⚠️ **The `<html lang>` approach is verified on sunglasshut.com only.** Before
copying it into another brand's `info_store.js`, on that brand's live storefront
and on every market it ships to:

1. Read `document.documentElement.getAttribute("lang")`.
2. Confirm it is **present** and in the expected `xx-YY` shape. Some storefronts
   ship a bare `<html>`, some a bare `"en"`, some set it from JS after load — in
   which case reading it once at startup gets nothing.
3. Confirm it **changes between markets**. An attribute hardcoded to `en-US`
   everywhere is worse than the globals: the module renders English copy on a
   French page with no console message.

Then check whether that brand exposes `ct_data.storeId`, or author the store ids
under `comparison.api.store`.

## Adding a brand

```bash
npm run new
```

It asks for the brand code, an optional variant suffix, and which existing
variant to copy from. **Prefer copying from a brand that already ships** (SGH
today) rather than `Default`: you inherit real design tokens and real json to
edit down instead of placeholders.

The scaffolding creates `src/{js,scss,json}/variants/<BRAND>/` and
`src/views/main/<BRAND>/`, and adds the variant to `projectConfig.json`. It does
**not** create `src/static/images/<BRAND>/` or `src/static/fonts/<BRAND>/` — add
those by hand.

⚠️ `src/scss/variants/<BRAND>/main.scss` must keep its
`@import "../../components/comparison-table"`. The markup is shared, the styling
is not: without that import the table renders unstyled and **nothing warns you**
— Sass compiles happily.

## Configuration

`projectConfig.json`

| Key | Value | Notes |
| --- | --- | --- |
| `projectName` | `table-comparison-component` | Drives the container id `#ct_cm--table-comparison-component`, the config object `ct_cm__tableComparisonComponentConfig` and the `data-ct-css` marker on the injected stylesheet. Brand-neutral on purpose: every variant shares them. |
| `variants` | `SGH` | Brand code is the part before the first `_`, and must exist in `BRANDS` in `tasks/_config.js`. |

Asset paths live in `package.json` > `projectConfigurations.paths`, and both
production values are set:

| Key | Value | Notes |
| --- | --- | --- |
| `productionAsset` | `https://media.sunglasshut.com/table-comparison-component/` | The one that matters for a live fragment. Every runtime url — stylesheet, json, script — is derived from it, substituted into the bundle as `@assetPath@`. Trailing slash included, always. |
| `productionImage` | `https://media.sunglasshut.com/table-comparison-component/img/` | Where a relative image value in the json resolves, as `@imagePath@`. The brand folder is part of the json value, so the chevron lands at `…/img/SGH/chevron-down.svg`. |
| `developmentAsset` / `developmentImage` | `./` and `./static/images/` | The same two tokens in a dev build, served by BrowserSync out of `dist/`. |

There is no `productionConf`. The boilerplate declared one and substituted it as
`@confPath@`, but no source file has ever read that token — the json url is
built from `productionAsset` like every other runtime url — so the key, its
development twin and the substitution were removed rather than left to look
meaningful.

## The build pipeline

Taken wholesale from `4-card-section-module` rather than from the older
boilerplate this repo was created from. What that brings over the boilerplate:

| | |
| --- | --- |
| `tasks/buildFragment.task.js` | new — produces `fragment.html`, the CoreMedia deliverable |
| `tasks/_config.js` | adds `assetPath`, derived from `productionAsset` |
| `tasks/script.task.js` | substitutes `@assetPath@` into the bundle |
| `tasks/json.task.js` | rewritten: `json__<version>.json` fetched at runtime instead of a `json.js` script |
| `tasks/style.task.js` | fixes a real bug — `Promise.all` over gulp streams resolved immediately, so `dist/css` came out empty on a build from a clean checkout; also injects `$bannerName` into `critical.scss` |
| `tasks/clean.task.js` | adds `cleanRelease`, scoped to the one `release/<VARIANT>/<version>/` about to be written |
| `tasks/prompt.task.js` | `VARIANT` / `LANGUAGE` / `RELEASE` from the environment, so CI works without a TTY |
| `tasks/staticAsset.task.js` | ships only the current brand's images and fonts |
| `tasks/views.task.js` | substitutes `@assetPath@` / `@buildVersion@` into `live/live.html`, so the release preview page follows `package.json` instead of carrying hand-written `[PATH]` / `[VERSION]` placeholders that went stale at every version bump |

The repo uses **npm**, not pnpm: `npm ci` against a committed
`package-lock.json` is what the deploy workflows run.

## How content flows

The markup is a **static skeleton** — two product columns and a few rows, enough
that the section occupies space instead of appearing out of nothing. It is
deliberately generic and is **not** generated from the json, so changing the
content never obliges you to re-paste the html into CoreMedia.

At runtime, in order:

1. `src/js/modules/bootstrap.js` injects the real stylesheet into `<head>` and
   fetches `json__<version>.json` from the asset host.
2. `src/js/variants/<BRAND>/info_store.js` resolves the locale.
3. `src/js/contents.js` replaces the skeleton with the real table — N columns,
   N rows, all copy resolved for the locale.
4. `src/js/modules/productApi.js` fills in price, PDP link and packshot as they
   arrive, in parallel, one request per product.

All of it is **lazy**: `src/js/modules/lazy.js` holds everything back until the
section enters the viewport (IntersectionObserver, with a scroll listener as
backup), so a module below the fold costs the page nothing until it is scrolled
to.

## Analytics

Every clickable element carries a `data-tracking-id`. `modules/analytics.js`
(inherited unchanged) picks them up on each render and pushes to
`tealium_data2track`:

```
data_element_id  = X_ProductComparisonPlacement_<data-tracking-id>
data_description = <data-tracking-description>
```

| Element | `data-tracking-id` | Description |
| --- | --- | --- |
| "Only show differences" switch | `ToggleOnlyDifferences` | the label copy |
| CTA under a column | `ShopNow_<product id>` | the product name |
| opening a compact switcher | `OpenProductSelector_<1\|2>` | the product on screen |
| choosing a product in it | `SelectProduct_<product id>` | its short name |

The product half is **the json's own `products[].id`**, so a row in an analytics
report points straight back at an object in the content json — `ShopNow_rbm-gen-3`
is the CTA of the product authored as `rbm-gen-3`, with no lookup table in
between.

The prefix is set in `main.js`. It is deliberately **not** the boilerplate's
`X_@projectName@Placement`: that token resolves to the repo name and would put
`table-comparison-component` — hyphens, and the word "component" — into every
row. No placement name was assigned by the analytics team, so the rule adopted
is simply that the id reads as what it is.

Two inherited behaviours worth knowing, because they surface in the data:

- **spaces are stripped** from the description (`replaceAll(" ", "")`), so
  "Gen 3" arrives as `Gen3`;
- **a non-`<a>` element pushes after a 1 second delay**, `<a>` pushes
  immediately — the delay exists so a click that navigates is not raced.

In a dev build there is no Tealium, so `analyticsPush` falls back to
`console.log` and every event is readable in the console.

## Shipping the module

A build produces **two** deliverables, from the same sources, both in `dist/`.

| | `espot.html` | `fragment.html` |
| --- | --- | --- |
| Contains | everything inlined: full css, skeleton, json, bundles | critical css, skeleton, one `<script src>` |
| Needs an upload | no | yes — css, json and js go on the asset host |
| Use it for | a self-contained paste, no hosting available | **a CoreMedia row** |

`fragment.html` is the one to paste into CoreMedia. The only css it carries
inline is `scss/critical.scss` — geometry only, so the empty skeleton occupies
roughly the space the filled table will and the page does not jump.

### Publishing it, step by step

**1. The asset base url is already set** — this step is done, and is here so
the mechanism is on record. `package.json` > `projectConfigurations.paths`:

```json
"productionAsset": "https://media.sunglasshut.com/table-comparison-component/",
"productionImage": "https://media.sunglasshut.com/table-comparison-component/img/"
```

Every runtime url — stylesheet, json, script — is derived from the first value,
substituted into the bundle at build time as `@assetPath@`; relative image
values in the json resolve against the second, as `@imagePath@`. Nothing else
hardcodes either. Both need the **trailing slash**: the module concatenates, it
does not join paths.

**2. Bump `package.json` > `version`** before cutting a release the previous one
must outlive. Nothing increments it: build twice without touching it and the
second run writes over `release/SGH/0.0.1/` — same folder, same filenames. That
is what you want while iterating and exactly what you do not want once a version
is live, because the urls in the fragment carry the version.

**3. Build with `RELEASE=yes`:**

```bash
VARIANT=SGH RELEASE=yes npm run build
```

Everything to upload is now in `release/SGH/<version>/`.

**4. Upload by FTP** — three files from the release, **all three into the
folder `productionAsset` points at**, side by side. No subfolders for these: the
urls the module builds are the base url plus the file name, nothing in between.

| File from `release/<BRAND>/<version>/` | Url it answers at |
| --- | --- |
| `main__<version>.min.js` | `<base>/main__<version>.min.js` |
| `main__<version>.min.css` | `<base>/main__<version>.min.css` |
| `json__<version>.json` | `<base>/json__<version>.json` |

**The two SVG icons are separate**, and are uploaded **once** rather than at
every release: they are not versioned and the release folder does not contain
them. They go under `img/`, keeping the brand folder, because that is what the
json values say:

| File from `src/static/images/<BRAND>/` | Url it answers at | Who reads it |
| --- | --- | --- |
| `badge-photo.svg` | `<base>/img/SGH/badge-photo.svg` | `products[].badge.icon` |
| `chevron-down.svg` | `<base>/img/SGH/chevron-down.svg` | `comparison.selectorIcon` |

A json value that is already an absolute url is left alone instead
(`isSelfContainedUrl` in `contents.js`), which is how `4-card-section-module`
points at campaign folders. Either style works; relative plus `productionImage`
is what this module ships.

**5. Check the five urls answer 200** in a browser before going further. A 404
on one of the three release files is the usual cause of a blank module; a 404 on
an icon costs only the icon.

**6. Paste `dist/fragment.html`** — the whole file, from `<style>` to
`</script>` — into the CoreMedia row. Nothing else goes in the row.

**7. Open the page and confirm** the table fills in. If it does not, the console
carries a `[table-comparison-component]` message saying what failed.

#### Two things that bite

The json is fetched **cross-origin**: the page is on `www.<brand>.com`, the
asset on `media.<brand>.com`. The asset host must send
`Access-Control-Allow-Origin`, otherwise the browser blocks the fetch and the
table stays empty. The stylesheet and the script are not affected — only the
json. The product API is same-origin and is not affected either.

**One instance per page.** The module keys off the element id
`#ct_cm--table-comparison-component`, so pasting the fragment twice into the
same page fills only the first copy.

### Changing the content later

Edit `src/json/variants/<BRAND>/json.json`, rebuild, and re-upload **only**
`json__<version>.json`. The css and the js do not change, and the fragment
already in CoreMedia does not have to be touched — including when you add or
remove a product or a row, because the skeleton is generic and the real table
is built at runtime.

The exception is `scss/critical.scss`: it is **inlined into `fragment.html`**,
so a stale copy in CoreMedia keeps overriding the stylesheet you upload
afterwards. Re-paste the fragment whenever the critical css changes —
re-uploading the three asset files is not enough.

## Design

**This release is SGH, and its CSS stays SGH at every product count.** Three
products do not change a colour, a radius or an alignment — only how many
tracks the grid has.

The LC frames were read because the SGH file does not draw a three-product
desktop table or the compact switcher, and structure was needed from somewhere.
Nothing else was taken from them: they are another brand's design system, and
the difference is not cosmetic —

| | SGH (what ships) | LC (read for structure only) |
| --- | --- | --- |
| headings | Acta Headline Book | Inter Bold, uppercase |
| body | Helvetica Neue | Inter |
| cell background / radius | `#f7f7f7` / 2px | `#f2f2f2` / 16px |
| product column | left aligned | centred |
| row gap | 8px | 24px |
| section padding | 40px | 64px |

The markup is one grid and one set of class names, and every value above is a
token in `scss/variants/<BRAND>/_variables.scss`. So an LC variant, when one is
wanted, is a token file rather than a second stylesheet — but it is not what
this release builds.

### The layout

One CSS grid governs the whole table: `200px` for the row labels, then one
track per product. The head, the body and each row are `display: contents`, so
they carry the table semantics (`role="row"`, `role="rowgroup"`) without
contributing a box — their cells participate in the table's own tracks, which
is what keeps a long label in one row aligned with the columns of the next.

Below 1025px the grid becomes two equal tracks, the label leaves the first
column to span the row above its cells, and the packshot is dropped — at 375px
two columns leave no room for a 240px image, which is exactly what the mobile
frame does.

The switch is a real `<input type="checkbox">`, visually hidden, with the track
and knob drawn next to it: the label, the keyboard and screen readers keep
working and the css only has to move the knob. It sits **inside** the grid as an
item spanning every track, because the design puts it between the product
columns and the rows.

### The compact product switcher

Figma `LC_RBM Aperol - Luna` `5720:35891`: a bordered control above each of the
two columns, carrying a small grey eyebrow ("RAY-BAN META"), the model below it
("Gen 2 Optics") and a chevron. Structure from there, colours and fonts from
SGH, and its corner radius is SGH's cell radius rather than LC's 6px input
radius.

It is a listbox, not a `<select>`, and that is the rule's doing rather than a
preference. "Each dropdown offers only the products not already in a column"
cannot be expressed by a native select: a select must carry its selected value
as an option or it has nothing to display, so the current product would always
be in its own list. With the current product as the trigger label, the list
holds exactly the available products and nothing else.

It needs two strings the column header does not: `family` for the eyebrow and
`shortName` for the value. Both are optional — without them the control falls
back to the full `name` on one line.

### What the design did not specify

- **The switch's off state.** Figma exports it in one state only — 44x24, black
  track, knob right, which is ON. `$color-switch-off` is the one invented value
  in the token file.
- **The switcher's open state.** Only the closed control is drawn. The list
  therefore borrows the trigger's own box language — same border, same radius,
  same type — rather than inventing a second one.

### Figma inconsistencies, normalised

- The mobile frame labels the memory row **VIDEO** where desktop labels it
  **MEMORY**, with the same content in both. Desktop wins.
- The product names differ between frames: "Ray-Ban | Meta Gen 3" on desktop,
  "Ray-Ban Meta Wayfarer Gen 3" on mobile. Desktop wins.
- Case weight reads "133 gr" on desktop and "133g" on mobile. Desktop wins.

## What is verified

Run against the real storefront through `npm run proxy`:

- the table builds N columns by M rows from the json alone — two products gave
  two columns, adding a third gave three columns and three cells per row on
  desktop, with no code change;
- prices, packshots and PDP links come from the storefront and match the live
  PDPs exactly (four products checked, see [Which price](#which-price)). The
  API's `links.url` also corrects an authored PDP path that had gone stale,
  which is the point of reading it rather than trusting the json;
- the switchers follow the rule literally: with three products and Gen 3 |
  Gen 2 on screen, each list holds **only** Gen 2 Optics — not the product in
  its own column — and choosing it moves that column and leaves both lists
  holding only Gen 3. Opening one sets `aria-expanded` on that one alone, and
  choosing closes it;
- the toggle renders only in the two-product table and hides exactly the five
  rows the designer annotated "Don't show in differences";
- the desktop layout matches `1020-42173` and the compact layout, measured in a
  390px viewport, matches `1020-47170`: two 171px columns, no packshot, the
  label spanning the row left-aligned above its cells, 8px cell padding and a
  full-width CTA;
- `npm run build` is green and produces an 8 KB `fragment.html` — critical css,
  skeleton, one `<script src>`.

Re-verified on 17 September 2026, after the asset urls, the analytics ids and
the project name were set:

- `VARIANT=SGH RELEASE=yes npm run build` is green and **no placeholder survives
  anywhere in `dist/` or `release/`** — the fragment's `<script src>`, the
  bundle's asset and image urls and the preview page's script tag all carry
  real values, and the container id reads `ct_cm--table-comparison-component`;
- the module renders against the live storefront through `npm run proxy`: nine
  rows, two columns, `Starting from $224.00` / `$247.00`, and both CTAs pointing
  at the canonical `/us/ray-ban-meta-gen-1/…` paths the API returns rather than
  the stale `/us/ray-ban-meta/` authored in the json;
- both icons and the packshot answer and decode — the 16x16 SVGs off the dev
  server, the 1920x960 packshot off `assets2.sunglasshut.com`. In the page they
  report `complete: false` for a while because they are `loading="lazy"` inside
  a `content-visibility: auto` container; that is the trap in HANDOFF.md, not a
  broken path;
- with a third product added temporarily and the page measured in a 390px
  iframe: two columns out of three products, a switcher over each, each list
  holding only the product not on screen, no toggle;
- the analytics events fire with the new ids and a description on every one:
  `X_ProductComparisonPlacement_OpenProductSelector_1 | Gen3` then
  `X_ProductComparisonPlacement_SelectProduct_rb-hexagonal | Hexagonal`, and the
  column switched while both lists moved on to offering Gen 3.

## Open items

### Before it can go live

- **The product codes in the json are placeholders.** The copy is the real
  Gen 3 / Gen 2 comparison from Figma, but `productId` / `upc` / `pdpUrl` point
  at two real Ray-Ban Meta products on stage so the module can be seen working
  end to end. Swap the two objects in `comparison.products` when the real codes
  land. "The endpoint takes a product id, not a UPC", under [Live product
  data](#live-product-data), has the one-liner that resolves a `productId` from
  a PDP url.
- **The two SVG icons have to be uploaded once** to
  `<base>/img/SGH/`. They are not in the release folder and are not versioned —
  see [Publishing it, step by step](#publishing-it-step-by-step), step 4.
- **The deploy workflows have never run.** `.github/workflows/deploy-uat.yml`
  and `deploy-prod.yml` need repository or organisation values that this repo
  has never exercised: secrets `ID_RSA`, `ID_RSA_PUB`, `CACHE_CLIENT_TOKEN`,
  `CACHE_CLIENT_SECRET`, `CACHE_ACCESS_TOKEN`, `CACHE_BASE_URI`, and variables
  `SOURCE_FOLDER`, `DEST_FOLDER_PROD`, `PROD_URL`. Confirm they exist and point
  where this module expects before dispatching either workflow.

### Known, and deliberate

- **The switch's off-state colour and the switcher's open state are not in
  Figma** — see
  [What the design did not specify](#what-the-design-did-not-specify).
  `$color-switch-off` is the only invented value in the token file.
- **One brand** — only SGH exists. The module is built to be cross-brand, but
  every other brand needs its own tokens, copy, locale detection and store ids,
  and each must be verified on its own storefront. See [Other brands: check
  before porting this](#other-brands-check-before-porting-this).
- **Six of the eight locales are unreviewed.** The json carries `en-us`, `en`,
  `fr`, `fr-ca`, `es`, `es-mx`, `de`, `nl`; only the two English keys come from
  Figma. The rest follow `4-card-section-module`'s terminology and still need a
  copy-team pass. Any market with no key falls back to English on its own. See
  [Language](#language).
- **The analytics placement name is ours, not the analytics team's.**
  `X_ProductComparisonPlacement` was chosen to read well in a report because no
  name was assigned. If one is assigned later it is a one-line change in
  `main.js`; the per-element ids do not move. See [Analytics](#analytics).

### Closed since the first build

Kept short, because the reasons are the useful part and they live in
HANDOFF.md.

| Was | Now |
| --- | --- |
| `productionAsset` / `productionImage` were `TODO_…` | real urls under `media.sunglasshut.com/table-comparison-component/` |
| `[PATH]` / `[VERSION]` hand-written in `live/live.html` | build tokens, substituted by `views.task.js` |
| project name misspelled `tabel-comparison-component` | `table-comparison-component`, in the code and on the GitHub remote |
| analytics prefix was the boilerplate's `X_@projectName@Placement`, selector options untracked | a documented id scheme, four tracked interactions, a description on each |
| `productionConf` declared and substituted, read by nothing | removed, with `developmentConf` and the `@confPath@` substitution |
| the dropdown was described as listing its own current product | it is a listbox whose list holds only the products not in a column — the description was stale, the code was already right |

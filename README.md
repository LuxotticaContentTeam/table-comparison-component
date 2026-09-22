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

Two brands ship today, each from its own design file and its own tokens:
**SGH** from Figma `SGH - RB META APEROL` (`1020-42173` desktop, `1020-47170`
mobile, `1020-36519` the title, which the Figma files under mobile but which
ships on desktop too) and **LC** from `LC_RBM Aperol - Luna` (`5720-35673`
desktop, `5720-35891` compact). Nothing of one brand's design reaches the
other's build. See [Design](#design).

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
  scss/components/_comparison-table.scss     layout, toggle, dropdowns — shared
  scss/components/_critical.scss             the only css that travels in the fragment — shared
  scss/variants/<BRAND>/_variables.scss      design tokens, per brand
  scss/variants/<BRAND>/main.scss            imports the shared component
  scss/variants/<BRAND>/critical.scss        imports the shared critical css
  js/main.js                                 entry: css, json, info store, lazy init
  js/contents.js                             builds the table from the json
  js/modules/bootstrap.js                    injects the stylesheet, fetches the json
  js/modules/comparisonState.js              which products are on screen, filter state
  js/modules/productApi.js                   orchestrates the product lookup — brand-agnostic
  js/variants/<BRAND>/info_store.js          locale detection, per brand
  js/variants/<BRAND>/product_service.js     which storefront service to call, and how to read it
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
    // No title or subtitle. The heading above the table is authored by the
    // editor in CoreMedia, as its own row above this one — see The heading.
    "onlyDifferencesLabel": { "en-us": "Only show differences" },
    "shopNowLabel":         { "en-us": "Shop now" },
    "priceLabel":           { "en-us": "Starting from" },
    "selectLabel":          { "en-us": "Select a model" },
    "selectorIcon":         "SGH/chevron-down.svg",      // chevron on the compact switcher

    // No store is authored. The module reads window.storeId / window.langId
    // off the page, so a new market needs its copy and its UPC, nothing else.
    "api": {
      "devOrigin": "https://stage.sunglasshut.com"      // localhost only, see Live product data
    },

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

        // THE one field the lookup needs. A plain string is the same article
        // everywhere; an object is resolved per market by getTrad, so a market
        // with no key of its own falls back to the English product.
        "upc": { "en-us": "8056597988377", "fr-ca": "8056597988391" },

        "name": { "en-us": "Ray-Ban | Meta Gen 3" },
        "meta": { "en-us": "3 Colors" },                     // the small line above the name
        "nameBadge": { "en-us": "New" },                     // optional pill BESIDE the name; omit it and nothing renders
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

### The heading

**The module renders no title and no subtitle.** It starts at the table.

The heading above the comparison — "Tech highlights" and the line under it — is
authored by the editor in CoreMedia, as an ordinary row placed above this one.
That is why `comparison.title` and `comparison.subtitle` no longer exist in the
json, why the skeleton in `fragment.html` starts at `.ct_comparison__table`, and
why `contents.js` builds no `<h2>`.

The consequence worth knowing: **the heading is now the editor's to change, in
eight languages, without a release.** It also means this module no longer owns
the vertical rhythm above itself — `.ct_comparison` keeps its own
`padding: 40px 0`, and whatever spacing sits between the CoreMedia heading and
the table is the page's business, not this stylesheet's.

If it ever has to come back, the per-locale Figma intro frames are still
recorded in `_meta.translationStatus`.

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

### The two badges are different things

A product can carry two, and they are independent — both on, either one, or
neither:

| | Where | Authored as |
| --- | --- | --- |
| `nameBadge` | a pill **beside** the name | one locale map: `{ "en-us": "New" }` |
| `badge` | a line **under** the name, with an icon | `{ label: {…}, icon: "SGH/…svg" }` |

`nameBadge` is its own switch: populated it renders, omitted it emits no
markup. Being a locale map makes it per market — drop the key and no market
shows it, author an empty string for one locale and only that market goes
without, because `getTrad` matches a key before it falls back. Never author
`null`.

The text is free. The design says "New", nothing in the code does, and it is
authored in natural case because the pill is uppercased in CSS. It is black on
every brand — a decision, but not a deviation: the LC frame resolves
`color/badge/color01` to its own near-black `#222222`, so both brands reach the
same result from their own palette. Moving one to something else is the two
`$color-name-badge-*` tokens.

### Adding a row

Append an object to `rows`, then add a cell under that id to **every** product.

## Live product data

Price, PDP link and packshot go stale on their own, so they are not authored.
They come from the storefront — and **which storefront service, and how to read
it, is per brand**:

```
SGH   GET /wcs/resources/store/{storeId}/productInfo?partNumbers={upc,…}&langId={langId}
LC    GET /AjaxPartNumberView?storeId={id}&catalogId={id}&langId={id}&pageSize={n}&orderBy=1&partNumbers={upc,…}
```

Both are documented in
[`LuxotticaContentTeam/product-services-doc`](https://github.com/LuxotticaContentTeam/product-services-doc),
one file per brand. Both take **every product in one call**, keyed by **UPC**.
Both are **relative**, so same-origin and needing no CORS header — unlike the
content json, which comes from the asset host.

There the resemblance ends, which is why each variant ships an adapter at
`src/js/variants/<BRAND>/product_service.js` with four functions —
`resolveStore()`, `requestUrl(store, upcs)`, `extract(payload)` and
`reduce(raw, store)`. `modules/productApi.js` only orchestrates: it picks each
market's UPC, de-duplicates the call, makes it, survives its failure and fans
the answer back out by UPC. Only the brand being built is bundled.

The split is not tidiness. Verified 2026-09-21: **SGH's path answers 404 on
LensCrafters**, and the differences behind it are not cosmetic:

| | SGH | LC |
| --- | --- | --- |
| Extra parameter | — | `catalogId`, mandatory |
| Products at | `products[]` | `products.products.product[]` |
| Struck price | `prices.listPrice` | none — `listPrice` is the literal `"$ 0"` |
| Discount badge | `saleBadgeValue` + colours | none |
| Currency | `prices.currency`, ISO | not in the response; read from `ct_data.currency` |
| Packshot | `images[]` by `sequence`, real `alt` | one `productImage`; `alt` is "Image for `<upc>`", so it is dropped in favour of the authored name |
| PDP link | relative | absolute |

So **on LC there is never a struck-through price or a discount badge**. That is
the service, not a gap in the module.

### The store comes from the page, not from the json

`storeId` and `langId` are read from **`window.storeId` and `window.langId`**,
which is what the service doc tells a client to do — its own example opens with
`{ storeID: window.storeId, langId: window.langId }`. Nothing about the store is
authored, so **adding a market means adding its copy and its UPC and nothing
else**. LC publishes the same two, plus `window.catalogId` and the legacy
`ct_data` object its own doc reads, which is where its currency comes from.

⚠️ On LC they are **not on every page**: a PDP has all of them, the
www.lenscrafters.com home page has none of them and no `<html lang>` either. So
the page the module is placed on matters. Without a store id it degrades the
same way it does anywhere: no call, every column keeps its authored copy.

They are written by an inline, server-rendered script in the page header, so
they are simply there — no polling, no globals that land late. `loadProducts()`
runs from the lazy intersection observer anyway, long after the page is parsed.

SGH, verified on all ten markets, on **production and stage**:

| | `/us` | `/ca-en` | `/ca-fr` | `/uk` | `/au` | `/de` | `/fr` | `/es` | `/mx` | `/nl` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `window.storeId` | 10152 | 10154 | 10154 | 11352 | 11351 | 14351 | 13801 | 13251 | 16001 | 19001 |
| `window.langId` | -1 | -25 | -28 | -24 | -26 | -3 | -2 | -5 | -29 | -44 |

LC, verified on **production**. Note Canada is a separate **domain** here, not a
path — and that `catalogId` is the same on both:

| | `.com` en-US | `.ca` en-CA | `.ca` fr-CA |
| --- | --- | --- | --- |
| `window.storeId` | 10851 | 10852 | 10852 |
| `window.langId` | -1 | -24 | -25 |
| `window.catalogId` | 22701 | 22701 | 22701 |

⚠️ **`langId` is not derivable from the language.** It names the market's
catalog, not the tongue — English alone answers to four different ids. Canada is
the one market where it is the *only* thing that varies: store `10154` serves
both `/ca-en` and `/ca-fr`, and the langId is what flips the CTA between them.

Two degradations, both deliberate and both measured:

- **no `storeId`** — no call at all, every column keeps its authored content.
  The store decides currency, price and discount, so a guessed one is worse than
  none. This is the case on localhost, where there is no storefront.
- **a `storeId` but no `langId`** — the call goes out *without the parameter*
  and the store answers in its own default language. Sending `langId=undefined`
  instead would answer `CWXFR0230E` with no products, and a *wrong* langId
  answers `CMN0409E` with no products, so every column would lose its price.
  Only `/ca-fr` loses anything by the omission: it reads as `/ca-en`, same
  currency, same prices.

⚠️ **The session has a say too, so test a market on its own page.** The call
carries `credentials: "same-origin"`, and the storefront session pins the
currency: asking store `11352` or `10154` *from a `/us` session* answers `USD`
rather than GBP or CAD, and asking `14351` / `13801` / `13251` from there
answers `CMN0409E` outright. Cookie-less, every one of those stores answers
correctly. This is never a problem in production, because the module only ever
runs on the page of the market whose store it is asking — but it does mean a
cross-market probe run from one market's page proves nothing. Open that market's
own page instead.

What the module takes from the response:

| | Field |
| --- | --- |
| price | `prices.offerPrice` / `prices.listPrice` — strings, and in two different notations; see [Which price](#which-price) |
| currency | `prices.currency`, the ISO code, which is what `Intl` wants |
| discount badge | `prices.saleBadgeValue` + `prices.saleBadgeColor`, **only on a product that is on sale** |
| PDP link | `pdpURL` — a different slug from the old endpoint's, see below |
| packshot | `images[]` sorted by `sequence`, with its own `alt` |
| name | `brand` + `name`, used only if the json authors none |

`pdpURL` comes back as `/us/ray-ban/rw4006-…` where the endpoint this replaced
returned `/us/ray-ban-meta/rw4006-…`. The storefront **redirects automatically**
between the two — confirmed in a browser — so the CTA lands on the right page
either way and the shorter slug is used as-is. Worth knowing before someone
"fixes" it.

**The CTA has no href until that response lands, and that is deliberate.** The
link cannot be built from the UPC: the slug is `/{market}/{brand}/{model}-{upc}`
and the model is nowhere in the UPC. Only the brand segment is forgiving —
`/us/ray-ban/rw4006-8056597988377` redirects to
`/us/ray-ban-meta-gen-1/rw4006-8056597988377` — while the `{model}-{upc}` tail
is required: `/us/ray-ban/8056266261459`, the UPC on its own, is a **404**
(checked in a browser, 2026-09-21). So the PDP link is the storefront's
`pdpURL` or nothing, exactly like the price and the packshot. A `pdpUrl`
authored in the json was tried and removed — it could only ever go stale, and
did.

The response also carries `frameColor`, `lensColor`, `localizedColorLabel`,
`moco`, `category`, `isOutOfStock` and `active`. Those are **not** read: the
comparison copy is editorial and translated, and the API returns English
attribute values that would bypass the content json.

### Which price

One pair of numbers, already resolved by the storefront:

- `listPrice` is what the price is measured from, `offerPrice` is what is
  charged, and a sale is simply `offerPrice < listPrice`.
- Both arrive as **strings**, and — the trap — **in two different notations**.
  `offerPrice` is always raw (`"150.00"`), while `listPrice` is already
  formatted for the market: `"300,00"` on `/de`, `"1.150,00"` on `/nl`,
  `"1,550.00"` on `/us`, `"9,859.00"` on `/mx`. `Number("300,00")` is `NaN`,
  which used to collapse `list` onto `offer` and silently cost every non-English
  market its struck-through price and its badge — and cost `/us` the same on any
  product over a thousand. `parseAmount` handles both: the last `,` or `.` is
  the decimal point when one or two digits follow it, anything else is a
  thousands mark.
- **The discount badge is there**, but only on a product that is actually on
  sale: `saleBadgeValue` ("30% off") and `saleBadgeColor` (`bgColor`,
  `fontColor`, `fontWeight`) are simply absent from a full-price product, which
  is what made them look missing when this module was first pointed at two
  full-price products. Verified on four live ones — Tiffany, Jimmy Choo and
  Giorgio Armani carry it, the full-price Ray-Ban Meta does not.
- The badge string is **not** recomputed from the two figures, because its
  wording belongs to the market: the same Tiffany reads `30% off` on `/us` and
  `-30%` on `/ca-en`.
- `currencySymbol` is ignored on purpose. The symbol's side and the separators
  are the locale's business, and `Intl.NumberFormat` already knows them.

This replaced a much longer rule. The endpoint used before —
`/wcs/resources/store/{storeId}/products/{productId}` — returned five raw price
lists per product that had to be reduced by name (excluding `RxPriceList*`,
which quotes the frame with prescription lenses) and by promotion date window
before a number could be shown. None of that is needed any more, and none of it
is still in the code.

### It takes a UPC, not a product id

The json authors a `upc` per product and the module needs nothing else. The
response echoes `catentryId`, which **is** the product id — useful when
debugging, read by nothing.

#### A UPC may be authored per market

Markets do not all sell the same article, so `upc` is either a plain string —
one product everywhere — or an object keyed by locale:

```jsonc
"upc": {
  "en-us": "8056597988377",
  "fr-ca": "8056597988391"   // added when a market sells something else
}
```

The object is resolved by **`getTrad`**, the same function that resolves the
copy: exact country, then language, then any key starting with it, then
`en-us`, then `en`. A market with no key of its own therefore shows the English
article rather than an empty column.

⚠️ That is the **opposite** of the rule for the store, and the difference is
deliberate. An empty column is worse than a neighbouring market's product, so
the UPC falls back. A wrong store is worse than no store — it would quote
another market's currency and discount — so the store never falls back at all;
it is read from the page, which cannot disagree with itself.

This is the other way round from how the module started. The older endpoint was
keyed by product id, had no UPC lookup at all on SGH (`/products/<upc>` answered
200 with an empty `{}`; `/products/byUpc`, `/customProductInfo/byPartNumbers`,
`/productview/byPartNumber`, `/bySearchTerm` and `/byIds` all 404'd), and so
needed either a `productId` authored in the json or a `pdpUrl` to scrape one
out of — a ~170 KB html round trip per product. Both paths are gone.

**One request, not one per column.** UPCs are de-duplicated before the call, so
a table that shows the same product in more than one column still makes a
single request and fans the result back out to every column that asked for it.

A UPC the storefront does not know is simply absent from `products[]` in the
response, which is why the result is matched back by UPC rather than by
position — that column keeps its authored content and says so in the console.

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

`ct_data` is no longer read at all. The store comes from `window.storeId` /
`window.langId` (see [Live product data](#live-product-data)), which the service
doc names and which carry the same values `ct_data` does — so there is no reason
to reach for the deprecated object.

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

Every locale is transcribed from its own Figma comparator frame, except `es-mx`,
which has none and reuses the `es` copy. The node ids are in
`_meta.translationStatus`. Each locale also had an intro frame; those are noted
there too, but nothing reads them any more — see [The heading](#the-heading).

**The two product columns are kept in step.** Any line that reads the same for
Gen 3 and Gen 2 in `en-us` reads the same in every other locale. The frames did
not do this: they drifted on 29 lines, and the columns sit side by side, so it
showed. Real differences — 6-mic against 5-mic, 9 hours against 8, `flash
storage` — are untouched. Edit a shared line in one column and you must edit it
in the other; `_meta.columnConsistency` says so in the json.

**The figures are checked against the source, not just the translation.** The
localised frames are the copy team's work, and a few of them lost a value on
the way: `es` had the Gen 3 case at 5 hours where the source says 9, `fr-ca`
spelled "cinq" where the source has "5-mic". So every line is now verified
numerically against the original desktop frame `1020:42173` — 497 lines across
the seven translated locales, each line's numbers extracted and matched against
its `en-us` counterpart, normalising the decimal comma and the thousands
separator. Zero discrepancies. `_meta.valuesMatchSource` records the method;
re-run it after any copy edit.

There is no project-wide locale list: the keys present in a brand's json **are**
that brand's locale list, and that is what the dev prompt offers
(`tasks/prompt.task.js` > `localesForVariant`).

One thing is deliberately **not** a translation: the store. A store id is market
configuration, not copy, and inheriting the US one would be silently wrong — so
it is not authored anywhere and never falls back. It is read from the page
(`window.storeId` / `window.langId`), which is always the market the reader is
actually on.

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

Then check whether that brand publishes `window.storeId` and `window.langId` the
way SGH does. `product-services-doc` has a folder per brand — read that brand's
page before assuming the same two globals are there.

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
`@import "../../components/comparison-table"`, and `critical.scss` beside it its
`@import "../../components/critical"`. The markup is shared, the styling is not:
without those imports the table renders unstyled and **nothing warns you** —
Sass compiles happily.

Four more things the scaffolding cannot know, all learned adding LC:

1. **Give the brand its own `assetPaths` entry** in `projectConfig.json` unless
   it uploads to the default host. Every brand has its own media host, and two
   brands sharing one would publish `main__<version>.min.css`,
   `main__<version>.min.js` and `json__<version>.json` to the same url and
   overwrite each other. It does not show up in development, where `dist/` is
   already per-variant. Get this wrong and the module loads but removes itself:
   it fetches its json from wherever it was **built** to look, not from where
   it was uploaded.
2. **Copy the icons into `src/static/images/<BRAND>/`** even when they are
   identical to another brand's, and point the json at the new folder.
   `tasks/staticAsset.task.js` strips the other brands' folders out of a build,
   so a json pointing at `SGH/` ships a broken icon.
3. **Read the tokens with `get_variable_defs`, not off the generated code.** A
   Figma node mapped through Code Connect returns the *component library's*
   defaults. That is how the "New" pill was first built blue and 6px-cornered
   when the file says black and fully rounded.
4. **Check `<html lang>` and the two store globals on that storefront** before
   trusting the copied `info_store.js` — see above.

## Configuration

`projectConfig.json`

| Key | Value | Notes |
| --- | --- | --- |
| `projectName` | `table-comparison-component` | Drives the container id `#ct_cm--table-comparison-component`, the config object `ct_cm__tableComparisonComponentConfig` and the `data-ct-css` marker on the injected stylesheet. Brand-neutral on purpose: every variant shares them. |
| `variants` | `SGH`, `LC` | Brand code is the part before the first `_`, and must exist in `BRANDS` in `tasks/_config.js`. |
| `assetPaths` | `{ "LC": { productionAsset, productionImage } }` | A **full** override of the two production paths, per variant — brands do not share a host: SGH is on `media.sunglasshut.com`, LC on `media.lenscrafters.com` under a campaign-calendar path. A variant with no entry uses the `package.json` values, which is what SGH is already deployed at. **Production only**: a dev build serves from `dist/`, which is already per-variant. |

⚠️ **These are baked into the bundle at build time.** The js on the CDN cannot
discover its own address: it derives the stylesheet and the content json from
whatever `productionAsset` said when it was built. Move a brand's files and that
brand must be **rebuilt and re-uploaded**, and its fragment re-pasted — uploading
the old bundle to a new folder gives a module that loads, fetches its json from
the old address, gets a 404 and removes itself.

Asset paths live in `package.json` > `projectConfigurations.paths`, and both
production values are set:

| Key | Value | Notes |
| --- | --- | --- |
| `productionAsset` | `https://media.sunglasshut.com/table-comparison-component/` | The one that matters for a live fragment. Every runtime url — stylesheet, json, script — is derived from it, substituted into the bundle as `@assetPath@`. It is the **default**; a variant listed in `projectConfig.json > assetPaths` uses its own instead. Trailing slash included, always. |
| `productionImage` | `https://media.sunglasshut.com/table-comparison-component/img/` | Where a relative image value in the json resolves, as `@imagePath@`. Overridable per variant the same way. The brand folder is part of the json value, so the chevron lands at `…/img/SGH/chevron-down.svg` on SGH and `…/img/LC/chevron-down.svg` on LC. |
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
inline is the brand's critical css — geometry only, so the empty skeleton
occupies roughly the space the filled table will and the page does not jump.
It is built per variant, from `scss/variants/<BRAND>/critical.scss`, so each
brand's skeleton comes up in its own geometry.

### Publishing it, step by step

**1. The asset base url is already set, per brand** — this step is done, and is
here so the mechanism is on record. The defaults live in `package.json` >
`projectConfigurations.paths` and are SGH's; every other brand overrides them
in `projectConfig.json` > `assetPaths`:

```
SGH   https://media.sunglasshut.com/table-comparison-component/
LC    https://media.lenscrafters.com/2026/Calendar/Week_39_September/RBM_APEROL/table_component/
```

Every runtime url — stylesheet, json, script — is derived from that value,
substituted into the bundle at build time as `@assetPath@`; relative image
values in the json resolve against the matching image path, as `@imagePath@`.
Nothing else hardcodes either. Both need the **trailing slash**: the module
concatenates, it does not join paths.

⚠️ They are baked in at build time. **Move a brand's files and that brand has to
be rebuilt, re-uploaded and its fragment re-pasted** — the js on the CDN cannot
discover its own new address, so it keeps asking the old one and, finding no
json there, removes the module from the page.

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

**5. Check the five urls answer 200 — and check *when* each was uploaded.** A
404 on one of the three release files is one cause of a blank module; a 404 on
an icon costs only the icon. But 200 is not proof: a file the upload silently
skipped answers 200 all day with last week's contents, which is the failure this
module has actually hit. Read the three timestamps together:

```bash
for f in json__0.0.1.json main__0.0.1.min.js main__0.0.1.min.css; do
  printf '%s  ' "$f"
  curl -sI "https://media.sunglasshut.com/table-comparison-component/$f" \
    | grep -i last-modified
done
```

They should all be from the upload you just did. If one lags, that file did not
go up — see [Three things that bite](#three-things-that-bite) for why a stale js
against a fresh json fails the way it does.

⚠️ **Compare the file on the CDN with the one in `release/`, not what the page
renders.** These files go out with `cache-control: max-age=604800` — seven days
— so a correct upload can sit behind a stale copy in your browser and at the
edge. A page still showing yesterday's products after a good upload is the cache,
not the json; hard-reload with the cache emptied, and purge the path if it
persists. This has already been mistaken for a broken deploy once.

⚠️ **Check the icons by status code, not by looking at them.** The LC media host
answers a 404 with a 4018-byte placeholder PNG, so a missing icon *loads*: an
`<img>` fires `onload` and the table shows a squashed grey blob rather than a
broken-image marker. `naturalWidth` gives it away — 16 for the real svg, 224 for
the placeholder.

**6. Paste `dist/fragment.html`** — the whole file, from `<style>` to
`</script>` — into the CoreMedia row. Nothing else goes in the row.

**7. Open the page and confirm** the table fills in. If it does not, the console
carries a `[table-comparison-component]` message saying what failed.

#### Three things that bite

The json is fetched **cross-origin**: the page is on `www.<brand>.com`, the
asset on `media.<brand>.com`. The asset host must send
`Access-Control-Allow-Origin`, otherwise the browser blocks the fetch and the
table stays empty. The stylesheet and the script are not affected — only the
json. The product API is same-origin and is not affected either.

**One instance per page.** The module keys off the element id
`#ct_cm--table-comparison-component`, so pasting the fragment twice into the
same page fills only the first copy.

**Upload all three, and do not trust your own browser afterwards.** The asset
host answers the js and the css with
`cache-control: public, max-age=1209000, immutable`, and the filename does not
change between builds — `main__0.0.1.min.js` is `main__0.0.1.min.js` whatever is
inside it. So a browser that has already loaded the module keeps the old script
for **fourteen days** and never revalidates. Two consequences:

- **After a deploy, verify in a browser that has never seen the module**, or
  force the cache entry with `fetch(url, { cache: "reload" })` from the console
  before reloading. Otherwise "it still does not work" and "it works now" are
  both untrustworthy.
- **Uploading only some of the three files is the failure mode to look for
  first.** A fresh json against a stale js is not a graceful degradation: the
  json's per-market `upc` object reaches a script old enough to do
  `String(product.upc)`, which asks the storefront for `[object Object]` and
  returns nothing. Checking is quick — compare `last-modified` on all three:

  ```bash
  for f in json__0.0.1.json main__0.0.1.min.js main__0.0.1.min.css; do
    curl -sI "https://media.sunglasshut.com/table-comparison-component/$f" \
      | grep -i last-modified
  done
  ```

  Bumping the version in the filename on every deploy would close both holes at
  once; until then, the three timestamps have to be read by hand.

### Changing the content later

Edit `src/json/variants/<BRAND>/json.json`, rebuild, and re-upload **only**
`json__<version>.json`. The css and the js do not change, and the fragment
already in CoreMedia does not have to be touched — including when you add or
remove a product or a row, because the skeleton is generic and the real table
is built at runtime.

The exception is the critical css (`scss/components/_critical.scss`, compiled
per variant): it is **inlined into `fragment.html`**,
so a stale copy in CoreMedia keeps overriding the stylesheet you upload
afterwards. Re-paste the fragment whenever the critical css changes —
re-uploading the three asset files is not enough. The same applies to the
skeleton itself, `views/main/main.pug`.

⚠️ **Both changed when the heading was removed**, so that release is one of the
rare ones where the fragment has to be re-pasted: a CoreMedia copy from before
it still ships the old skeleton, which reserves space for a title and a subtitle
that the module will never fill — two grey placeholder bars that sit there
forever above the table.

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

**The module is full bleed and lays its own gutters against the screen.** It is
dropped into whatever container the page wraps it in — on LC, CoreMedia's
Bootstrap `.cb_container`, whose max-width climbs in steps to 1320px and stops.
Inside that container the table is pinned to a box narrower than the screen and
its gutter grows as the screen does, which is the opposite of the design: the
page's own fluid rows (`.cb_container-fluid` with a `cb_px-lg-16` utility, the
"ASK META AI" row right above the table) hold a fixed 64px against the screen
edge however wide the screen gets. So `.ct_comparison` cancels its container's
gutters with negative margins and re-applies `$section-padding-inline-desk`
(64px, 16px compact) of its own.

The two distances are **measured**, by `contents.js > measureBleed`, and written
as `--ct-bleed-left` / `--ct-bleed-right`. They cannot be written in css:
`calc(50vw - 50%)` is the usual trick and it is wrong twice — `vw` counts the
scrollbar, so the section comes out wider than the viewport and drags the whole
page into horizontal scroll, and it assumes the container is centred, which is
the page's choice and not ours. The measurement is taken on the module's own
container, never on the section: the section is the element the margins move, so
reading it would feed its own displacement back in, while the container is a
plain block whose width its parent decides and a child's negative margins do not
touch.

Both custom properties default to `0`, which is no bleed at all — the table
simply stays inside its container, the way it did before. A failed or absent
javascript therefore leaves it narrow, never broken and never overflowing. The
critical css keeps that default on purpose: the skeleton ships before any
javascript exists to take the measurement.

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

Re-verified on 21 September 2026, when the store stopped being authored:

- **the two globals exist on every market.** Read in a real browser on
  production — `/de` gives `window.storeId "14351"` / `window.langId "-3"`,
  `/mx` gives `"16001"` / `"-29"` — and read off the served markup for all ten
  markets on stage. `window.wcs_config` and `window.ct_data` carry the same
  values, so nothing disagrees; the two documented globals are simply the ones
  the module reads;
- **the real module, driven only by those globals, against the real endpoint**:
  ten markets, each with its own currency and its own market path in the PDP
  url, `/ca-fr` included. The discount survives everywhere — a Jimmy Choo at
  50% off reads `hasDiscount: true` with its badge on all ten, which before the
  `parseAmount` fix it did on none of the six non-English ones;
- **the three degradations**, each exercised: both globals → exact; `storeId`
  only → the call goes out without `langId` and the store answers in its default
  language (`/ca-fr` degrading to `/ca-en`); neither → no call, a console
  warning, columns as authored;
- **`parseAmount` on nineteen cases**, including `"1.150,00"`, `"1,550"`,
  narrow no-break spaces, and `""` → `NaN` rather than `0`;
- `npm run build` is green and the string `"store"` appears nowhere in
  `dist/json/`.

And on the deployed module, on the stage preview page (`/us/sunglasses/ray-ban-meta`):

- the script served from `media.sunglasshut.com` is **byte-identical** to
  `release/SGH/0.0.1/main__0.0.1.min.js`;
- the product call it makes carries `/store/10152/` and `langId=-1` — the values
  the page itself publishes, not anything authored — resolves both per-market
  `upc` objects to their real UPCs, and asks for both in **one** request;
- desktop renders two columns and ten rows, `$224.00` and `$247.00` off the API,
  CTAs on the canonical `/us/ray-ban/rw4006-…` paths the endpoint returns, and
  packshots at 1920x960 from `assets2.sunglasshut.com` carrying the API's alt
  text;
- at 390px, measured in an iframe because that is the only way to move the
  viewport reliably: `getDeviceType` reports `mob`, the columns are 169px, the
  prices are still live, there is no packshot — which the compact design does
  not have — and no horizontal scroll.

**Not yet verified:** the module running in-page on a market other than `/us`,
because that is the only page it is published on. The evidence for the others is
that each market's page publishes the right two globals, and that the module's
own code against the live endpoint returns each market's currency and PDP path
(see the store table above). Re-run the desktop and mobile pass on the first
non-English market the module is published to.

## Open items

### Before it can go live

Both are **SGH only** — LC is authored with its three real products and
verified in page.

- **SGH's Gen 3 UPC resolves nowhere.** `8056266261459` answers on none of the
  nine stores checked on 2026-09-21, and `/us/ray-ban-meta-gen-3` is a 404,
  because the product has not gone live on that brand yet. The UPC is right and
  there is no code to chase: the catalog starts answering at launch and the
  column completes itself. Until then it renders its copy with no packshot, no
  price and no link, which is the designed degradation. **Re-check at go-live**
  which markets carry it. Its Gen 2, `8056262721339`, is good — `0RW4012`,
  $379.00, `isOutOfStock` — on `/us`, `/ca-en`, `/uk`, `/au`, `/de`, `/fr` and
  `/es`.

- **`/mx` and `/nl` do not carry SGH's Gen 2 either**, so those two need either
  their own `upc` key or the knowledge that the column degrades there. See
  `_meta.api._upcMissing`.

⚠️ The two brands are different catalogs: LC's Gen 3 is `8056266259852` and
resolves, SGH's is `8056266261459` and does not. They are not interchangeable.

### Waiting on a decision, not on code

- **The colour count is authored, not live.** `products[].meta` ("3 Colors") is
  written by hand because SGH's product service returns `frameColor` /
  `lensColor` for the one variant it describes and no count of the siblings.
  Making it live means a second call to a different service — there is an
  `availableColors` on glasses.com's `/ajaxSearchDisplayView`, but no SGH
  equivalent answers with json.

### Cleanup done

A sweep of the repo turned up six pieces of surplus. Five were removed; the
sixth was left alone deliberately.

**The variant bundle was shipped twice.** `main.js` imports the variant as
`@currentVariant@` and the aliasify transform resolves that at bundle time, so
`variants/SGH/main.js` is already inside the main bundle. `script.task.js` also
built it a *second* time as its own browserify bundle, and `concatScripts` glued
that onto the release — two copies of `info_store`, one of which nothing
referenced and which ran for nothing on every page load. In dev the same file
was injected as an extra `<script>`. The released js went from **40,962 to
39,619 bytes (−1,343, −3.3%)** and now contains `documentElement` once instead
of twice.

Also removed: a no-op `main` export from `variants/SGH/main.js` and from the
template new variants are scaffolded from; `map`, `clamp` and `isMobile` from
`utils.js`, imported by nothing; the `vendors` task with its `vendor.js` (empty
lists, no `bower_components/`, so it only ever logged "No vendors selected"),
along with the now-pointless `dist_vendors` wiring in `_config.js`,
`inject-css-js` and `buildEspot`; and **14 devDependencies** nothing requires,
taking the list from 55 to 41.

Three were kept on purpose, because they are used in ways a plain grep misses:
`gulp-filter` is reached as `$.filter()` through `gulp-load-plugins`
(`style.task.js`), `postcss` is a peer dependency of `gulp-postcss`, and
`cross-env` is used in the npm scripts rather than in any source file.

Left alone: `CSS_URL`, `JSON_URL` and `MOBILE_COLUMNS` are exported but read
only inside their own file. Dropping the `export` keyword changes nothing that
ships, so they stay.

Verified **clean** in the same sweep: no orphan CSS (all 35 `ct_comparison*`
classes are produced by the js or the fragment), no unimported js file, and the
three `.woff2` fonts are not dead — `_local.scss` loads them inside
`@if ($env == "development")`, because in production the storefront provides
them.

### Known, and deliberate

- **The switch's off-state colour and the switcher's open state are not in
  Figma** — see
  [What the design did not specify](#what-the-design-did-not-specify).
  `$color-switch-off` is the only invented value in the token file.
- **One brand** — only SGH exists, and SGH is the brand this goes live on. The
  module is meant to become a template for the others, but every one of them
  needs its own tokens, copy, locale detection and store ids, verified on its
  own storefront. See [Other brands: check before porting
  this](#other-brands-check-before-porting-this).
- **There is no deploy pipeline in use.** `.github/workflows/deploy-uat.yml` and
  `deploy-prod.yml` exist but have never run and are not part of the process:
  the release files are uploaded by hand over SFTP. The workflows are left in
  place unused — if anyone ever dispatches one, its secrets and variables have
  to be checked first.
- **`comparison.selectLabel` has no Figma frame.** It is the label above the
  mobile product picker, and no frame shows that control open, so its
  non-English values were written here. Accepted as-is. Same for
  `products[].family` and `products[].shortName`, which only feed that
  dropdown.
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

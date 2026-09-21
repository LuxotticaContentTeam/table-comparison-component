/**
 * Live product data — price, PDP link, packshot.
 *
 * The comparison copy is editorial and lives in the content json. Everything
 * that goes stale on its own comes from the storefront instead.
 *
 * **Which storefront service, and how to read it, is the brand's business, not
 * this file's.** Each variant ships a service adapter —
 * `src/js/variants/<BRAND>/product_service.js` — with four functions:
 *
 *   resolveStore()             the globals that brand's pages publish, or null
 *   requestUrl(store, upcs)    the endpoint, with that brand's parameters
 *   extract(payload)           the products out of that brand's response shape
 *   reduce(raw, store)         one product, in the shape the table renders
 *
 * That split is not decoration. SGH is on
 * `/wcs/resources/store/{id}/productInfo`, LensCrafters answers **404** on that
 * exact path and is on `/AjaxPartNumberView` with a different parameter list, a
 * different nesting, no list price and no currency code. A single reader with
 * two branches would have been a reader that is wrong for whichever brand is
 * not being looked at.
 *
 * What stays here is everything the brands share: picking each market's UPC,
 * de-duplicating the call, making it, surviving its failure, and fanning the
 * answer back out by UPC.
 *
 * It keys off the **UPC** and takes every product in one call. A product needs
 * a `upc` in the json and nothing else.
 *
 * **A `upc` may be authored per market.** Markets do not all sell the same
 * article, so `upc` is either a plain string — one product everywhere — or an
 * object keyed by locale, resolved by the same `getTrad` that resolves the
 * copy: exact country, then language, then any key starting with it, then
 * `en-us`, then `en`. A market with no key of its own therefore falls back to
 * the English product rather than to no product at all.
 *
 * The **store** is a different matter and does not fall back: it is what decides
 * currency and price, so one page asks one store for every column. It is not
 * authored at all — it is read from the page by the brand's adapter — so adding
 * a market means adding its copy and its UPC, and nothing else.
 */
import { customLog, getTrad } from "./utils";

const IS_DEV = "@env@" === "development";
// cors-anywhere, started by `npm run proxy`. Empty in production.
const PROXY_PATH = "@proxyPath@";

/**
 * In production the module is injected into the storefront, so every path here
 * is relative and same-origin. On localhost there is no storefront to be
 * relative to, so the call goes through the CORS proxy at an origin the json
 * names (`comparison.api.devOrigin`) — which is also how a dev build can be
 * pointed at stage rather than production, or at another brand's domain.
 *
 * Without the proxy running the request simply fails and is logged; the table
 * still renders from the authored json.
 */
const absolute = (path, apiConfig) => {
  if (!IS_DEV) return path;

  const origin = apiConfig.devOrigin;
  if (!origin) return path;

  return `${PROXY_PATH}${origin.replace(/\/$/, "")}${path}`;
};

/**
 * The UPC this market should ask for.
 *
 * `getTrad` is the copy resolver, used here on purpose: a market that sells no
 * article of its own should show the English one rather than an empty column,
 * which is the opposite of the rule for store ids and is the decision on
 * record. A plain string is returned untouched, so the common case — one
 * product in every market — stays a one-line authoring change.
 */
const resolveUpc = (product, infoStore) => {
  const upc = getTrad(product.upc, infoStore);
  return upc ? String(upc) : null;
};

/**
 * A price string from a storefront, as a number.
 *
 * `Number()` is not enough, because prices are **not formatted the same way**
 * even within one response: SGH's `offerPrice` is always raw ("150.00") while
 * its `listPrice` arrives formatted for the market — "300,00" on /de,
 * "1.150,00" on /nl, "1,550.00" on /us, "9,859.00" on /mx. `Number("300,00")`
 * is NaN, which used to make `list` collapse onto `offer` and silently cost
 * every non-English market its struck-through price and its discount badge. A
 * US product over a thousand hit the same wall through the thousands comma
 * alone.
 *
 * The last `,` or `.` is the decimal point when one or two digits follow it;
 * anything else is a thousands mark, so "1,550" is fifteen hundred and fifty
 * rather than one and a half. Spaces — including the narrow no-break kind some
 * markets group with — are dropped before any of that.
 */
const parseAmount = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;

  const cleaned = value.replace(/[^\d,.-]/g, "");
  // Number("") is 0, which would read as a real price of nothing and pass the
  // isFinite guards downstream. An absent price has to stay absent.
  if (!/\d/.test(cleaned)) return NaN;

  const decimalAt = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const decimals = decimalAt === -1 ? 0 : cleaned.length - decimalAt - 1;

  if (decimals < 1 || decimals > 2) return Number(cleaned.replace(/[.,]/g, ""));

  return Number(`${cleaned.slice(0, decimalAt).replace(/[.,]/g, "")}.${cleaned.slice(decimalAt + 1)}`);
};

/**
 * Brand and name, joined without saying the brand twice.
 *
 * A name is usually the model alone — "GG1463S" against brand "Gucci" — so the
 * two are joined. But a co-branded line carries the brand inside the name:
 * Ray-Ban Meta answers brand "Ray-Ban" and name "Ray-Ban Meta (Gen 1)
 * Wayfarer", and joining those gives "Ray-Ban Ray-Ban Meta …".
 *
 * This only feeds a fallback, because every column's visible title is authored
 * in the json — but a duplicated brand read out loud by a screen reader is
 * still a duplicated brand.
 */
const productName = (rawBrand, rawName) => {
  const brand = (rawBrand || "").trim();
  const name = (rawName || "").trim();

  if (!brand) return name;
  if (!name) return brand;

  return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
};

/**
 * Resolve every product in the table, in one request.
 *
 * Never rejects and never throws: the table is built from the authored json
 * first and enriched with whatever comes back, so a dead product costs that
 * column its price, not the whole module. A UPC the storefront does not know
 * is simply absent from the response, which is why the result is matched back
 * by UPC rather than by position.
 *
 * @param {Array<{id: string, upc?: string|object}>} products
 * @param {object} apiConfig  json > comparison.api — only `devOrigin` is read here
 * @param {object} infoStore  { lang, country } — picks the per-market upc
 * @param {object} service    the brand's adapter, from variants/<BRAND>/product_service.js
 * @returns {Promise<Object<string, object>>} keyed by the product's json id
 */
const getProducts = async (products = [], apiConfig = {}, infoStore = {}, service) => {
  const store = service.resolveStore();
  if (!store) return {};

  // Resolved once per product, because a market may be authored a different
  // article and the resolution depends on the locale, not on the column.
  const wanted = products
    .map((product) => ({ product, upc: resolveUpc(product, infoStore) }))
    .filter(({ product, upc }) => {
      if (upc) return true;
      customLog(`[${product.id}] has no upc for this market — skipping the lookup`, "", "warn");
      return false;
    });

  if (!wanted.length) return {};

  // The same product may legitimately sit in more than one column (a test
  // table, or two authored entries of one model), so the request is de-duped
  // while the result is fanned back out to every entry that asked for it.
  const upcs = [...new Set(wanted.map(({ upc }) => upc))];
  const url = absolute(service.requestUrl(store, upcs), apiConfig);

  let payload;

  try {
    const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });

    if (!response.ok) {
      customLog(`PRODUCTS NOT FOUND: [${url}] responded ${response.status}`, "", "err");
      return {};
    }

    payload = await response.json();
  } catch (error) {
    customLog(`PRODUCTS NOT LOADED: [${url}] ${error.message}`, "", "err");
    return {};
  }

  const returned = service.extract(payload);

  if (!returned.length) {
    customLog(`PRODUCTS EMPTY: [${url}] — are ${upcs.join(", ")} UPCs the store knows?`, "", "err");
    return {};
  }

  const byUpc = returned.reduce((acc, product) => {
    if (product && product.upc) acc[String(product.upc)] = service.reduce(product, store);
    return acc;
  }, {});

  return wanted.reduce((acc, { product, upc }) => {
    const data = byUpc[upc];

    if (!data) {
      customLog(`[${product.id}] upc ${upc} is not in the response — staying as authored`, "", "warn");
      return acc;
    }

    acc[product.id] = data;
    return acc;
  }, {});
};

/**
 * Format a price the way the market does, from the currency the storefront
 * reported. Intl handles the symbol, its side and the separators, so no
 * currency-to-symbol table has to be maintained here.
 */
const formatPrice = (amount, currency, infoStore = {}) => {
  if (!Number.isFinite(amount)) return "";
  if (!currency) return String(amount);

  const locale = infoStore.country && infoStore.country.includes("-") ? infoStore.country : infoStore.lang || "en";

  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch (error) {
    return `${amount} ${currency}`;
  }
};

export { getProducts, formatPrice, parseAmount, productName };

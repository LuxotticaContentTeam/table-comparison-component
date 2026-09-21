/**
 * Live product data — price, PDP link, packshot.
 *
 * The comparison copy is editorial and lives in the content json. Everything
 * that goes stale on its own comes from the storefront instead:
 *
 *   GET /wcs/resources/store/{storeId}/productInfo?partNumbers={upc,upc}&langId={langId}
 *
 * This is SGH's documented service — "New Prod Service (2026)" in
 * LuxotticaContentTeam/product-services-doc > sunglasshut/product-service.md.
 * Verified against **production** (www.sunglasshut.com, store 10152) with the
 * two UPCs this module ships: 200, both products in one response, USD prices
 * and /us/ PDP urls. It is called **relative**, so it is same-origin and no
 * CORS header has to be negotiated with anyone — unlike the content json,
 * which is fetched from the asset host.
 *
 * It keys off the **UPC**, takes every product in one comma-separated call,
 * and returns prices already resolved. That is the whole reason this module is
 * short: the endpoint it replaced was keyed by product id, needed one request
 * per column, and handed back five raw price lists that had to be reduced by
 * name and date window before a number could be shown.
 *
 * ⚠️ The response carries `catentryId`, which **is** the product id the old
 * endpoint wanted — handy when debugging, but nothing here needs it. A product
 * needs a `upc` in the json and nothing else.
 *
 * **A `upc` may be authored per market.** Markets do not all sell the same
 * article, so `upc` is either a plain string — one product everywhere — or an
 * object keyed by locale, resolved by the same `getTrad` that resolves the
 * copy: exact country, then language, then any key starting with it, then
 * `en-us`, then `en`. A market with no key of its own therefore falls back to
 * the English product rather than to no product at all.
 *
 * The **store** is a different matter and does not fall back (see
 * `resolveStore`): it is what decides currency, price and discount, so one page
 * asks one store for every column. It is not authored at all — it is read from
 * `window.storeId` and `window.langId`, which the storefront renders into every
 * market's page — so adding a market to this module means adding its copy and
 * its UPC, and nothing else.
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
 * pointed at stage rather than production.
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

const productInfoUrl = ({ storeId, langId }, upcs) => {
  const path = `/wcs/resources/store/${storeId}/productInfo?partNumbers=${upcs.map(encodeURIComponent).join(",")}`;

  // Only when there is one to send. `langId=undefined` is not a soft failure:
  // the endpoint answers CWXFR0230E with no products, so every column loses its
  // price. Leaving the parameter off entirely is safe — see `resolveStore`.
  return langId ? `${path}&langId=${langId}` : path;
};

/**
 * Store identifiers, as the storefront publishes them.
 *
 * These two are what the service documentation tells a client to read — see
 * "New Prod Service (2026)" in LuxotticaContentTeam/product-services-doc >
 * sunglasshut/product-service.md, whose own example opens with
 * `{ storeID: window.storeId, langId: window.langId }` and calls store 11352
 * with langId -24, the /uk pair below.
 *
 * `window.storeId` and `window.langId` are written by an inline, server-rendered
 * script in the page header, so they are plain strings that are simply there —
 * no polling, no globals that land late. Verified on all ten markets, on
 * www.sunglasshut.com and on stage: /us 10152/-1, /ca-en 10154/-25,
 * /ca-fr 10154/-28, /uk 11352/-24, /au 11351/-26, /de 14351/-3, /fr 13801/-2,
 * /es 13251/-5, /mx 16001/-29, /nl 19001/-44. They are read here rather than
 * authored in the json on purpose: the page cannot disagree with itself, and a
 * new market needs nothing but its copy and its UPC.
 *
 * Timing is not a worry. These are defined while the document is still being
 * parsed, and `getProducts` runs from the lazy intersection observer, once the
 * reader has scrolled the module into view.
 *
 * The **langId is not derived from the language**: it names the market's
 * catalog, not the tongue, and English alone answers to four different ids. The
 * one market where it is the only thing that varies is Canada, where store 10154
 * serves both /ca-en and /ca-fr and the langId is what flips the CTA between
 * them.
 *
 * Two degradations, both deliberate:
 * - no `storeId` — no call at all, and every column keeps its authored content.
 *   The store decides currency, price and discount, so a guessed one is worse
 *   than none. This is the case in development, where there is no storefront.
 * - a `storeId` but no `langId` — the call still goes out without the parameter,
 *   and the store answers in its own default language (verified on 10152, 10154
 *   and 19001). Only /ca-fr loses something by this: it would read as /ca-en,
 *   same currency, same prices.
 *
 * @returns {{storeId: string, langId: string}|null} null when the page publishes no store id
 */
const resolveStore = () => {
  const storeId = window.storeId;
  const langId = window.langId;

  if (!storeId) {
    customLog("no window.storeId on the page — prices and CTAs stay as authored", "", "warn");
    return null;
  }

  if (!langId) {
    customLog(`no window.langId on the page — asking store ${storeId} in its default language`, "", "warn");
  }

  return { storeId: String(storeId), langId: langId ? String(langId) : "" };
};

/**
 * Packshot. `images` is ordered by `sequence` and carries a real alt string.
 */
const pickImage = (product) => {
  const images = Array.isArray(product.images) ? [...product.images].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) : [];
  const first = images[0];

  return first && first.url ? { url: first.url, alt: first.alt || "" } : null;
};

/**
 * The discount badge, as the storefront writes it.
 *
 * `saleBadgeValue` and `saleBadgeColor` are present **only on a product that is
 * actually on sale**, which is why they look absent on a full-price product and
 * why this module was briefly written as though the endpoint had no badge at
 * all. Verified on four live products: Tiffany, Jimmy Choo and Giorgio Armani
 * all carry it, the full-price Ray-Ban Meta does not.
 *
 * The string is **not** recomputed from the two prices, because its wording is
 * the market's own: the same Tiffany reads "30% off" on the US store and "-30%"
 * on ca-en. The colours travel with it so the badge matches whatever palette
 * the promotion is running elsewhere on the page.
 */
const pickBadge = (prices) => {
  const value = typeof prices.saleBadgeValue === "string" ? prices.saleBadgeValue.trim() : "";
  if (!value) return null;

  const colors = prices.saleBadgeColor && typeof prices.saleBadgeColor === "object" ? prices.saleBadgeColor : {};

  return {
    value,
    bgColor: colors.bgColor || null,
    fontColor: colors.fontColor || null,
    fontWeight: colors.fontWeight || null,
  };
};

/**
 * A price string from the endpoint, as a number.
 *
 * `Number()` is not enough, because the two prices are **not formatted the same
 * way**: `offerPrice` is always raw ("150.00"), while `listPrice` is already
 * formatted for the market — "300,00" on /de, "1.150,00" on /nl, "1,550.00" on
 * /us, "9,859.00" on /mx. `Number("300,00")` is NaN, which used to make `list`
 * collapse onto `offer` and silently cost every non-English market its
 * struck-through price and its discount badge. A US product over a thousand hit
 * the same wall through the thousands comma alone.
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
 * The two numbers the PDP shows, and the badge that goes with them.
 *
 * The endpoint quotes the prices already resolved — no price list to pick, no
 * promotion window to honour — but as **strings**, and in two different
 * notations, which is `parseAmount`'s whole job. A sale is simply an offer
 * below the list price.
 *
 * `currency` is the ISO code ("USD"), which is what Intl.NumberFormat wants;
 * `currencySymbol` is ignored on purpose, because the symbol's side and the
 * separators are the locale's business, not the storefront's.
 */
const pickPrices = (prices) => {
  if (!prices || typeof prices !== "object") return null;

  const list = parseAmount(prices.listPrice);
  const offer = parseAmount(prices.offerPrice);

  if (!Number.isFinite(list) && !Number.isFinite(offer)) return null;

  const base = Number.isFinite(list) ? list : offer;
  const current = Number.isFinite(offer) ? offer : list;
  const hasDiscount = current < base;

  return {
    list: base,
    offer: current,
    currency: prices.currency || null,
    hasDiscount,
    // Only meaningful next to a struck-through price, so it is dropped when
    // the storefront quotes one number.
    badge: hasDiscount ? pickBadge(prices) : null,
  };
};

/**
 * Brand and name, joined without saying the brand twice.
 *
 * `name` is usually the model alone — "GG1463S" against brand "Gucci" — so the
 * two are joined. But a co-branded line carries the brand inside the name:
 * Ray-Ban Meta answers brand "Ray-Ban" and name "Ray-Ban Meta (Gen 1)
 * Wayfarer", and joining those gives "Ray-Ban Ray-Ban Meta …".
 *
 * This only feeds the image alt when the storefront supplied none, because
 * every column's visible title is authored in the json — but a duplicated
 * brand in an alt string is still read out loud by a screen reader.
 */
const productName = (product) => {
  const brand = (product.brand || "").trim();
  const name = (product.name || product.model || "").trim();

  if (!brand) return name;
  if (!name) return brand;

  return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
};

/**
 * Reduce one entry of the response to the handful of fields the table renders.
 */
const reduceProduct = (product) => ({
  upc: product.upc ? String(product.upc) : null,
  productId: product.catentryId ? String(product.catentryId) : null,
  brand: product.brand || "",
  model: product.model || "",
  name: productName(product),
  pdpUrl: product.pdpURL || null,
  image: pickImage(product),
  prices: pickPrices(product.prices),
});

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
 * @param {object} apiConfig  json > comparison.api — only `devOrigin` is read here; the store comes from the page
 * @param {object} infoStore  { lang, country } — picks the per-market upc
 * @returns {Promise<Object<string, object>>} keyed by the product's json id
 */
const getProducts = async (products = [], apiConfig = {}, infoStore = {}) => {
  const store = resolveStore();
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
  const url = absolute(productInfoUrl(store, upcs), apiConfig);

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

  const returned = Array.isArray(payload && payload.products) ? payload.products : [];

  if (!returned.length) {
    customLog(`PRODUCTS EMPTY: [${url}] — are ${upcs.join(", ")} UPCs the store knows?`, "", "err");
    return {};
  }

  const byUpc = returned.reduce((acc, product) => {
    if (product && product.upc) acc[String(product.upc)] = reduceProduct(product);
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

export { getProducts, formatPrice };

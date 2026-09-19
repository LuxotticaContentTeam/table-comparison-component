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
 */
import { customLog } from "./utils";

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

const productInfoUrl = ({ storeId, langId }, upcs) =>
  `/wcs/resources/store/${storeId}/productInfo?partNumbers=${upcs.map(encodeURIComponent).join(",")}&langId=${langId}`;

/**
 * Store identifiers, in the order they can be trusted.
 *
 * `ct_data` is deprecated as a *locale* source — it lands seconds after
 * navigation on a cold load, which is why the locale comes from <html lang>
 * instead (src/js/variants/SGH/info_store.js). It is still the only place the
 * storefront publishes the store and catalog ids, and by the time this runs the
 * module has already been scrolled to, so it is there in practice. An id
 * authored in the json wins over it, so a market whose globals disagree can be
 * pinned without a code change.
 *
 * @returns {{storeId: string, langId: string}|null} null when nothing supplies a store id
 */
const resolveStore = (apiConfig = {}, infoStore = {}) => {
  const authored = apiConfig.store && (apiConfig.store[infoStore.country] || apiConfig.store[infoStore.lang]);
  const globals = typeof window.ct_data === "object" && window.ct_data ? window.ct_data : {};

  const storeId = (authored && authored.storeId) || globals.storeId;
  const langId = (authored && authored.langId) || globals.langID || "-1";

  if (!storeId) {
    customLog("no storeId: ct_data is absent and none is authored in the json — prices and CTAs stay as authored", "", "warn");
    return null;
  }

  return { storeId: String(storeId), langId: String(langId) };
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
 * The two numbers the PDP shows.
 *
 * The endpoint quotes them already resolved — no price list to pick, no
 * promotion window to honour — but as **strings** ("224.00"), so they are
 * coerced before anything compares or formats them. A sale is simply an offer
 * below the list price.
 *
 * `currency` is the ISO code ("USD"), which is what Intl.NumberFormat wants;
 * `currencySymbol` is ignored on purpose, because the symbol's side and the
 * separators are the locale's business, not the storefront's.
 */
const pickPrices = (prices) => {
  if (!prices || typeof prices !== "object") return null;

  const list = Number(prices.listPrice);
  const offer = Number(prices.offerPrice);

  if (!Number.isFinite(list) && !Number.isFinite(offer)) return null;

  const base = Number.isFinite(list) ? list : offer;
  const current = Number.isFinite(offer) ? offer : list;

  return {
    list: base,
    offer: current,
    currency: prices.currency || null,
    hasDiscount: current < base,
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
 * @param {Array<{id: string, upc?: string}>} products
 * @param {object} apiConfig  json > comparison.api
 * @param {object} infoStore  { lang, country }
 * @returns {Promise<Object<string, object>>} keyed by the product's json id
 */
const getProducts = async (products = [], apiConfig = {}, infoStore = {}) => {
  const store = resolveStore(apiConfig, infoStore);
  if (!store) return {};

  const wanted = products.filter((product) => {
    if (product.upc) return true;
    customLog(`[${product.id}] has no upc — skipping the lookup`, "", "warn");
    return false;
  });

  if (!wanted.length) return {};

  // The same product may legitimately sit in more than one column (a test
  // table, or two authored entries of one model), so the request is de-duped
  // while the result is fanned back out to every entry that asked for it.
  const upcs = [...new Set(wanted.map((product) => String(product.upc)))];
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

  return wanted.reduce((acc, product) => {
    const data = byUpc[String(product.upc)];

    if (!data) {
      customLog(`[${product.id}] upc ${product.upc} is not in the response — staying as authored`, "", "warn");
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

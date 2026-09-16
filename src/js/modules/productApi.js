/**
 * Live product data — price, PDP link, packshot.
 *
 * The comparison copy is editorial and lives in the content json. Everything
 * that goes stale on its own comes from the storefront instead:
 *
 *   GET /wcs/resources/store/{storeId}/products/{productId}?langId={langId}
 *
 * Verified on stage.sunglasshut.com, store 10152 / catalog 20602: it answers
 * 200 with prices (list and offer, per price list), links.url, images[], brand,
 * model and the frame/lens attributes. It is called **relative**, so it is
 * same-origin and no CORS header has to be negotiated with anyone — unlike the
 * content json, which is fetched from the asset host.
 *
 * ⚠️ The endpoint keys off the **product id**, not the UPC. There is no lookup
 * by UPC on SGH: /products/<upc> answers 200 with an empty {}, and
 * /products/byUpc, /customProductInfo/byPartNumbers (which is what persol.com
 * uses), /productview/byPartNumber, /bySearchTerm and /byIds all 404. The PDP
 * url is not UPC-routed either — the model slug is significant, so
 * /us/ray-ban/xxx-8053672689679 is a 404 while the real slug is a 200.
 *
 * So a product needs either a `productId` in the json — the fast path, one
 * request — or a `pdpUrl`, from which the id is scraped once (the PDP markup
 * carries product-id="..." on its root component) before the same request is
 * made. Authoring only the url costs an extra ~170 KB html round trip per
 * product, and breaks if that attribute is ever renamed; authoring the id
 * costs nothing and is what the build should ship.
 */
import { customLog } from "./utils";

/**
 * The prescription price list. It quotes the price of the frame **with Rx
 * lenses**, which is a different product from the sunglasses on the page, and
 * it is frequently lower than the retail price — so reading it would put a
 * plausible but wrong number in the table. Excluded outright.
 */
const RX_PRICE_LIST = /^RxPriceList/i;

const PRODUCT_ID_IN_PDP = /product-id="(\d+)"/;

const IS_DEV = "@env@" === "development";
// cors-anywhere, started by `npm run proxy`. Empty in production.
const PROXY_PATH = "@proxyPath@";

/**
 * In production the module is injected into the storefront, so every path here
 * is relative and same-origin. On localhost there is no storefront to be
 * relative to, so the calls go through the CORS proxy at an origin the json
 * names (`comparison.api.devOrigin`) — which is also how a dev build can be
 * pointed at stage rather than production.
 *
 * Without the proxy running the requests simply fail and are logged; the table
 * still renders from the authored json.
 */
const absolute = (path, apiConfig) => {
  if (!IS_DEV) return path;

  const origin = apiConfig.devOrigin;
  if (!origin) return path;

  return `${PROXY_PATH}${origin.replace(/\/$/, "")}${path}`;
};

const productUrl = ({ storeId, langId }, productId) => `/wcs/resources/store/${storeId}/products/${productId}?langId=${langId}`;

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
 * Scrape the product id out of a PDP. Only used when the json did not author
 * one; the response is html, not json, and is deliberately not cached across
 * page loads — a stale id would point at the wrong product.
 */
const resolveProductId = async (pdpUrl, apiConfig = {}) => {
  const url = absolute(pdpUrl, apiConfig);

  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      customLog(`PDP NOT REACHABLE: [${url}] responded ${response.status}`, "", "err");
      return null;
    }
    const match = PRODUCT_ID_IN_PDP.exec(await response.text());
    if (!match) {
      customLog(`NO product-id IN PDP: [${url}] — author productId in the json instead`, "", "err");
      return null;
    }
    return match[1];
  } catch (error) {
    customLog(`PDP NOT LOADED: [${url}] ${error.message}`, "", "err");
    return null;
  }
};

/**
 * WCS dates come back as "2026-09-04 07:00:00.0", which `new Date()` does not
 * parse reliably across browsers. Normalised to ISO-ish first.
 *
 * @returns {number|null} epoch ms, or null for an absent or unparseable date
 */
const parseWcsDate = (value) => {
  if (!value) return null;
  const time = Date.parse(String(value).trim().replace(" ", "T").replace(/\.\d+$/, ""));
  return Number.isNaN(time) ? null : time;
};

/**
 * Is this price list a promotion that is live right now?
 *
 * **A window is required.** A list with no dates is not treated as active, and
 * that is not a guess — it is what the storefront does. On rb3548n the
 * "Extended Sites Catalog Asset Store" list quotes 191 -> 153 with empty
 * startDate and endDate, and the PDP shows a flat $191: the entry is data that
 * is not in force. Honouring it would have advertised a 20% discount that does
 * not exist.
 */
const isLivePromotion = (entry, now) => {
  const start = parseWcsDate(entry.startDate);
  const end = parseWcsDate(entry.endDate);

  if (start === null || end === null) return false;
  return now >= start && now <= end;
};

/**
 * Reduce the several price lists a product carries to the one pair of numbers
 * the PDP shows.
 *
 * The rule below was derived by comparing this endpoint against four live PDPs
 * and then confirmed by predicting a fifth:
 *
 * | product   | lists                                  | PDP shows        |
 * | rb3548n   | Extended Sites 191->153 (no dates)      | $191, no sale    |
 * | jc4011    | MadisonsESite 419->293.30, 30% off      | $293.30 / $419   |
 * | tf4214u   | MadisonsESite 489->244.50, 50% off      | $244.50 / $489   |
 * | ar8146    | MadisonsESite 387->270.90, 30% off      | $270.90 / $387   |
 *
 * So: the base price is the list price, a promotion counts only when its date
 * window is open, and the prescription list never counts. Picking "the first
 * list" or a fixed preferred name reproduces none of these four.
 */
const pickPrices = (prices, now = Date.now()) => {
  if (!prices || typeof prices !== "object") return null;

  const entries = Object.entries(prices)
    .filter(([name]) => !RX_PRICE_LIST.test(name))
    .map(([name, entry]) => ({ name, entry, list: Number(entry.listPrice), offer: Number(entry.offerPrice) }))
    .filter(({ list }) => Number.isFinite(list));

  if (!entries.length) return null;

  // Every non-Rx list quotes the same list price; taking the highest means a
  // stray lower one can never understate what the discount is measured from.
  const list = Math.max(...entries.map((price) => price.list));

  const promotion = entries
    .filter(({ entry, offer }) => Number.isFinite(offer) && offer < list && isLivePromotion(entry, now))
    .sort((a, b) => a.offer - b.offer)[0];

  const currency = (promotion && promotion.entry.currency) || entries[0].entry.currency || null;

  return {
    list,
    offer: promotion ? promotion.offer : list,
    currency,
    // Rendered as the storefront writes it ("30% off"), not recomputed — the
    // two could disagree on rounding.
    badge: (promotion && promotion.entry.badge) || "",
    hasDiscount: Boolean(promotion),
  };
};

/**
 * Packshot. `images` is ordered by `sequence` and carries a real alt string;
 * `variantImageUrl` is the same shot without the metadata, kept as a fallback.
 */
const pickImage = (product) => {
  const images = Array.isArray(product.images) ? [...product.images].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) : [];
  const first = images[0];

  if (first && first.url) return { url: first.url, alt: first.alt || "" };
  if (product.variantImageUrl) return { url: product.variantImageUrl, alt: product.variantImageAlt || "" };
  return null;
};

/**
 * Fetch one product and reduce the ~11 KB payload to the handful of fields the
 * table renders. Returns null on any failure — a missing product must degrade
 * to the authored content, never blank the column.
 *
 * @returns {Promise<{upc, productId, brand, model, name, pdpUrl, image, prices}|null>}
 */
const fetchProduct = async (store, productId, apiConfig) => {
  const url = absolute(productUrl(store, productId), apiConfig);

  try {
    const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });

    if (!response.ok) {
      customLog(`PRODUCT NOT FOUND: [${url}] responded ${response.status}`, "", "err");
      return null;
    }

    const product = await response.json();

    // A wrong id answers 200 with {} rather than 404 — the empty object is the
    // only signal that the lookup missed.
    if (!product || !product.productId) {
      customLog(`PRODUCT EMPTY: [${url}] — is ${productId} a product id and not a UPC?`, "", "err");
      return null;
    }

    return {
      upc: product.upc || null,
      productId: String(product.productId),
      brand: product.brand || "",
      model: product.model || "",
      name: [product.brand, product.model].filter(Boolean).join(" "),
      pdpUrl: (product.links && product.links.url) || null,
      image: pickImage(product),
      prices: pickPrices(product.prices),
    };
  } catch (error) {
    customLog(`PRODUCT NOT LOADED: [${url}] ${error.message}`, "", "err");
    return null;
  }
};

/**
 * Resolve every product in the table, in parallel.
 *
 * Never rejects and never throws: the table is built from the authored json
 * first and enriched with whatever comes back, so one dead product costs that
 * column its price, not the whole module.
 *
 * @param {Array<{id: string, upc?: string, pdpUrl?: string, productId?: string}>} products
 * @param {object} apiConfig  json > comparison.api
 * @param {object} infoStore  { lang, country }
 * @returns {Promise<Object<string, object>>} keyed by the product's json id
 */
const getProducts = async (products = [], apiConfig = {}, infoStore = {}) => {
  const store = resolveStore(apiConfig, infoStore);
  if (!store) return {};

  const entries = await Promise.all(
    products.map(async (product) => {
      const productId = product.productId || (product.pdpUrl ? await resolveProductId(product.pdpUrl, apiConfig) : null);

      if (!productId) {
        customLog(`[${product.id}] has neither productId nor a resolvable pdpUrl — skipping the lookup`, "", "warn");
        return null;
      }

      const data = await fetchProduct(store, productId, apiConfig);
      return data ? [product.id, data] : null;
    })
  );

  return entries.filter(Boolean).reduce((acc, [id, data]) => ((acc[id] = data), acc), {});
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

export { getProducts, formatPrice, resolveProductId };

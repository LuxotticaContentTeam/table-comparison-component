/**
 * SGH's product service.
 *
 *   GET /wcs/resources/store/{storeId}/productInfo?partNumbers={upc,upc}&langId={langId}
 *
 * "New Prod Service (2026)" in LuxotticaContentTeam/product-services-doc >
 * sunglasshut/product-service.md. Verified against **production**
 * (www.sunglasshut.com, store 10152) with the two UPCs this module ships: 200,
 * both products in one response, USD prices and /us/ PDP urls. It is called
 * **relative**, so it is same-origin and no CORS header has to be negotiated
 * with anyone — unlike the content json, which comes from the asset host.
 *
 * It keys off the **UPC**, takes every product in one comma-separated call, and
 * returns prices already resolved. That is why this file is short: the endpoint
 * it replaced was keyed by product id, needed one request per column, and handed
 * back five raw price lists to be reduced by name and date window before a
 * number could be shown.
 *
 * ⚠️ This service is SGH's alone. LensCrafters answers 404 on this path and is
 * on an entirely different one — see variants/LC/product_service.js. Everything
 * brand-specific about the call lives in a file like this one; modules/productApi.js
 * only orchestrates.
 */
import { customLog } from "../../modules/utils";
import { parseAmount, productName } from "../../modules/productApi";

/**
 * Store identifiers, as the storefront publishes them.
 *
 * These two are what the service documentation tells a client to read — its own
 * example opens with `{ storeID: window.storeId, langId: window.langId }`.
 *
 * They are written by an inline, server-rendered script in the page header, so
 * they are plain strings that are simply there — no polling, no globals that
 * land late. Verified on all ten markets, on www.sunglasshut.com and on stage:
 * /us 10152/-1, /ca-en 10154/-25, /ca-fr 10154/-28, /uk 11352/-24, /au 11351/-26,
 * /de 14351/-3, /fr 13801/-2, /es 13251/-5, /mx 16001/-29, /nl 19001/-44. They
 * are read here rather than authored in the json on purpose: the page cannot
 * disagree with itself, and a new market needs nothing but its copy and its UPC.
 *
 * Timing is not a worry. These are defined while the document is still being
 * parsed, and the lookup runs from the lazy intersection observer, once the
 * reader has scrolled the module into view.
 *
 * The **langId is not derived from the language**: it names the market's
 * catalog, not the tongue, and English alone answers to four different ids. The
 * one market where it is the only thing that varies is Canada, where store 10154
 * serves both /ca-en and /ca-fr and the langId is what flips the CTA between them.
 *
 * Two degradations, both deliberate:
 * - no `storeId` — no call at all, and every column keeps its authored content.
 *   The store decides currency, price and discount, so a guessed one is worse
 *   than none. This is the case in development, where there is no storefront.
 * - a `storeId` but no `langId` — the call still goes out without the parameter,
 *   and the store answers in its own default language (verified on 10152, 10154
 *   and 19001). Only /ca-fr loses anything: it would read as /ca-en, same
 *   currency, same prices.
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

const requestUrl = ({ storeId, langId }, upcs) => {
  const path = `/wcs/resources/store/${storeId}/productInfo?partNumbers=${upcs.map(encodeURIComponent).join(",")}`;

  // Only when there is one to send. `langId=undefined` is not a soft failure:
  // the endpoint answers CWXFR0230E with no products, so every column loses its
  // price. Leaving the parameter off entirely is safe — see `resolveStore`.
  return langId ? `${path}&langId=${langId}` : path;
};

const extract = (payload) => (Array.isArray(payload && payload.products) ? payload.products : []);

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
 * on ca-en. The colours travel with it so the badge matches whatever palette the
 * promotion is running elsewhere on the page.
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
 * The two numbers the PDP shows, and the badge that goes with them.
 *
 * The endpoint quotes the prices already resolved — no price list to pick, no
 * promotion window to honour — but as **strings**, and in two different
 * notations, which is `parseAmount`'s whole job. A sale is simply an offer below
 * the list price.
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
    // Only meaningful next to a struck-through price, so it is dropped when the
    // storefront quotes one number.
    badge: hasDiscount ? pickBadge(prices) : null,
  };
};

/**
 * Reduce one entry of the response to the handful of fields the table renders.
 *
 * ⚠️ The response also carries `catentryId`, which **is** the product id the old
 * endpoint wanted — handy when debugging, read by nothing.
 */
const reduce = (product) => ({
  upc: product.upc ? String(product.upc) : null,
  brand: product.brand || "",
  model: product.model || "",
  name: productName(product.brand, product.name || product.model),
  pdpUrl: product.pdpURL || null,
  image: pickImage(product),
  prices: pickPrices(product.prices),
});

export default { resolveStore, requestUrl, extract, reduce };

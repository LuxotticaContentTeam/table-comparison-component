/**
 * LensCrafters' product service.
 *
 *   GET /AjaxPartNumberView?storeId={id}&catalogId={id}&langId={id}
 *       &pageSize={n}&orderBy=1&partNumbers={upc,upc}
 *
 * From LuxotticaContentTeam/product-services-doc > lenscrafters/product-service.md,
 * verified 2026-09-21 against production on both LC domains.
 *
 * ⚠️ It is NOT the service SGH uses. The SGH path answers **404** here — checked
 * on www.lenscrafters.com (store 10851) and www.lenscrafters.ca (store 10852) —
 * so this is a different endpoint with different parameters and a different
 * response shape, not the same call against another host. Four differences
 * matter, and each one is handled below:
 *
 *  1. it needs a **catalogId**, which SGH's call has no notion of;
 *  2. the products are nested at `products.products.product[]`, not a flat array;
 *  3. there is **no usable list price**: `listPrice` comes back as the literal
 *     string "$ 0" on every item, so no struck price and no discount badge can
 *     be built. `price` is what the shopper pays;
 *  4. there is **no ISO currency code** in the response at all, so it is read
 *     from the page instead (`ct_data.currency`) — without it Intl has nothing
 *     to format with and the price would render as a bare number.
 *
 * Canada is a **separate domain**, www.lenscrafters.ca, not a path on .com:
 * store 10852 for both languages, langId -24 on en-CA and -25 on fr-CA. Same
 * shape as SGH's Canada — the store is the market, the langId is the tongue.
 */
import { customLog } from "../../modules/utils";
import { parseAmount, productName } from "../../modules/productApi";

/**
 * Store identifiers, as LensCrafters publishes them.
 *
 * `window.storeId` / `window.langId` / `window.catalogId` are all present, and
 * so is the legacy `ct_data` object the service doc's own example reads. Both
 * are used here: the three globals first, `ct_data` as the fallback and as the
 * only source of the currency.
 *
 * ⚠️ Verified on a PDP and on the .ca home page. On the www.lenscrafters.com
 * **home page** none of them exist and `<html lang>` is absent too — so where
 * the module is placed matters. On a page without a store id it degrades the
 * same way SGH does: no call, every column keeps its authored copy.
 *
 * @returns {{storeId: string, langId: string, catalogId: string, currency: string}|null}
 */
const resolveStore = () => {
  const legacy = typeof window.ct_data === "object" && window.ct_data ? window.ct_data : {};

  const storeId = window.storeId || legacy.storeId;
  const langId = window.langId || legacy.langID;
  const catalogId = window.catalogId || legacy.catalogID;

  if (!storeId) {
    customLog("no window.storeId on the page — prices and CTAs stay as authored", "", "warn");
    return null;
  }

  if (!catalogId) {
    customLog("no window.catalogId on the page — LensCrafters needs one, so no lookup is made", "", "warn");
    return null;
  }

  if (!langId) {
    customLog(`no window.langId on the page — asking store ${storeId} in its default language`, "", "warn");
  }

  return {
    storeId: String(storeId),
    langId: langId ? String(langId) : "",
    catalogId: String(catalogId),
    // Not in the response, unlike SGH's. Without it the price renders unformatted.
    currency: legacy.currency ? String(legacy.currency) : "",
  };
};

const requestUrl = ({ storeId, langId, catalogId }, upcs) => {
  // The documented example sends 30. It is a page size, so it has to be at
  // least as large as the table or the last columns come back empty.
  const pageSize = Math.max(30, upcs.length);
  const path = `/AjaxPartNumberView?storeId=${storeId}&catalogId=${catalogId}&pageSize=${pageSize}&orderBy=1&partNumbers=${upcs.map(encodeURIComponent).join(",")}`;

  return langId ? `${path}&langId=${langId}` : path;
};

const extract = (payload) => {
  const list = payload && payload.products && payload.products.products && payload.products.products.product;
  return Array.isArray(list) ? list : [];
};

/**
 * Packshot. One url, not a sorted list.
 *
 * The alt is deliberately left empty. LensCrafters answers `imageAltText` with
 * "Image for 8056262721339" — the UPC read out loud — where SGH sends a real
 * description. Empty lets contents.js fall back to the authored product name,
 * which is what a screen reader should hear.
 */
const pickImage = (product) => {
  const url = product.productImage || product.productImageFront || product.productImageQuarter;
  return url ? { url, alt: "" } : null;
};

/**
 * The one number this service gives.
 *
 * `listPrice` is the string "$ 0" on every product seen, so there is nothing to
 * strike through: `list` and `offer` are the same figure, `hasDiscount` is
 * always false and there is no badge. That is a property of the service, not a
 * gap here — `promotionalFlag` exists but carries no percentage, no wording and
 * no colours, so there is nothing to render from it.
 *
 * The currency comes from the page, because the response has none.
 */
const pickPrices = (product, currency) => {
  const price = parseAmount(product.price);
  if (!Number.isFinite(price)) return null;

  return {
    list: price,
    offer: price,
    currency: currency || null,
    hasDiscount: false,
    badge: null,
  };
};

/**
 * Reduce one entry of the response to the fields the table renders.
 *
 * `name` is the UPC and `productName` is the model code, so neither is a human
 * name — `modelname` is the closest there is. It only ever feeds a fallback,
 * since every column's visible title is authored in the json.
 */
const reduce = (product, store = {}) => ({
  upc: product.upc ? String(product.upc) : null,
  brand: product.brand || "",
  model: product.modelname || "",
  name: productName(product.brand, product.modelname),
  pdpUrl: product.pdpURL || null,
  image: pickImage(product),
  prices: pickPrices(product, store.currency),
});

export default { resolveStore, requestUrl, extract, reduce };

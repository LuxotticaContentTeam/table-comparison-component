import { Analytics } from "./modules/analytics";
import { customLog, getTrad, getDeviceType } from "./modules/utils";
import { createComparisonState, isCompact } from "./modules/comparisonState";
import { getProducts, formatPrice } from "./modules/productApi";
import { createProductSelector } from "./modules/productSelector";

const BLOCK = "ct_comparison";

// Replaced at build time by tasks/script.task.js from
// package.json > projectConfigurations.paths.{developmentImage,productionImage}
const IMAGE_PATH = "@imagePath@";

// A json image value is normally a file name relative to IMAGE_PATH, carrying
// the brand folder ("SGH/badge-photo.svg"). A value that already points
// somewhere on its own — an absolute url, a protocol-relative one, a
// root-relative path, a data uri — must be left alone: prefixing it produces
// "./static/images/https://..." and the image silently 404s.
const isSelfContainedUrl = (value) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(value);

// Analytics. Every clickable element carries a data-tracking-id; the module
// (modules/analytics.js) pushes `data_element_id` as
// `X_ProductComparisonPlacement_<that id>` and `data_description` as the
// element's data-tracking-description. The ids are written to be readable in a
// report without a legend, and the product half is the json's own product id,
// so a row in analytics points straight back at an object in the content json:
//
//   ToggleOnlyDifferences          the "Only show differences" switch
//   ShopNow_<product id>           the CTA under a column     e.g. ShopNow_rbm-gen-3
//   OpenProductSelector_<1|2>      opening a compact column's switcher
//   SelectProduct_<product id>     choosing a product in it   e.g. SelectProduct_rbm-gen-2
//
// The prefix is set in main.js. There is no placement name assigned by the
// analytics team, so it says what the placement is rather than repeating the
// repo name.

/**
 * Builds the comparison table.
 *
 * The markup that ships in the fragment is a generic skeleton — two columns,
 * five rows — there only so the section occupies space instead of appearing
 * out of nothing. It is replaced wholesale on the first render: the real shape
 * is N columns by M rows and is not knowable until the json has landed.
 *
 * That is also why the skeleton is not generated from the json: if it were,
 * adding a product would change the html and oblige a re-paste into CoreMedia.
 * A generic skeleton costs a small layout shift once and keeps the content
 * json the only thing that ever has to be re-uploaded.
 */
export class Contents {
  constructor({ stateManger, trackingId, json }) {
    this.json = json;
    this.stateManger = stateManger;
    this.trackingId = trackingId;
  }

  init() {
    if (this.initialized) return;
    customLog("[Contents] - init");

    this.container = document.querySelector(this.stateManger.selector);
    if (!this.container) return;

    const data = this.json && this.json.comparison;

    if (!data || !Array.isArray(data.products) || !Array.isArray(data.rows)) {
      customLog("[Contents] - no comparison data: the module needs comparison.products and comparison.rows", "", "err");
      this.container.remove();
      return;
    }

    if (data.products.length < 2) {
      customLog(`[Contents] - a comparison needs at least 2 products, the json has ${data.products.length}`, "", "err");
      this.container.remove();
      return;
    }

    this.data = data;
    this.infoStore = this.stateManger.infoStore;

    this.state = createComparisonState({ products: data.products, rows: data.rows });
    this.state.setDevice(this.stateManger.device);
    this.state.subscribe((reason) => this.render(reason));

    this.buildShell();
    this.render("init");
    this.observeResize();

    // The table is usable before any of this resolves: prices, packshots and
    // canonical PDP links drop in as they arrive, one request per product.
    this.loadProducts();

    Analytics.init({
      env: this.stateManger.env,
      trackingId: this.trackingId,
      moduleContainerSelector: this.container,
    });

    this.initialized = true;
    this.container.dataset.loaded = true;
  }

  trad(field) {
    return getTrad(field, this.infoStore);
  }

  // --- shell -----------------------------------------------------------

  /**
   * The parts that never change: the filter, and the two regions the table is
   * rendered into. Built once; `render()` only touches the regions.
   *
   * There is deliberately no heading here. The title and the subtitle above the
   * table are authored by the editor in CoreMedia, as ordinary rows above this
   * one, so the module renders the comparison and nothing else.
   */
  buildShell() {
    this.container.textContent = "";

    const section = document.createElement("section");
    section.className = BLOCK;

    this.table = document.createElement("div");
    this.table.className = `${BLOCK}__table`;
    this.table.setAttribute("role", "table");

    this.head = document.createElement("div");
    this.head.className = `${BLOCK}__head`;
    this.head.setAttribute("role", "row");

    this.body = document.createElement("div");
    this.body.className = `${BLOCK}__body`;
    this.body.setAttribute("role", "rowgroup");

    this.table.appendChild(this.head);

    // The switch sits between the product columns and the rows, which in the
    // design means inside the table rather than above it. `display: contents`
    // on the head and the body makes them transparent to the grid, so the
    // toolbar is just another grid item — spanning every track — placed
    // between them.
    if (this.state.hasToggle) this.table.appendChild(this.buildToggle());

    this.table.appendChild(this.body);
    section.appendChild(this.table);
    this.container.appendChild(section);

    this.section = section;
  }

  /**
   * The switch is a real checkbox with a drawn track: the input keeps the
   * label, the keyboard and screen readers working, and the css only has to
   * move the knob.
   */
  buildToggle() {
    const wrapper = document.createElement("div");
    wrapper.className = `${BLOCK}__toolbar`;

    const label = document.createElement("label");
    label.className = `${BLOCK}__toggle`;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = `${BLOCK}__toggle-input`;
    input.checked = this.state.onlyDifferences;
    input.dataset.trackingId = "ToggleOnlyDifferences";
    input.dataset.trackingDescription = this.trad(this.data.onlyDifferencesLabel);

    const track = document.createElement("span");
    track.className = `${BLOCK}__toggle-track`;
    track.setAttribute("aria-hidden", "true");

    const knob = document.createElement("span");
    knob.className = `${BLOCK}__toggle-knob`;
    track.appendChild(knob);

    const text = document.createElement("span");
    text.className = `${BLOCK}__toggle-label`;
    text.textContent = this.trad(this.data.onlyDifferencesLabel);

    input.addEventListener("change", () => this.state.toggleOnlyDifferences(input.checked));

    label.append(input, track, text);
    wrapper.appendChild(label);
    return wrapper;
  }

  // --- render ----------------------------------------------------------

  /**
   * @param {string} reason "init" | "select" | "onlyDifferences" | "device"
   */
  render(reason) {
    // Only the rows can change when the filter moves; re-rendering the product
    // headers too would rebuild the selects under the user's finger and drop
    // an open dropdown.
    if (reason !== "onlyDifferences") this.renderHead();
    this.renderBody();

    this.table.style.setProperty("--ct-columns", String(this.state.columns.length));
    this.section.dataset.products = String(this.state.products.length);
    this.section.dataset.device = this.state.device;

    if (this.initialized) Analytics.addTracking();
  }

  renderHead() {
    this.head.textContent = "";

    // The empty cell above the row labels. Present in the DOM so the grid has
    // a real first column on desktop.
    const corner = document.createElement("div");
    corner.className = `${BLOCK}__corner`;
    corner.setAttribute("role", "columnheader");
    this.head.appendChild(corner);

    this.state.columns.forEach((product, slot) => {
      this.head.appendChild(this.buildProductCell(product, slot));
    });
  }

  buildProductCell(product, slot) {
    const cell = document.createElement("div");
    cell.className = `${BLOCK}__product`;
    cell.setAttribute("role", "columnheader");
    cell.dataset.productId = product.id;

    const name = this.trad(product.name);

    // The dropdown only exists in the compact layout, and only when there is
    // something to swap in — with exactly two products every column is
    // already on screen.
    if (isCompact(this.state.device) && this.state.hasSelectors) {
      cell.appendChild(this.buildSelector(product, slot));
    }

    const image = document.createElement("img");
    image.className = `${BLOCK}__product-image`;
    image.loading = "lazy";
    image.decoding = "async";
    image.alt = "";
    cell.appendChild(image);

    const meta = this.trad(product.meta);
    if (meta) {
      const metaNode = document.createElement("span");
      metaNode.className = `${BLOCK}__product-meta`;
      metaNode.textContent = meta;
      cell.appendChild(metaNode);
    }

    const nameNode = document.createElement("span");
    nameNode.className = `${BLOCK}__product-name`;
    nameNode.textContent = name;
    cell.appendChild(nameNode);

    const badge = this.buildBadge(product);
    if (badge) cell.appendChild(badge);

    const price = document.createElement("span");
    price.className = `${BLOCK}__product-price`;
    cell.appendChild(price);

    const cta = document.createElement("a");
    cta.className = `${BLOCK}__cta`;
    cta.textContent = this.trad(this.data.shopNowLabel);
    // Authored as a fallback; the storefront replaces it with the canonical
    // PDP url once the product request lands.
    if (product.pdpUrl) cta.href = product.pdpUrl;
    cta.dataset.trackingId = `ShopNow_${product.id}`;
    cta.dataset.trackingDescription = name;
    cell.appendChild(cta);

    this.applyProductData(cell, product);
    return cell;
  }

  /**
   * "CAMERA + AUDIO" with its trailing glyph. Both are authored per product:
   * a model with audio only carries a different label and a different icon.
   */
  buildBadge(product) {
    const badge = product.badge;
    const label = badge && this.trad(badge.label);
    if (!label) return null;

    const node = document.createElement("span");
    node.className = `${BLOCK}__badge`;

    const text = document.createElement("span");
    text.className = `${BLOCK}__badge-label`;
    text.textContent = label;
    node.appendChild(text);

    if (badge.icon) {
      const icon = document.createElement("img");
      icon.className = `${BLOCK}__badge-icon`;
      icon.alt = "";
      icon.loading = "lazy";
      icon.decoding = "async";
      icon.src = isSelfContainedUrl(badge.icon) ? badge.icon : `${IMAGE_PATH}${badge.icon}`;
      node.appendChild(icon);
    }

    return node;
  }

  /**
   * The switcher above one compact column.
   *
   * Its options are asked of the state on every render, never stored: with
   * A|B on screen and C available, both dropdowns offer C, and swapping one
   * column immediately changes what the other offers. Deriving it each time is
   * what makes the two lists incapable of disagreeing.
   */
  buildSelector(product, slot) {
    const chevron = this.data.selectorIcon;

    return createProductSelector({
      slot,
      current: this.selectorStrings(product),
      // Object.assign rather than object spread: the boilerplate's eslint parser
      // does not accept spread in an object literal and fails the build on it.
      available: this.state.available.map((option) => Object.assign({ id: option.id }, this.selectorStrings(option))),
      ariaLabel: this.trad(this.data.selectLabel),
      iconUrl: chevron && (isSelfContainedUrl(chevron) ? chevron : `${IMAGE_PATH}${chevron}`),
      onSelect: (productId) => this.state.select(slot, productId),
    });
  }

  /**
   * The two lines the switcher shows. `family` and `shortName` exist because
   * the control splits the name — "RAY-BAN META" above "Gen 2 Optics" — where
   * the column header shows it whole. Both are optional: without them the
   * control falls back to the full name on one line.
   */
  selectorStrings(product) {
    return {
      eyebrow: this.trad(product.family),
      label: this.trad(product.shortName) || this.trad(product.name),
    };
  }

  renderBody() {
    this.body.textContent = "";

    const columns = this.state.columns;

    this.state.visibleRows.forEach((row) => {
      const line = document.createElement("div");
      line.className = `${BLOCK}__row`;
      line.setAttribute("role", "row");
      line.dataset.rowId = row.id;

      const label = document.createElement("div");
      label.className = `${BLOCK}__label`;
      label.setAttribute("role", "rowheader");
      label.textContent = this.trad(row.label);
      line.appendChild(label);

      columns.forEach((product) => {
        line.appendChild(this.buildCell(product, row));
      });

      this.body.appendChild(line);
    });
  }

  buildCell(product, row) {
    const cell = document.createElement("div");
    cell.className = `${BLOCK}__cell`;
    cell.setAttribute("role", "cell");

    const content = product.cells && product.cells[row.id];

    // A row the json declares but a product does not answer. Rendering an
    // empty cell keeps the grid aligned — dropping it would shift every cell
    // to its right into the wrong column.
    if (!content) {
      cell.dataset.empty = "true";
      customLog(`[Contents] - product "${product.id}" has no cell for row "${row.id}"`, "", "warn");
      return cell;
    }

    // A cell value is either one string or a list of specification lines. The
    // list is the common case here — "Camera resolution: …", "Image capture: …"
    // — and each line is its own paragraph so the copy breaks where it was
    // written to break, not wherever the column happens to end.
    const value = this.trad(content.value);
    const lines = Array.isArray(value) ? value : [value];

    lines.filter(Boolean).forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.className = `${BLOCK}__cell-line`;
      paragraph.textContent = text;
      cell.appendChild(paragraph);
    });

    return cell;
  }

  // --- live product data -----------------------------------------------

  async loadProducts() {
    this.productData = await getProducts(this.data.products, this.data.api || {}, this.infoStore);

    if (!Object.keys(this.productData).length) return;

    this.head.querySelectorAll(`.${BLOCK}__product`).forEach((cell) => {
      const product = this.data.products.find((entry) => entry.id === cell.dataset.productId);
      if (product) this.applyProductData(cell, product);
    });
  }

  /**
   * Drop whatever the storefront returned into one product column. Called both
   * on first paint (when it is usually a no-op) and once the requests land, so
   * a column rebuilt by a dropdown change keeps its price without re-fetching.
   */
  applyProductData(cell, product) {
    const data = this.productData && this.productData[product.id];
    if (!data) return;

    const name = this.trad(product.name) || data.name;

    const image = cell.querySelector(`.${BLOCK}__product-image`);
    if (image && data.image) {
      image.src = data.image.url;
      image.alt = data.image.alt || name || "";
    }

    const cta = cell.querySelector(`.${BLOCK}__cta`);
    if (cta && data.pdpUrl) cta.href = data.pdpUrl;

    const price = cell.querySelector(`.${BLOCK}__product-price`);
    if (price && data.prices) this.renderPrice(price, data.prices);
  }

  /**
   * "Starting from $349.99", with the list price struck through beside it when
   * the storefront reports a live promotion, and the storefront's own discount
   * badge after that.
   *
   * The badge is **not** in the Figma frame — the design shows the two figures
   * and nothing else — so it is an addition, made because the percentage is the
   * part a shopper reads first. Its wording and its colours both come from the
   * API and are applied inline rather than tokenised: the string is the
   * market's own ("30% off" on /us, "-30%" on /ca-en), and the colours are
   * whatever palette the promotion is running elsewhere on the page.
   */
  renderPrice(node, prices) {
    node.textContent = "";
    delete node.dataset.discounted;

    const offer = formatPrice(prices.offer, prices.currency, this.infoStore);
    if (!offer) return;

    const current = document.createElement("span");
    current.className = `${BLOCK}__price-current`;

    const prefix = this.trad(this.data.priceLabel);
    if (prefix) current.appendChild(document.createTextNode(`${prefix} `));

    const amount = document.createElement("span");
    amount.className = `${BLOCK}__price-amount`;
    amount.textContent = offer;
    current.appendChild(amount);

    node.appendChild(current);

    if (!prices.hasDiscount) return;

    node.dataset.discounted = "true";

    const was = document.createElement("del");
    was.className = `${BLOCK}__price-was`;
    was.textContent = formatPrice(prices.list, prices.currency, this.infoStore);
    node.appendChild(was);

    const badge = this.buildPriceBadge(prices.badge);
    if (badge) node.appendChild(badge);
  }

  /**
   * The discount badge, styled from the API.
   *
   * Only the three properties the storefront actually sends are set, so a
   * promotion that omits its colours falls back to the stylesheet rather than
   * to an empty background. A missing badge is normal — the endpoint sends one
   * only on a product that is genuinely on sale.
   */
  buildPriceBadge(badge) {
    if (!badge || !badge.value) return null;

    const node = document.createElement("span");
    node.className = `${BLOCK}__price-badge`;
    node.textContent = badge.value;

    if (badge.bgColor) node.style.backgroundColor = badge.bgColor;
    if (badge.fontColor) node.style.color = badge.fontColor;
    if (badge.fontWeight) node.style.fontWeight = badge.fontWeight;

    return node;
  }

  // --- viewport --------------------------------------------------------

  /**
   * Only a crossing of the compact breakpoint matters — it is the only thing
   * that changes the column count — and the state drops everything else, so a
   * drag-resize does not re-render on every frame.
   */
  observeResize() {
    let frame;

    window.addEventListener("resize", () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        this.state.setDevice(getDeviceType(this.stateManger.breakpoints));
      });
    });
  }
}

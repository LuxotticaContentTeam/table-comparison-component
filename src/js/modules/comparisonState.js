/**
 * What the table is currently showing.
 *
 * Two things change while the user is on the page — which products occupy the
 * two mobile columns, and whether the "only show differences" filter is on —
 * and both have to stay consistent with each other and with the viewport. They
 * live here rather than in the view so there is one place that can be reasoned
 * about, and so the dropdowns can never disagree about what is selectable.
 *
 * The state is deliberately dumb about the DOM: it takes the json, answers
 * questions, and tells subscribers when something moved.
 */
import { customLog } from "./utils";

/**
 * Mobile always compares exactly two products, whatever the json holds — the
 * design has no room for a third column at that width, so extra products are
 * reached through the dropdowns instead.
 */
const MOBILE_COLUMNS = 2;

/**
 * Anything narrower than desktop gets the two-column layout.
 *
 * The design covers 1440 and 375 only. Tablet is folded in with mobile rather
 * than left on the desktop grid, because the desktop grid has no column cap:
 * a four-product table at 768px would give each column ~180px, and the
 * stylesheet's breakpoint (`max-width: $tab-max`) already draws the line in the
 * same place — so the javascript and the css agree about what "compact" means.
 */
const isCompact = (device) => device !== "desk";

/**
 * The "only show differences" filter exists **only in a two-product table.**
 *
 * With three or more it is not merely absent from the design, it is not
 * well-defined: a row can be identical for products A and B and different for
 * C, so "hide the rows that are the same" has no single answer, and a flag
 * authored once per row would be lying for at least one pair. Rather than
 * guess, the toggle is not offered — which is exactly what the 3-product Figma
 * frame shows.
 */
const supportsOnlyDifferences = (products) => products.length === MOBILE_COLUMNS;

const createComparisonState = ({ products = [], rows = [] }) => {
  if (products.length < 2) {
    customLog(`a comparison needs at least 2 products, the json has ${products.length}`, "", "err");
  }

  const ids = products.map((product) => product.id);
  const byId = products.reduce((acc, product) => ((acc[product.id] = product), acc), {});
  const listeners = new Set();

  const state = {
    // Desktop shows every product; mobile shows the first two and swaps them
    // through the dropdowns. Both read the same array, so a resize is just a
    // change of how many entries the view consumes.
    visible: ids.slice(0, MOBILE_COLUMNS),
    onlyDifferences: false,
    device: "desk",
  };

  const notify = (reason) => listeners.forEach((listener) => listener(reason));

  return {
    get products() {
      return products;
    },

    get rows() {
      return rows;
    },

    /** The products actually rendered as columns, in column order. */
    get columns() {
      return isCompact(state.device) ? state.visible.map((id) => byId[id]).filter(Boolean) : products;
    },

    get onlyDifferences() {
      return state.onlyDifferences;
    },

    get device() {
      return state.device;
    },

    /** The dropdowns only exist once there is something to swap in. */
    get hasSelectors() {
      return products.length > MOBILE_COLUMNS;
    },

    get hasToggle() {
      return supportsOnlyDifferences(products);
    },

    /**
     * The rows to render right now. With the filter on, rows the author marked
     * as identical across the two products drop out; everything else stays.
     */
    get visibleRows() {
      if (!state.onlyDifferences) return rows;
      return rows.filter((row) => !row.hideWhenOnlyDifferences);
    },

    /**
     * What the dropdowns may offer: every product that is not already in a
     * column. With A, B, C and A|B on screen both dropdowns offer C alone; add
     * D and both offer C and D.
     *
     * It is one list, not one per dropdown, and that is the point: the answer
     * is derived from `visible` on every read, so swapping a column
     * immediately and necessarily changes what *both* dropdowns offer. Two
     * stored lists could drift apart; one derived list cannot.
     *
     * The product currently in the column is NOT in here — it is the trigger
     * label of its own dropdown, which is why the control is a listbox and not
     * a native <select> (a select has to carry its selected value as an option
     * in order to display it).
     */
    get available() {
      return products.filter((product) => !state.visible.includes(product.id));
    },

    selectedAt(slot) {
      return byId[state.visible[slot]] || null;
    },

    /**
     * Put a product into one of the two mobile columns. Selecting one that is
     * already in the other column would collapse the table into comparing a
     * product with itself, so it is refused rather than silently swapped.
     */
    select(slot, productId) {
      if (slot < 0 || slot >= MOBILE_COLUMNS) return false;
      if (!byId[productId]) return false;
      if (state.visible[slot] === productId) return false;

      const otherSlot = slot === 0 ? 1 : 0;
      if (state.visible[otherSlot] === productId) return false;

      state.visible = state.visible.map((id, index) => (index === slot ? productId : id));
      notify("select");
      return true;
    },

    toggleOnlyDifferences(force) {
      if (!supportsOnlyDifferences(products)) return false;

      const next = typeof force === "boolean" ? force : !state.onlyDifferences;
      if (next === state.onlyDifferences) return false;

      state.onlyDifferences = next;
      notify("onlyDifferences");
      return true;
    },

    /**
     * Called on resize. Only a crossing of the compact breakpoint matters — the
     * column count is the only thing it changes — so a tab/desk wobble that
     * does not cross it is dropped before it can cause a re-render.
     */
    setDevice(device) {
      if (device === state.device) return false;

      const crossed = isCompact(state.device) !== isCompact(device);
      state.device = device;

      if (!crossed) return false;
      notify("device");
      return true;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export { createComparisonState, isCompact, MOBILE_COLUMNS };

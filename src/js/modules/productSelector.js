/**
 * The compact product switcher.
 *
 * Figma: LC_RBM Aperol - Luna `5720:35891` — an "Input/InternalLabel" control
 * sitting above each of the two columns: a small grey eyebrow ("RAY-BAN META"),
 * the model below it ("Gen 2 Optics"), and a chevron on the right.
 *
 * Only the *structure* comes from that file. It is an LC frame and LC is a
 * different design system; every colour, font and radius here is SGH's, which
 * is what this release ships.
 *
 * It is a listbox rather than a <select> on purpose. The rule is "each
 * dropdown offers only the products that are not already in a column", and a
 * native select cannot express that: it has to carry its selected value as an
 * option or it has nothing to display. With the current product as the trigger
 * label, the list holds exactly the available products and nothing else.
 */
import { customLog } from "./utils";

const BLOCK = "ct_comparison";

/**
 * @param {object}   options
 * @param {number}   options.slot        column index, 0 or 1
 * @param {object}   options.current     { eyebrow, label } for the trigger
 * @param {Array}    options.available   [{ id, eyebrow, label }] — the products not in a column
 * @param {string}   options.ariaLabel
 * @param {string}   [options.iconUrl]   chevron; omitted renders no glyph
 * @param {Function} options.onSelect    (productId) => void
 * @returns {HTMLElement}
 */
const createProductSelector = ({ slot, current, available = [], ariaLabel, iconUrl, onSelect }) => {
  const wrapper = document.createElement("div");
  wrapper.className = `${BLOCK}__selector`;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = `${BLOCK}__selector-trigger`;
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  if (ariaLabel) trigger.setAttribute("aria-label", ariaLabel);
  trigger.dataset.trackingId = `OpenProductSelector_${slot + 1}`;
  // Without this the analytics push carries data_description: undefined — the
  // module only guards the value, it does not drop the key. The product on
  // screen when the switcher was opened is also the useful half of the event.
  trigger.dataset.trackingDescription = current.label;

  const text = document.createElement("span");
  text.className = `${BLOCK}__selector-text`;

  if (current.eyebrow) {
    const eyebrow = document.createElement("span");
    eyebrow.className = `${BLOCK}__selector-eyebrow`;
    eyebrow.textContent = current.eyebrow;
    text.appendChild(eyebrow);
  }

  const value = document.createElement("span");
  value.className = `${BLOCK}__selector-value`;
  value.textContent = current.label;
  text.appendChild(value);

  trigger.appendChild(text);

  if (iconUrl) {
    const chevron = document.createElement("img");
    chevron.className = `${BLOCK}__selector-chevron`;
    chevron.src = iconUrl;
    chevron.alt = "";
    chevron.width = 16;
    chevron.height = 16;
    chevron.decoding = "async";
    trigger.appendChild(chevron);
  }

  const list = document.createElement("ul");
  list.className = `${BLOCK}__selector-list`;
  list.setAttribute("role", "listbox");
  list.hidden = true;

  available.forEach((option) => {
    const item = document.createElement("li");
    item.className = `${BLOCK}__selector-option`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", "false");
    item.tabIndex = -1;
    item.dataset.productId = option.id;
    // The interesting event is the choice, not the opening: this is what says
    // which product the user switched to. Analytics rescans on every render
    // (Contents.render > Analytics.addTracking), so options built later are
    // picked up too.
    item.dataset.trackingId = `SelectProduct_${option.id}`;
    item.dataset.trackingDescription = option.label;

    if (option.eyebrow) {
      const eyebrow = document.createElement("span");
      eyebrow.className = `${BLOCK}__selector-eyebrow`;
      eyebrow.textContent = option.eyebrow;
      item.appendChild(eyebrow);
    }

    const label = document.createElement("span");
    label.className = `${BLOCK}__selector-value`;
    label.textContent = option.label;
    item.appendChild(label);

    list.appendChild(item);
  });

  wrapper.append(trigger, list);

  // Nothing left to switch to: the control would open onto an empty list, so
  // it is rendered inert rather than misleading.
  if (!available.length) {
    trigger.disabled = true;
    customLog(`[selector ${slot + 1}] no product left to switch to`, "", "warn");
    return wrapper;
  }

  const items = [...list.querySelectorAll(`.${BLOCK}__selector-option`)];
  let open = false;

  const setOpen = (next) => {
    open = next;
    list.hidden = !next;
    trigger.setAttribute("aria-expanded", String(next));
    wrapper.dataset.open = String(next);

    if (next) {
      document.addEventListener("click", onDocumentClick, true);
      items[0].focus();
    } else {
      document.removeEventListener("click", onDocumentClick, true);
    }
  };

  // Capture phase, so a click that lands on another open selector closes this
  // one before that one opens.
  function onDocumentClick(event) {
    if (!wrapper.contains(event.target)) setOpen(false);
  }

  const choose = (productId) => {
    setOpen(false);
    trigger.focus();
    onSelect(productId);
  };

  trigger.addEventListener("click", () => setOpen(!open));

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  });

  items.forEach((item, index) => {
    item.addEventListener("click", () => choose(item.dataset.productId));

    item.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          choose(item.dataset.productId);
          break;
        case "ArrowDown":
          event.preventDefault();
          items[(index + 1) % items.length].focus();
          break;
        case "ArrowUp":
          event.preventDefault();
          items[(index - 1 + items.length) % items.length].focus();
          break;
        case "Escape":
          event.preventDefault();
          setOpen(false);
          trigger.focus();
          break;
        default:
          break;
      }
    });
  });

  return wrapper;
};

export { createProductSelector };

// check if mobile
function isMobile(breakpoints) {
  if (window.innerWidth > breakpoints.mob_max) {
    return false;
  } else {
    return true;
  }
}

/**
 * Determines the type of device based on the window width and specified breakpoints.
 *
 * @param {Object} breakpoints - Object containing breakpoint values.
 * @param {number} breakpoints.tab_max - Maximum width for tablet devices.
 * @param {number} breakpoints.mob_max - Maximum width for mobile devices.
 * @param {number} breakpoints.desk_min - Minimum width for desktop devices.
 * @param {number} breakpoints.tab_min - Minimum width for tablet devices.
 *
 * @returns {string} - The type of device ('desk' for desktop, 'tab' for tablet, 'mob' for mobile).
 */
function getDeviceType(breakpoints) {
  if (window.innerWidth > breakpoints.tab_max) {
    return "desk";
  }
  if (window.innerWidth > breakpoints.mob_max && window.innerWidth < breakpoints.desk_min) {
    return "tab";
  }
  if (window.innerWidth < breakpoints.tab_min) {
    return "mob";
  }
}

/**
 * Custom log
 * @param {String} log - Main message
 * @param {String} style - Add extra style
 * @param {String} type - "err" for error log, "wait" for wait log, "warn" for warning log
 */
const customLog = (log, style = "", type = "") => {
  // if (window.ct_SUPERNOVA.env === 'development' || localStorage.getItem("dev") == "true"){
  if (type == "err") {
    console.log("%c " + "[@projectName@]  " + log, `background: red;padding:2px 6px; border-radius:8px; color:#fff;font-family:sans-serif;font-size:14px; ${style};`);
  }
  if (type == "wait") {
    console.log("%c " + "[@projectName@]  " + log, `background: #ceb000;padding:2px 4px; border-radius:4px; color:#000;font-family:sans-serif;font-size:14px; ${style};`);
  }
  if (type == "warn") {
    console.log("%c " + "[@projectName@]  " + log, `background:rgb(239, 226, 149);padding:2px 4px; border-radius:4px; color:#000;font-family:sans-serif;font-size:14px; ${style};`);
  }
  if (type == "") {
    console.log("%c " + "[@projectName@]  " + log, `background: #000;padding:4px 8px; border-radius:6px; color:#fff;font-family:sans-serif;font-size:14px; ${style};`);
  }
  // }
};

/**
 * Registers an event listener for a specified event name and invokes a callback function when the event occurs.
 *
 * @param {string} name - The name of the event to listen for.
 * @param {function} cb - The callback function to be invoked when the event occurs.
 * @param {boolean} [once=false] - A flag indicating whether the event listener should only be invoked once.
 *
 * @typedef {Object} Event
 * @property {any} detail - The detail property of the event object.
 *
 * @example
 * // Example usage:
 * eventCatcher('customEvent', (data) => {
 *   console.log('Event caught with data:', data);
 * }, true); // Registers a one-time event listener
 */
const eventCatcher = (name, cb, once = false) => {
  /**
   * @type {Event} e - The event object passed to the callback.
   * @property {any} e.detail - The detail property of the event.
   */
  window.addEventListener(
    name,
    (e) => {
      cb(e.detail);
    },
    { once }
  );
};

/**
 * Dispatches a custom event on the window with an optional detail object.
 *
 * @param {string} event - The name of the custom event to dispatch.
 * @param {any} [detail=undefined] - An optional detail object to include with the event.
 * @returns {void}
 */
const eventDispatch = (event, detail = undefined) => {
  /**
   * @typedef {CustomEvent} CustomEvent - A custom event object.
   * @property {any} detail - The detail property of the custom event.
   */

  /**
   * Creates a new custom event with the specified name and detail.
   *
   * @type {CustomEvent}
   */
  let eventToDispatch = new CustomEvent(event, { detail: detail });
  window.dispatchEvent(eventToDispatch);
};
/**
 * Retrieves a translated value based on the provided field, store information,
 * and fallback logic for country and language.
 *
 * @param {string | object} field - The field to be translated. It can be a string or an object with translations.
 * @param {Object} storeInfo - Object containing store information.
 * @param {string} storeInfo.country - The country code for localization.
 * @param {string} storeInfo.lang - The language code for localization.
 *
 * @returns {string} - The translated value based on the provided field and store information,
 *                    with fallbacks for country and language.
 */
const getTrad = (field, storeInfo) => {
  let country = storeInfo.country;
  let lang = storeInfo.lang;
  if (field === undefined || field === "") return "";
  if (typeof field === "string") return field;

  let keys = Object.keys(field);
  if (keys.includes(country)) return field[country];
  if (keys.includes(lang)) return field[lang];
  let langStartWith = keys.find((key) => key.startsWith(lang));
  if (langStartWith) return field[langStartWith];
  if (keys.includes("en-us")) return field["en-us"];
  if (keys.includes("en")) return field["en"];

  return field[keys[0]];
};

/**
 *
 * @param {*} dataToCheck
 * @param {*} timeout
 * @param {*} startTime
 * @returns
 * @throws {Error} Throws an error if the data is not found within the specified timeout.
 *
 */
const checkData = (dataToCheck, timeout = 10000, startTime = Date.now()) => {
  return new Promise((resolve, reject) => {
    if (window[dataToCheck]) {
      resolve(window[dataToCheck]);
    } else {
      if (Date.now() - startTime >= timeout) {
        customLog("DATA NOT FOUND: [" + dataToCheck + "]  within " + timeout / 1000 + " seconds", "", "err");
        resolve(false);
        return;
      }

      setTimeout(() => {
        checkData(dataToCheck, timeout, startTime).then(resolve).catch(reject);
      }, 300);
    }
  });
};
/**
 *
 * @param {*} x - value to map
 * @param {*} a - min value
 * @param {*} b - max value
 * @param {*} c - min value of the new range
 * @param {*} d - max value of the new range
 * @returns
 */
const map = (x, a, b, c, d) => ((x - a) * (d - c)) / (b - a) + c;

/**
 *
 * @param {*} min - min value
 * @param {*} input - value to clamp
 * @param {*} max - max value
 * @returns - clamped value
 */
const clamp = (min, input, max) => {
  return Math.max(min, Math.min(input, max));
};

export { checkData, map, clamp, customLog, eventCatcher, eventDispatch, getTrad, getDeviceType, isMobile };

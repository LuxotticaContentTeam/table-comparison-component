import { getDeviceType } from "./utils";

/**
 * StateManager
 * @class
 * @classdesc StateManager class
 * @param {object} options
 * @param {string} options.selector - Selector for the module
 * @param {string} options.brand - Brand name
 * @param {string} options.imagePath - Path to the images
 * @param {object} options.device - Device breakpoints
 * @param {number} options.device.desk_min - Minimum width for desktop devices
 * @param {number} options.device.tab_max - Maximum width for tablet devices
 * @param {number} options.device.tab_min - Minimum width for tablet devices
 * @param {number} options.device.mob_max - Maximum width for mobile devices
 * @param {object} options.infoStore - Info store object. Only `lang` and
 *   `country` are read by the module (getTrad picks the copy from them); the
 *   store ids below are informational and not every brand supplies them — SGH
 *   reads the html lang attribute and carries nothing else.
 * @param {object} options.infoStore.lang - Language (en/fr/it)
 * @param {object} [options.infoStore.storeId] - Store ID (12001)
 * @param {object} [options.infoStore.catalog] - Catalog ID (241241)
 * @param {object} options.infoStore.country - Country (en-US)
 * @param {object} [options.infoStore.langID] - Language ID (-1)
 * @param {string} options.env - Environment
 *
 */

class StateManager {
  constructor({ selector, brand, device }) {
    if (StateManager._instance) {
      return StateManager._instance;
    }
    StateManager._instance = this;
    this.selector = selector;
    this.brand = brand;
    this.env = "@env@";
    this.infoStore = null;
    // Kept, not just consumed: the comparison table re-resolves the device on
    // resize (the column count depends on it), so it needs the thresholds and
    // not only the answer they produced at startup.
    this.breakpoints = device;
    this.device = getDeviceType(device);
  }
}
export default StateManager;

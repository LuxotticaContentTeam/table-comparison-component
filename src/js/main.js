import StateManager from "./modules/stateManager";
import { customLog, eventCatcher } from "./modules/utils";
import { injectCss, loadConfig } from "./modules/bootstrap";
import Lazy from "./modules/lazy";

import { Contents } from "./contents";

// The current variant supplies both: where the locale comes from
// (variants/<variantName>/info_store.js) and which storefront product
// service to talk to (variants/<variantName>/product_service.js).
import { infoStore, productService } from "@currentVariant@";

class Main {
  constructor() {
    this.selector = "#ct_cm--@projectName@"; //Banner container selector
    this.dataObjId = "ct_cm__@projectNameCamel@Config"; //Name of the json object with module data
    this.globalId = "ct_cm__@projectNameCamel@"; //Global window object name
    // Analytics prefix. Every data_element_id the module pushes is
    // `${this.anlyticsTrakingId}_${element.dataset.trackingId}`, so this is the
    // half that says WHERE the click happened.
    //
    // Deliberately not the boilerplate's "X_@projectName@Placement": that token
    // resolves to the repo name, which would put "table-comparison-component"
    // — hyphens, and the word "component" — into every row of the analytics
    // report. There is no placement name assigned by the analytics team, so the
    // rule is simply that the id reads as what it is. See contents.js for the
    // second half, the per-element ids.
    this.anlyticsTrakingId = "X_ProductComparisonPlacement"; //Global tracking id prefix
    this.brand = "@currentBrand@"; // Brand name

    this.stateManger = undefined;
    this.rtrSettings = undefined;
    this.json = undefined;

    // GLOBAL WINDOW OBJECT FOR THE MODULE
    window[this.globalId] = this;

    this.init();
  }

  async init() {
    customLog("started");
    this.envInfo();

    // LOAD THE STYLESHEET — the fragment only ships the critical css
    await injectCss();

    // GET DATA — from the inline json when there is one, from the asset host otherwise
    this.json = await loadConfig(this.dataObjId);

    if (!this.json) {
      customLog("Removing the module as no data found", "", "wait");
      document.querySelector(this.selector).remove();
      return false;
    }
    // SET STATE MANAGER
    this.stateManger = new StateManager({
      selector: this.selector,
      brand: this.brand,
      device: {
        desk_min: 1025,
        tab_max: 1024,
        tab_min: 768,
        mob_max: 767,
      },
      infoStore: undefined,
      productService,
    });

    // GET INFO STORE  es: { lang:"en", storeId: 12001, catalog: 241241, country: "en-us", langID: -1 }
    this.stateManger.infoStore = await infoStore(); // get the info store

    if (!this.stateManger.infoStore) {
      customLog("Removing the module as no info store found", "", "wait");
      document.querySelector(this.selector).remove();
      return;
    }

    // SET CONTENTS
    this.setContents();

    // LAZY LOAD CONTENT ---
    //  set on intersection/scroll, if another event is needed change eventCatcher and remove Lazy

    // CONTENTS INIT
    eventCatcher(`${this.selector}__loadData`, () => {
      this.Contents.init();
    });

    // LAZY INTERSECTION OBSERVER + on SCROLL BACKUP
    Lazy({ selector: this.selector });

    // LAZY LOAD CONTENT ---
  }

  setContents() {
    this.Contents = new Contents({
      stateManger: this.stateManger,
      json: this.json,
      trackingId: this.anlyticsTrakingId,
    });
  }

  envInfo() {
    if ("@env@" !== "development") return;

    console.table({
      env: "@env@",
      projectName: "@projectName@",
      brand: "@currentBrand@",
      currentVariant: "@currentVariant@",
      language: "@language@",
      buildVersion: "@buildVersion@",
    });
  }
}
(() => {
  new Main();
})();

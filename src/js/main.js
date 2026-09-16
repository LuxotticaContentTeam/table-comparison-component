import StateManager from "./modules/stateManager";
import { checkData, customLog, eventCatcher } from "./modules/utils";
import Lazy from "./modules/lazy";

import { Contents } from "./contents";

// info store is imported from the current variant variants/<variantName>/info_store.js
import { infoStore } from "@currentVariant@";

class Main {
  constructor() {
    this.selector = "#ct_cm--@projectName@"; //Banner container selector
    this.dataObjId = "ct_cm__@projectNameCamel@Config"; //Name of the json object with module data
    this.globalId = "ct_cm__@projectNameCamel@"; //Global window object name
    this.anlyticsTrakingId = "X_@projectName@Placement"; //Global tracking id prefix
    this.brand = "@currentBrand@"; // Brand name

    this.stateManger = undefined;
    this.rtrSettings = undefined;
    this.json = undefined;

    // GLOBAL WINDOW OBJECT FOR THE MODULE
    window[this.globalId] = this;

    this.envTest(); //TODO: REMOVE IT BEFORE PRODUCTION

    this.init();
  }

  async init() {
    customLog("started");

    // GET DATA
    this.json = await checkData(this.dataObjId); // check if the data is available in the window object

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

  envTest() {
    // ENV DATA TO REMOVE
    if ("@env@" === "development") {
      console.table({
        env: "@env@",
        projectName: "@projectName@",
        brand: "@currentBrand@",
        currentVariant: "@currentVariant@",
        language: "@language@",
        buildVersion: "@buildVersion@",
        proxy: "@proxyPath@",
      });
      console.log("\n");
    }

    // EXAMPLE OF PROXY FETCH it requires CORS Anywhere enabled (npm run proxy)
    fetch("@proxyPath@https://www.sunglasshut.com/wcs/resources/plp/10152/byPartNumbers/8056262233788,8056262364529")
      .then((response) => response.json())
      .then((json) => console.log(json.plpView.totalProducts))
      .catch((error) => console.log("Error fetching data:", error));
  }
}
(() => {
  new Main();
})();

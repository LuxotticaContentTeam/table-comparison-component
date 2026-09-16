import { Analytics } from "./modules/analytics";
import { customLog, eventCatcher, getTrad } from "./modules/utils";

export class Contents {
  constructor({ stateManger, trackingId, json }) {
    this.json = json;
    this.stateManger = stateManger;
    this.trackingId = trackingId;
  }
  init() {
    if (this.initialized) return;
    customLog("[Contents] - init");

    this.setElements();

    this.buildHtml();

    this.eventHandler();

    Analytics.init({
      env: this.stateManger.env,
      trackingId: this.trackingId,
      moduleContainerSelector: this.container,
    });

    this.initialized = true;

    this.container.dataset.loaded = true;
  }
  setElements() {
    this.container = document.querySelector(this.stateManger.selector);
  }
  buildHtml() {
    this.container.querySelector("#env-dynamic-content").innerHTML = getTrad(this.json.env_dynamic_content, this.stateManger.infoStore);
  }

  eventHandler() {}
}

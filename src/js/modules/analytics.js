import { checkData, customLog, eventCatcher } from "./utils";

export const Analytics = {
  init: function ({ env, trackingId = "", moduleContainerSelector = "" }) {
    // this.selector = selector;
    this.trackingId = trackingId;
    this.selector = moduleContainerSelector ? moduleContainerSelector : document;
    if (env === "development") {
      this.startTrack();
    } else {
      if (window.utag) {
        this.startTrack();
      } else {
        checkData("tealium_data2track").then(() => {
          this.startTrack();
        });
      }
    }
  },
  startTrack: function () {
    this.selector.querySelectorAll("[data-tracking-id]:not([data-tracked])").forEach((elem) => {
      let data = {
        id: "Click",
        Tracking_Type: "link",
        data_element_id: `${this.trackingId}_${elem.dataset.trackingId.replaceAll(" ", "")}`,
        data_description: elem.dataset.trackingDescription && elem.dataset.trackingDescription.replaceAll(" ", ""),
        data_analytics_available_call: "1",
      };
      elem.addEventListener("click", () => {
        if (elem.tagName === "A") {
          Analytics.analyticsPush(data);
        } else {
          setTimeout(() => {
            Analytics.analyticsPush(data);
          }, 1000);
        }
      });
      elem.dataset.tracked = "";
    });
  },

  addTracking: function () {
    this.startTrack();
  },
  analyticsPush: function (data) {
    if (window.tealium_data2track) {
      tealium_data2track.push(data);
    } else {
      console.log(data);
    }
  },
};

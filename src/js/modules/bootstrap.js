/**
 * Runtime asset loading.
 *
 * The CoreMedia fragment ships only the HTML skeleton, the critical css and a
 * single <script src>. Everything else — the full stylesheet and the content
 * json — is fetched from the asset host by this module, so that no <style> tag
 * ever has to sit in the middle of the page body.
 *
 * Every url is derived from @assetPath@ (package.json >
 * projectConfigurations.paths > productionAsset), replaced at build time by
 * tasks/script.task.js. The three files sit directly at that path — no
 * style/, json/ or script/ subfolder — so whatever productionAsset points at
 * is exactly the folder to upload them into, nothing more to create by hand.
 */
import { customLog } from "./utils";

const ASSET_PATH = "@assetPath@";
const BUILD_VERSION = "@buildVersion@";
const PROJECT_NAME = "@projectName@";
const IS_DEV = "@env@" === "development";

const CSS_URL = IS_DEV ? `${ASSET_PATH}css/main.css` : `${ASSET_PATH}main__${BUILD_VERSION}.min.css`;
const JSON_URL = IS_DEV ? `${ASSET_PATH}json/@currentVariant@/json.json` : `${ASSET_PATH}json__${BUILD_VERSION}.json`;

/**
 * Add the stylesheet to <head>, once per page.
 *
 * In development the css is already injected into the page by
 * tasks/inject-css-js.task.js, so this is a no-op — otherwise the page would
 * carry two copies of the same stylesheet.
 *
 * The guard is the `data-ct-css` attribute, the same "already handled" marker
 * convention used by data-tracked (modules/analytics.js) and data-loaded
 * (modules/lazy.js): the module can appear more than once in a CoreMedia page
 * and must still produce a single <link>.
 *
 * Resolves on load AND on error, so an unreachable stylesheet delays the
 * content by a request instead of hanging the module forever.
 */
const injectCss = () => {
  return new Promise((resolve) => {
    if (IS_DEV) return resolve(true);

    if (document.querySelector(`link[data-ct-css="${PROJECT_NAME}"]`)) return resolve(true);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_URL;
    link.dataset.ctCss = PROJECT_NAME;

    link.onload = () => resolve(true);
    link.onerror = () => {
      customLog(`STYLESHEET NOT LOADED: [${CSS_URL}]`, "", "err");
      resolve(false);
    };

    document.head.appendChild(link);
  });
};

/**
 * Resolve the module content.
 *
 * When the fragment already carries the json inline — which is what
 * dist/espot.html does — window[dataObjId] is populated before this bundle
 * runs, so the fetch is skipped and the same bundle serves both delivery modes.
 *
 * Returns null on failure; main.js treats that the same way it always has and
 * removes the module from the page.
 */
const loadConfig = async (dataObjId) => {
  if (window[dataObjId]) return window[dataObjId];

  try {
    const response = await fetch(JSON_URL);

    if (!response.ok) {
      customLog(`DATA NOT FOUND: [${JSON_URL}] responded ${response.status}`, "", "err");
      return null;
    }

    window[dataObjId] = await response.json();
    return window[dataObjId];
  } catch (error) {
    // A cross-origin fetch without Access-Control-Allow-Origin lands here.
    customLog(`DATA NOT LOADED: [${JSON_URL}] ${error.message}`, "", "err");
    return null;
  }
};

export { injectCss, loadConfig, CSS_URL, JSON_URL };

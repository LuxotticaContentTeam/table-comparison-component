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
 * Previewing a json that is uploaded but not live.
 *
 * `?ct-json=<name>` on the page url makes the module read `<name>.json` from
 * the same folder as the live json, instead of the live one. So a new content
 * file can be uploaded BESIDE the live one, under any name, and shown to whoever
 * gets the link — while everybody else keeps reading the live file. Going live
 * is then overwriting the live file with the new one (and purging it: the json
 * is cached for seven days).
 *
 * The value is a file NAME, never a url: anything but letters, digits, `_`, `-`
 * and `.` is ignored, so the parameter can only ever point inside this module's
 * own folder — a link to sunglasshut.com cannot make the module render a json
 * hosted somewhere else.
 *
 * A name that is not in the folder falls back to the live json, so a mistyped
 * link still shows a table. The console says which file was read.
 *
 * Only the json is previewed. The script and the stylesheet are the live ones,
 * so the new json must be one the live script can read.
 */
const JSON_PARAM = "ct-json";
const JSON_FOLDER = JSON_URL.slice(0, JSON_URL.lastIndexOf("/") + 1);

const previewJsonUrl = () => {
  let name = null;
  try {
    name = new URLSearchParams(window.location.search).get(JSON_PARAM);
  } catch (error) {
    return null;
  }
  return name && /^[\w.-]+$/.test(name) ? `${JSON_FOLDER}${name}.json` : null;
};

/**
 * One json, or null. Logs why not, so a failed preview and a failed live load
 * both say which url they tried.
 */
const fetchJson = async (url) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      customLog(`DATA NOT FOUND: [${url}] responded ${response.status}`, "", "err");
      return null;
    }

    return await response.json();
  } catch (error) {
    // A cross-origin fetch without Access-Control-Allow-Origin lands here.
    customLog(`DATA NOT LOADED: [${url}] ${error.message}`, "", "err");
    return null;
  }
};

/**
 * Resolve the module content.
 *
 * A `?ct-json` preview comes first (see above). Otherwise, when the fragment
 * already carries the json inline — which is what dist/espot.html does —
 * window[dataObjId] is populated before this bundle runs, so the fetch is
 * skipped and the same bundle serves both delivery modes.
 *
 * Returns null on failure; main.js treats that the same way it always has and
 * removes the module from the page.
 */
const loadConfig = async (dataObjId) => {
  const previewUrl = previewJsonUrl();

  if (previewUrl) {
    const preview = await fetchJson(previewUrl);

    if (preview) {
      customLog(`?${JSON_PARAM}: showing [${previewUrl}]`, "", "wait");
      window[dataObjId] = preview;
      return preview;
    }

    customLog(`?${JSON_PARAM}: falling back to the live json`, "", "warn");
  }

  if (window[dataObjId]) return window[dataObjId];

  window[dataObjId] = await fetchJson(JSON_URL);
  return window[dataObjId];
};

export { injectCss, loadConfig, CSS_URL, JSON_URL };

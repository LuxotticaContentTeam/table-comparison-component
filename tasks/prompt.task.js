/**
 * Prompt command to set project variables
 *
 * Answers can also arrive from the environment, which is what makes the build
 * usable in CI: with no TTY the inquirer prompt never resolves, gulp gives up
 * and — exiting 0 — reports success while producing no dist/ at all.
 *
 *   VARIANT   required to skip the prompt, e.g. SGH (must exist in projectConfig.json)
 *   LANGUAGE  optional, defaults to the variant's first locale (see localesForVariant)
 *   RELEASE   optional, "yes"/"true"/"1" to also write release/<VARIANT>/<version>/
 *
 * Set VARIANT and the prompt is skipped entirely; leave it unset and the
 * interactive behaviour is exactly as before. Building several brands is then a
 * matter of running the build once per variant.
 */

let { src } = require("gulp"),
  fs = require("fs"),
  $ = require("gulp-load-plugins")({ pattern: ["gulp-*"] }), // Setting a global variable to include all glup- plugin
  // `isProd` used to be read here without being imported: it only resolved
  // because script.task.js leaks it as an implicit global.
  path = require("path"),
  { conf, isProd, BRANDS } = require("./_config.js");
const c = require("ansi-colors"),
  log = require("fancy-log");

/**
 * The locales a variant ships, read from its own content json.
 *
 * Locales are per brand, not per project: SGH ships eight, another brand may
 * ship twelve or three. The content json already declares them — every
 * translatable string is an object keyed by locale — so that is the source of
 * truth, and there is no second list in projectConfig.json to drift out of sync
 * with it. Add a locale key to the json and it shows up in the prompt.
 *
 * @param {string} variant e.g. "SGH"
 * @returns {string[]} locale keys, in the order the json declares them
 */
const localesForVariant = (variant) => {
  const file = path.join(__dirname, "..", "src", "json", "variants", variant, "json.json");

  let content;
  try {
    content = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`Cannot read the locales of "${variant}" from ${file}: ${err.message}`);
  }

  const locales = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;

    const values = Object.values(node);
    // A translatable string: every value a string, keyed by locale. Anything
    // else — a card, the root — is walked into instead.
    const isTranslatable = values.length > 0 && values.every((v) => typeof v === "string") && ("en-us" in node || "en" in node);

    if (isTranslatable) {
      Object.keys(node).forEach((locale) => {
        if (!locales.includes(locale)) locales.push(locale);
      });
      return;
    }
    values.forEach(walk);
  };
  walk(content);

  if (!locales.length) {
    throw new Error(`No locales found in ${file}. Every translatable string is an object keyed by locale, e.g. { "en-us": "Main features", "en": "Main features" }.`);
  }
  return locales;
};

const getBrandExtendedName = (selectedBrand) => {
  let brandClean = selectedBrand.split("_")[0];
  let brandExtendedName = "";
  brandExtendedName = BRANDS[brandClean];
  return brandExtendedName;
};

const isTruthy = (value) => ["yes", "true", "1"].includes(String(value).trim().toLowerCase());

/**
 * Store the chosen answers where every other task reads them from.
 * @param {{lang: string|undefined, variant: string, release: boolean}} choice
 */
const applyChoice = ({ lang, variant, release }) => {
  global.projLanguage = lang ? lang : undefined;
  global.isRelease = release;
  global.selectedVariant = variant;
  global.selectedBrand = variant.split("_")[0];
  global.selectedBrandExtendedName = getBrandExtendedName(variant);

  process.env.CURRENT_BRAND = global.selectedVariant;
};

/**
 * Read the answers from the environment, or return null to fall back to the prompt.
 * Throws on an unknown variant rather than building the wrong brand silently.
 */
const choiceFromEnv = () => {
  const variant = process.env.VARIANT;
  if (!variant) return null;

  if (!conf.variants.includes(variant)) {
    throw new Error(`VARIANT "${variant}" is not in projectConfig.json > variants (${conf.variants.join(", ")})`);
  }

  const locales = localesForVariant(variant);
  const lang = process.env.LANGUAGE || locales[0];

  if (process.env.LANGUAGE && !locales.includes(process.env.LANGUAGE)) {
    throw new Error(`LANGUAGE "${process.env.LANGUAGE}" is not a locale of ${variant} (${locales.join(", ")})`);
  }

  return { lang, variant, release: isTruthy(process.env.RELEASE) };
};

module.exports = function prompt(cb) {
  const fromEnv = choiceFromEnv();

  if (fromEnv) {
    applyChoice(fromEnv);
    log(c.green.bold(`✅ Non-interactive run — variant: ${fromEnv.variant}, language: ${fromEnv.lang}, release: ${fromEnv.release ? "yes" : "no"}`));
    return cb();
  }

  const variantQuestion = {
    type: "list",
    name: "variant",
    message: "Please choose variant",
    choices: conf.variants.slice().sort(),
  };

  // Asked after the variant, and only in dev — a production build ships every
  // locale in one json and never reads projLanguage.
  const langQuestion = {
    type: "list",
    name: "lang",
    message: "Hello, please choose language",
    choices: (answers) => localesForVariant(answers.variant),
  };

  const questions = isProd
    ? [
        {
          type: "list",
          name: "release",
          message: "Create release?",
          choices: ["no", "yes"],
        },
        variantQuestion,
      ]
    : [variantQuestion, langQuestion];
  return src(["projectConfig.json"]).pipe(
    $.prompt.prompt(questions, (res) => {
      applyChoice({
        lang: res.lang,
        variant: res.variant,
        release: res.release === "yes",
      });

      cb();
    })
  );
};

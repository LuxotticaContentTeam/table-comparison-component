const /**
   * Set a variable with all data from package.json file
   */
  pkg = require("../package.json"),
  path = require("path");
conf = pkg.projectConfigurations;
projectConfigurations = require("../projectConfig.json");
conf = {
  ...conf,
  ...projectConfigurations,
};
const BRANDS = {
  OO: "oakley.com",
  RB: "ray-ban.com",
  SGH: "sunglasshut.com",
  CDM: "costadelmar.com",
  PO: "persol.com",
  OP: "oliverpeoples.com",
  OPSM: "opsm.com.au",
  SV: "salmoiraghievigano.it",
  TO: "targetoptical.com",
  LC: "lenscrafters.com",
};

/**
 * Convert a string to camelCase
 * @param {string} str - The string to convert
 * @returns {string} - The camelCase string
 */
const toCamelCase = (str) => {
  return str.toLowerCase().replace(/[-_]+(.)?/g, (match, chr) => (chr ? chr.toUpperCase() : ""));
};

module.exports = {
  /**
   * Configuration based on enviroment mode
   */
  conf: conf,
  isProd: process.env.NODE_ENV === "production",
  /**
   * Where the built files are served from once uploaded, and where a relative
   * image value in the json resolves. Every runtime URL is derived from these
   * two — see src/js/modules/bootstrap.js and contents.js.
   *
   * They are FUNCTIONS, not values, and they have to be: the variant is chosen
   * by tasks/prompt.task.js at run time, long after gulpfile.js has required
   * every task module, so a constant captured here would always be the default
   * brand's.
   *
   * **Each brand uploads to its own place.** Not a subfolder of one host — a
   * different host entirely: SGH is on media.sunglasshut.com, LC on
   * media.lenscrafters.com under a campaign-calendar path. Two brands publishing
   * the same three filenames to one folder would also overwrite each other,
   * which is invisible in development, where dist/ is already per-variant.
   *
   * So projectConfig.json > assetPaths holds a full override per variant. A
   * brand with no entry — SGH — uses the package.json values, which is what it
   * is already deployed at.
   *
   * ⚠️ These are baked into the bundle at build time. Move a brand's files and
   * that brand has to be rebuilt and re-uploaded; the js on the CDN cannot
   * discover its own new address.
   */
  imagePath: () => {
    if (process.env.NODE_ENV !== "production") return conf.paths.developmentImage;

    const override = (projectConfigurations.assetPaths || {})[global.selectedVariant] || {};
    return override.productionImage || conf.paths.productionImage;
  },
  assetPath: () => {
    if (process.env.NODE_ENV !== "production") return conf.paths.developmentAsset;

    const override = (projectConfigurations.assetPaths || {})[global.selectedVariant] || {};
    return override.productionAsset || conf.paths.productionAsset;
  },
  proxyPath: process.env.NODE_ENV === "production" ? "" : conf.paths.proxy,
  now: Date.now(),
  BRANDS,

  /**
   * Path definition
   */
  // temporary folder
  temp_folder: ".tmp",

  // Paths to source of assets
  src_folder: conf.paths.srcFolder,
  src_asset_scss: path.join(conf.paths.srcFolder, "/scss/**/*.scss"),
  src_asset_scss_variants: path.join(conf.paths.srcFolder, "/scss/variants/"),
  src_asset_scss_main: path.join(conf.paths.srcFolder, "/scss/main.scss"),
  src_asset_js: path.join(conf.paths.srcFolder, "/js/**/*.js"),
  src_asset_js_main: path.join(conf.paths.srcFolder, "/js/main.js"),
  src_asset_js_variants: path.join(conf.paths.srcFolder, "/js/variants/"),
  src_asset_img: path.join(conf.paths.srcFolder, "/images/**/*.+(png|jpg|jpeg|gif|svg|ico|mp4)"),
  src_asset_font: path.join(conf.paths.srcFolder, "/fonts/**/*.{eot,svg,ttf,woff,woff2}"),
  src_asset_html: path.join(conf.paths.srcFolder, "/index.html"),
  src_asset_html_parts: path.join(conf.paths.srcFolder, "/views/**/*.html"),
  src_asset_pug: path.join(conf.paths.srcFolder, "/views/*.pug"),
  src_asset_pug_parts: path.join(conf.paths.srcFolder, "/views/**/*.pug"),
  // Add any other assets that just need to be copied over to dist folder
  src_generic_assets: [path.join(conf.paths.srcFolder, "/conf/*.*")],
  src_templates: path.join("./utils/templates/"),
  src_proj_config: path.join("./projectConfig.json"),
  src_static_assets: path.join(conf.paths.srcFolder, "/static/**/*"),
  src_json: path.join(conf.paths.srcFolder, "/json/json_default.js"),
  src_json_variants: path.join(conf.paths.srcFolder, "/json/variants/"),

  // Paths you want to output assets to
  dist_folder: conf.paths.distFolder, // change to whatever root you want it to be.
  dist_css: path.join(conf.paths.distFolder, "/css"),
  dist_js: path.join(conf.paths.distFolder, "/js"),
  dist_img: path.join(conf.paths.distFolder, "/images"),
  dist_font: path.join(conf.paths.distFolder, "/fonts"),
  dist_html: path.join(conf.paths.distFolder, "/**/*.{twig,html}"),
  dist_espot: path.join(conf.paths.distFolder, "/**/espot.{twig,html}"),
  dist_generic: path.join(conf.paths.distFolder, "/conf"),
  dist_static_assets: path.join(conf.paths.distFolder, "/static"),
  dist_release: "./release",
  dist_json: path.join(conf.paths.distFolder, "/json"),

  assetVersion: pkg.version,
  release: pkg.version,
  projectName: pkg.name.replace("-", " "),
  projectNameNormal: projectConfigurations.projectName.replaceAll("_", "-").replaceAll(" ", "-"),
  projectNameCamel: toCamelCase(projectConfigurations.projectName.replaceAll("_", "-").replaceAll(" ", "-")),
  buildVersion: pkg.version,
};

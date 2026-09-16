/**
 * Prompt command to set project variables
 */

let { src } = require("gulp"),
  fs = require("fs"),
  $ = require("gulp-load-plugins")({ pattern: ["gulp-*"] }), // Setting a global variable to include all glup- plugin
  { conf, BRANDS } = require("./_config.js");
projectConfiguration = require("../projectConfig.json");
const getBrandExtendedName = (selectedBrand) => {
  let brandClean = selectedBrand.split("_")[0];
  let brandExtendedName = "";
  brandExtendedName = BRANDS[brandClean];
  return brandExtendedName;
};
module.exports = function prompt(cb) {
  let questions = [
    {
      type: "list",
      name: "lang",
      message: "Hello, please choose language",
      choices: projectConfiguration.langs,
    },
    {
      type: "list",
      name: "variant",
      message: "Please choose variant",
      choices: conf.variants.sort(),
    },
  ];
  if (isProd) {
    questions[0] = {
      type: "list",
      name: "release",
      message: "Create release?",
      choices: ["no", "yes"],
    };
  }
  return src(["projectConfig.json"]).pipe(
    $.prompt.prompt(questions, (res) => {
      global.projLanguage = res.lang ? res.lang : undefined;
      global.isRelease = res.release === "yes" ? true : false;
      global.selectedVariant = res.variant;
      global.selectedBrand = res.variant.split("_")[0];
      global.selectedBrandExtendedName = getBrandExtendedName(res.variant);

      process.env.CURRENT_BRAND = global.selectedVariant;

      cb();
    })
  );
};

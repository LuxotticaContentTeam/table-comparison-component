/**
 * Prompt command to set project variables
 */

const { log } = require("console");

let { src } = require("gulp"),
  c = require("ansi-colors"),
  fs = require("fs"),
  $ = require("gulp-load-plugins")({ pattern: ["gulp-*"] }), // Setting a global variable to include all glup- plugin
  { conf, isProd, BRANDS } = require("./_config.js");
projectConfiguration = require("../projectConfig.json");

module.exports = function promptNewProj(cb) {
  let question = [
    {
      type: "list",
      name: "brand",
      message: "Select brand",
      choices: [...Object.keys(BRANDS)],
    },
    {
      type: "text",
      name: "variant",
      message: "Variant (empty for default)",
    },
    {
      type: "list",
      name: "template",
      message: "Start from default template or from existing project?",
      choices: ["Default", ...projectConfiguration.variants],
    },
  ];

  return src(["projectConfig.json"]).pipe(
    $.prompt.prompt(question, (res) => {
      // console.log('Result', res);
      global.newVariant = res.brand + (res.variant ? "_" + res.variant : "");
      global.template = res.template;

      if (conf.variants.indexOf(global.newVariant) != -1) {
        console.log("\n");
        log(c.red.bold(`🛑 ${global.newVariant} already exists`));
        console.log("\n");
        process.exit(1);
      }

      console.log("\n");

      console.table({
        "Variant Name": global.newVariant,
        "Starting from": global.template === "Default" ? "Default template" : global.template,
      });

      console.log("\n");

      cb();
    })
  );
};

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

module.exports = function promptRemove(cb) {
  let question = [
    {
      type: "list",
      name: "variant",
      message: "Select variant to remove",
      choices: [...projectConfiguration.variants],
    },

    {
      //confirm
      type: "confirm",
      name: "confirm",
      message: "Are you sure you want to remove this variant?",
    },
  ];

  return src(["projectConfig.json"]).pipe(
    $.prompt.prompt(question, (res) => {
      console.log(res.confirm);
      global.variantToRemove = res.variant;
      global.continue = res.confirm;

      if (global.continue) {
        console.log("\n");
        log(c.yellow.bold(`Removing: ${global.variantToRemove}`));
        console.table({
          "Variant Name": global.variantToRemove,
          Confirm: global.continue ? "Yes" : "No",
        });
        console.log("\n");
      } else {
        console.log("\n");
        log(c.red.bold(`🛑 ${global.variantToRemove} will not be removed`));
        console.log("\n");
      }

      cb();
    })
  );
};

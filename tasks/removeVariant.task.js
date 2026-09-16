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
const deleteAsync = require("del");

// A proper Gulp task
function deleteVariant(cb) {
  if (!global.continue) {
    cb();
    return;
  }

  let source = [
    `./src/js/variants/${global.variantToRemove}/`,
    `./src/scss/variants/${global.variantToRemove}/`,
    `./src/json/variants/${global.variantToRemove}/`,
    `./src/views/main/${global.variantToRemove}/`,
  ];
  console.log("\n");
  log(c.white.bold("Removing project: "), c.green.bold(`${global.variantToRemove}`));

  // Use `del` to delete the directory
  deleteAsync(source, { force: true })
    .then((paths) => {
      if (paths.length > 0) {
        log(c.green.bold("🟢 Project removed!"));
        log(c.white.bold("Removed files and directories:"));
        paths.forEach((path) => log(`  - ${path}`));
        console.log("\n");
      } else {
        log(c.red.bold("❌ No files or directories were removed. Check the path."));
        console.log("\n");
      }
      cb();
    })
    .catch((err) => {
      log(c.red.bold("❌ Error removing project: "), err);
      cb(err); // Pass error to Gulp if something goes wrong
    });
}

const updateProjectsConfigRemove = (cb) => {
  if (!global.continue) {
    cb();
    return;
  }
  console.log("\n");
  log(c.white.bold("Updating projectsConfig.json..."));
  return new Promise((resolve, reject) => {
    projectConfiguration.variants = projectConfiguration.variants.filter((variant) => variant !== global.variantToRemove);

    fs.writeFile("projectConfig.json", JSON.stringify(projectConfiguration, null, 2), (err) => {
      if (err) {
        log(c.red.bold("❌ Error updating projectsConfig.json"));
        reject(err);
      } else {
        log(c.green.bold("🟢 projectConfig.json updated!"));
        console.log("\n");
        resolve();
      }
    });
  });
};

module.exports = {
  deleteVariant,
  updateProjectsConfigRemove,
};

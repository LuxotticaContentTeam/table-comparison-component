/**
 * Move generic assets to dist folder
 */

let { src, dest } = require("gulp"),
  $ = require("gulp-load-plugins")({ pattern: ["gulp-*"] }),
  fs = require("fs"),
  c = require("ansi-colors"),
  { src_folder, src_proj_config, conf, src_templates } = require("./_config.js"),
  browserSync = require("browser-sync").create();

const createJs = (done) => {
  const destinationPath = src_folder + "js/variants/" + global.newVariant;
  const sourcePath = global.template === "Default" ? src_templates + "js/*.js" : src_folder + "js/variants/" + global.template + "/*.js";

  // console.log("Copying from: ", sourcePath);
  // console.log("Copying to: ", destinationPath);

  return src(sourcePath)
    .pipe($.plumber()) // Prevent pipe breaking due to errors
    .pipe(dest(destinationPath))
    .on("end", () => log(c.green.bold("✅ CreateJS completed successfully!")))
    .on("error", (err) => console.error("Error during task: ", err));
};

const createScss = (done) => {
  const destinationPath = src_folder + "scss/variants/" + global.newVariant;
  const sourcePath = global.template === "Default" ? src_templates + "scss/*.scss" : src_folder + "scss/variants/" + global.template + "/*.scss";
  return src(sourcePath)
    .pipe($.plumber()) // Prevent pipe breaking due to errors
    .pipe(dest(destinationPath))
    .on("end", () => log(c.green.bold("✅ CreateScss completed successfully!")))
    .on("error", (err) => console.error("Error during task: ", err));
};

const createJson = (done) => {
  const destinationPath = src_folder + "json/variants/" + global.newVariant;
  const sourcePath = global.template === "Default" ? src_templates + "json/*.js" : src_folder + "json/variants/" + global.template + "/*.js";
  return src(sourcePath)
    .pipe($.plumber()) // Prevent pipe breaking due to errors
    .pipe(dest(destinationPath))
    .on("end", () => log(c.green.bold("✅ CreateJson completed successfully!")))
    .on("error", (err) => console.error("Error during task: ", err));
};

const createViews = (done) => {
  const destinationPath = src_folder + "views/main/" + global.newVariant;
  const sourcePath = global.template === "Default" ? src_templates + "views/**/*.+(html|pug)" : src_folder + "views/main/" + global.template + "/**/*.+(html|pug)";
  return src(sourcePath)
    .pipe($.plumber()) // Prevent pipe breaking due to errors
    .pipe(dest(destinationPath))
    .on("end", () => log(c.green.bold("✅ CreateViews completed successfully!")))
    .on("error", (err) => console.error("Error during task: ", err));
};

const updateProjectConfig = () => {
  // Read the current projectConfig.json
  return new Promise((resolve, reject) => {
    fs.readFile(src_proj_config, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading projectConfig.json: ", err);
        return;
      }

      let config;
      try {
        config = JSON.parse(data); // Parse JSON
      } catch (parseErr) {
        console.error("Error parsing JSON: ", parseErr);
        return;
      }

      // Check if the project already exists in the array
      if (!config.variants.includes(global.newVariant)) {
        config.variants.push(global.newVariant); // Add new project to the array
      } else {
        console.log("Project already exists in config.");
      }

      // Write the updated config back to projectConfig.json
      fs.writeFile(src_proj_config, JSON.stringify(config, null, 2), "utf8", (writeErr) => {
        if (writeErr) {
          log(c.red.bold("Error writing to projectConfig.json: ", writeErr));
          return reject(writeErr); // Reject the promise on error
        } else {
          log(c.green.bold(`✅ Successfully added ${global.newVariant}`));
          resolve(); // Resolve the promise on success
        }
      });
    });
  });
};

module.exports = {
  createJs,
  createScss,
  createJson,
  createViews,
  updateProjectConfig,
};

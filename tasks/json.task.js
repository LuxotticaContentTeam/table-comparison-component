/**
 * Build the module content.
 *
 * One source of truth — src/json/variants/<VARIANT>/json.json — produces two
 * artifacts, because the module ships through two different channels:
 *
 *   json__<version>.json   the file uploaded next to the css and the script.
 *                          The CoreMedia fragment carries no data at all; the
 *                          bundle fetches this (src/js/modules/bootstrap.js).
 *   json.min.js            the same object as a window assignment, which
 *                          buildEspot concatenates into the self-contained
 *                          dist/espot.html. Production only — nothing else
 *                          consumes it.
 */
let fs = require("fs"),
  path = require("path"),
  log = require("fancy-log"),
  c = require("ansi-colors"),
  { dist_json, dist_release, release, src_json_variants, projectNameCamel, isProd } = require("./_config.js"),
  browserSync = require("browser-sync").create();

const globalName = `ct_cm__${projectNameCamel}Config`;
const jsonFileName = isProd ? `json__${release}.json` : "json.json";

const json = (done) => {
  const srcPath = path.join(src_json_variants, global.selectedVariant, "json.json");

  if (!fs.existsSync(srcPath)) {
    log(c.yellow.bold(`🟡 File ${srcPath} does not exist`));
    return done();
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(srcPath, "utf8"));
  } catch (error) {
    // A malformed json would otherwise only surface as an empty module in the
    // browser, long after the build reported success.
    log(c.red.bold(`❌ ${srcPath} is not valid JSON: ${error.message}`));
    return done();
  }

  const destFolder = path.join(dist_json, global.selectedVariant);
  fs.mkdirSync(destFolder, { recursive: true });

  fs.writeFileSync(path.join(destFolder, jsonFileName), isProd ? JSON.stringify(data) : JSON.stringify(data, null, 2));
  log(c.green.bold(`✅ JSON file created: ${global.selectedVariant}/${jsonFileName}`));

  if (isProd) {
    fs.writeFileSync(path.join(destFolder, "json.min.js"), `window["${globalName}"]=${JSON.stringify(data)};`);
    log(c.green.bold(`✅ Inline JSON created for espot: ${global.selectedVariant}/json.min.js`));
  }

  browserSync.reload();
  done();
};

const jsonBuild = (done) => {
  if (!global.isRelease) return done();

  const srcPath = path.join(dist_json, global.selectedVariant, jsonFileName);
  const destFolder = path.join(dist_release, global.selectedVariant, release);

  if (!fs.existsSync(srcPath)) {
    log(c.red.bold(`❌ No JSON file found at ${srcPath}`));
    return done();
  }

  fs.mkdirSync(destFolder, { recursive: true });
  fs.copyFileSync(srcPath, path.join(destFolder, jsonFileName));
  log(c.green.bold(`✅ JSON file copied to release folder!`));
  done();
};

module.exports = {
  json,
  jsonBuild,
};

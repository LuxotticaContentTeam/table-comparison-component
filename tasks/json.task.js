/**
 * Move generic assets to dist folder
 */
const wait = require("gulp-wait");
let { src, dest } = require("gulp"),
  fs = require("fs"),
  c = require("ansi-colors"),
  uglify = require("gulp-uglify"), // Import uglify for JS minification
  replace = require("gulp-string-replace"),
  rename = require("gulp-rename"),
  $ = require("gulp-load-plugins")({ pattern: ["gulp-*"] }), // Setting a global variable to include all glup- plugin
  {
    src_folder,
    src_generic_assets,
    dist_generic,
    dist_folder,
    isPreview,
    dist_ghPages,
    dist_json,
    dist_release,
    release,
    src_json_variants,
    src_json,
    conf,
    projectNameNormal,
    isProd,
    projectNameCamel,
  } = require("./_config.js"),
  browserSync = require("browser-sync").create();

const json = (done) => {
  const dist_generic_assets = [];

  const genericAssetFiles = [
    {
      path: path.join(src_json_variants, global.selectedVariant, "json.js"),
      dest: global.selectedVariant,
    },
  ];

  if (src_json.length > 0 || src_json_variants.length > 0) {
    genericAssetFiles.map((file) => {
      if (!fs.existsSync(file.path)) {
        log(c.yellow.bold(`🟡 File ${file.path} does not exist`));
        done();
        streamFail = true;
      } else {
        log(c.green.bold(`✅ JSON file ${file.path}`));
        return src(file.path, {
          allowEmpty: true,
        })
          .pipe(replace("@projectName@", projectNameNormal))
          .pipe(replace("@projectNameCamel@", projectNameCamel))
          .pipe($.if(isProd, uglify())) // Minify JS
          .pipe($.if(isProd, rename({ suffix: ".min" })))
          .pipe(dest(path.join(dist_json, file.dest)))
          .on("end", () => {
            console.log(c.green.bold(`✅ Minified file created: ${file.dest}/json.min.js`));
            done();
          })
          .pipe(browserSync.stream());
      }
    });
  }
};

const jsonBuild = (done) => {
  if (!global.isRelease) return done();

  const srcPath = path.join(dist_json, global.selectedVariant, "json.min.js");
  const destPath = path.join(dist_release, global.selectedVariant, release);

  if (!fs.existsSync(srcPath)) {
    console.log(c.red.bold(`❌ No minified JSON files found at ${srcPath}`));
    return done();
  }

  return src(srcPath, { allowEmpty: true })
    .pipe(dest(destPath))
    .on("end", () => {
      console.log(c.green.bold(`✅ JSON files copied to release folder!`));
      done();
    });
};

module.exports = {
  json,
  jsonBuild,
};

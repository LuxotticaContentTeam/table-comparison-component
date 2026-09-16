/**
 * Process javascript files.
 * Is possible to set value replace some string
 */
const concat = require("gulp-concat");
const { stream } = require("browser-sync");
const {
  src_asset_js_variants,
  conf,
  src_folder,
  proxyPath,
  dist_js,
  buildVersion,
  release,
  dist_release,
  src_asset_js,
  projectNameNormal,
  projectNameCamel,
} = require("./_config.js");
const aliasify = require("aliasify");
let { src, dest, series, glob } = require("gulp"),
  $ = require("gulp-load-plugins")({ pattern: ["gulp-*"] }), // Setting a global variable to include all glup- plugin
  browserSync = require("browser-sync").create(),
  log = require("fancy-log"),
  pkg = require("../package.json"),
  c = require("ansi-colors"),
  fs = require("fs"),
  browserify = require("browserify"),
  babelify = require("babelify"),
  source = require("vinyl-source-stream"),
  buffer = require("vinyl-buffer"),
  replace = require("gulp-string-replace"),
  es = require("event-stream");
(path = require("path")), ({ src_asset_js_main, isProd, imagePath, assetPath, now } = require("./_config.js"));

const lint = () => {
  return src(src_asset_js)
    .pipe(
      $.eslint({
        ecmaVersion: "latest",
        parserOptions: {
          ecmaVersion: 8,
          sourceType: "module",
          requireConfigFile: false,
        },

        //List or rules at: https://eslint.org/docs/latest/rules/
        extends: "eslint:recommended",
        rules: {
          "no-useless-escape": 0,
          "no-const-assign": 2,
        },

        globals: pkg.eslint.globals,
      })
    )
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
};

const js = (done) => {
  let streamFail = false;

  const aliasifyConfig = {
    aliases: {
      "@currentVariant@": { relative: `./variants/${global.selectedVariant}/main.js` },
    },
    verbose: false,
  };

  const jsFiles = [
    {
      path: path.join(src_folder, "js/critical.js"),
      dest: "critical",
    },
    {
      path: src_asset_js_main,
      dest: ".",
    },
    {
      path: path.join(src_asset_js_variants, global.selectedVariant, "main.js"),
      dest: global.selectedVariant,
    },
  ];

  let tasks = jsFiles
    .map(function (file) {
      if (!fs.existsSync(file.path)) {
        if (file.path.includes("critical.js")) {
          // Log warning and skip critical.js file
          log(c.yellow.bold(`⚠️  File ${file.path} does not exist, skipping...`));
          return null; // Skip this file but continue with the other tasks
        } else {
          // For other files, log error and mark failure
          log(c.red.bold(`🛑 File ${file.path} does not exist`));
          streamFail = true;
          return null;
        }
      } else if (fs.statSync(file.path).size === 0) {
        // Check if the file is empty
        log(c.yellow.bold(`⚠️  File ${file.path} is empty, skipping...`));
        return null; // Skip empty files
      } else {
        log(c.green.bold(`✅ Bundle File ${file.path}`));
        return browserify({
          entries: [file.path],
        })
          .transform(babelify, { presets: ["@babel/preset-env"] })
          .transform(aliasify, aliasifyConfig)
          .bundle()
          .pipe($.plumber())
          .pipe(source(`${file.dest}/main.js`))
          .pipe(buffer())
          .pipe($.if(!isProd, $.sourcemaps.init()))
          .pipe($.if(isProd, $.uglify()))
          .pipe($.if(!isProd, $.sourcemaps.write("./maps")))
          .pipe(replace("@env@", isProd ? "production" : "development"))
          .pipe(replace("@buildVersion@", buildVersion))
          .pipe(replace("@imagePath@", imagePath))
          .pipe(replace("@assetPath@", assetPath))
          .pipe(replace("@language@", global.projLanguage ? global.projLanguage : ""))
          .pipe(replace("@proxyPath@", proxyPath))
          .pipe(replace("@projectName@", projectNameNormal))
          .pipe(replace("@projectNameCamel@", projectNameCamel))
          .pipe(replace("@currentBrand@", global.selectedBrand))
          .pipe(replace("@currentVariant@", global.selectedVariant))
          .pipe($.if(isProd, $.rename({ suffix: ".min" })))
          .pipe(dest(dist_js))
          .pipe(browserSync.stream());
      }
    })
    .filter((task) => task !== null); // Remove null values from tasks array

  if (streamFail) return; // Only fail if other non-critical files are missing or empty
  return es.merge
    .apply(null, tasks) // => thanks to https://fettblog.eu/gulp-browserify-multiple-bundles/
    .on("end", () => {
      done();
    });
};

const concatScripts = (done) => {
  if (!global.isRelease) return done();

  // Use allowEmpty: true to allow the task to continue even if files don't exist
  return src([path.join(dist_js, global.selectedVariant, "main.min.js"), path.join(dist_js, "main.min.js")], { allowEmpty: true })
    .pipe($.concat(`main__${release}.min.js`))
    .pipe(dest(path.join(dist_release, global.selectedVariant, release)));
};

const criticalJs = (done) => {
  if (!global.isRelease) return done();
  const criticalJsPath = path.join(src_folder, "js/critical.js");

  // Check if the critical.js file exists and is not empty
  if (!fs.existsSync(criticalJsPath) || fs.statSync(criticalJsPath).size === 0) {
    log(c.yellow.bold(`⚠️  File ${criticalJsPath} does not exist or is empty, skipping...`));
    return done(); // Skip if the file doesn't exist or is empty
  }
  const sources = [
    path.join(dist_release, global.selectedVariant, release, `index__${release}.html`),
    "./utils/script/open-critical.html",
    path.join(dist_js, "critical/*.js"),
    "./utils/script/close.html",
  ];
  return src(sources)
    .pipe(concat(`index__${release}.html`))
    .pipe(dest(path.join(dist_release, global.selectedVariant, release), { overwrite: true }));
};

module.exports = {
  script: series(lint, js),
  concatScripts,
  criticalJs,
};

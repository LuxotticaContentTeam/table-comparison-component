/**
 * Compile scss files into css.
 * Is variables is needed add it in the options
 */
const concat = require("gulp-concat");
let { src, dest, series } = require("gulp"),
  log = require("fancy-log"),
  c = require("ansi-colors"),
  fs = require("fs"),
  $ = require("gulp-load-plugins")({ pattern: ["gulp-*"] }), // Setting a global variable to include all glup- plugin
  browserSync = require("browser-sync").create(),
  sass = require("gulp-sass")(require("sass")),
  path = require("path"),
  { isProd, dist_css, src_asset_scss_main, src_asset_scss_variants, release, dist_release, conf, projectNameNormal } = require("./_config.js");

const scss = (done) => {
  log(`-> Style: compiling scss`);

  const variantMainScssPath = path.join(src_asset_scss_variants, global.selectedVariant, "main.scss");
  const criticalScssPath = path.join(conf.paths.srcFolder, "/scss/critical.scss");

  if (!fs.existsSync(variantMainScssPath)) {
    log(c.red.bold(`🛑 File ${variantMainScssPath} does not exist`));
    done();
    return;
  }

  // Compile main.scss
  const mainScss = src([src_asset_scss_main, variantMainScssPath])
    .pipe($.if(!isProd, $.sourcemaps.init()))
    .pipe($.plumber())
    .pipe($.dependents())
    .pipe($.debug())
    .pipe(
      $.sassVariables({
        $env: isProd ? "production" : "development",
        $brand: global.selectedBrand,
        $bannerName: "#ct_cm--" + projectNameNormal,
      })
    )
    .pipe(sass().on("error", sass.logError))
    .pipe($.if(!isProd, $.sourcemaps.write()))
    .pipe($.concat("main.css"))
    .pipe(dest(".tmp/css"));

  // Check if critical.scss exists before compiling
  if (fs.existsSync(criticalScssPath)) {
    log(c.green.bold(`✅ Found critical.scss, compiling...`));

    const criticalScss = src(criticalScssPath)
      .pipe($.if(!isProd, $.sourcemaps.init()))
      .pipe($.plumber())
      .pipe(sass().on("error", sass.logError))
      .pipe($.if(!isProd, $.sourcemaps.write()))
      .pipe(dest(".tmp/css")); // Output critical.css separately

    return Promise.all([mainScss, criticalScss]); // Run both tasks in parallel
  } else {
    log(c.yellow(`⚠️  critical.scss not found, skipping...`));
    return mainScss; // Only compile main.scss
  }
};

const postcss = () => {
  const f = $.filter([".tmp/css/*.css"], { restore: true });

  log(`-> Style: run post scss`);

  return src([".tmp/css/**/*.css"])
    .pipe(f)
    .pipe($.if(!isProd, $.sourcemaps.init({ loadMaps: true })))
    .pipe($.plumber())
    .pipe($.postcss([require("autoprefixer"), isProd ? require("cssnano")({ preset: "default" }) : false].filter(Boolean)))
    .pipe($.if(!isProd, $.sourcemaps.write()))
    .pipe(f.restore)
    .pipe($.if(isProd, $.rename({ suffix: ".min" })))
    .pipe($.size({ showFiles: true }))
    .pipe(dest(dist_css))
    .pipe(browserSync.stream());
};
const exportCss = (done) => {
  if (!global.isRelease) return done();
  return src(path.join(dist_css, "main.min.css"))
    .pipe($.if(isProd, $.rename({ basename: `main__${release}`, suffix: ".min" })))
    .pipe(dest(path.join(dist_release, global.selectedVariant, release)));
};

const criticalCss = (done) => {
  if (!global.isRelease) return done();
  const criticalCssPath = path.join(dist_css, "critical.min.css");
  if (!fs.existsSync(criticalCssPath) || fs.statSync(criticalCssPath).size === 0) {
    log(c.yellow.bold(`⚠️ Skipping critical CSS: File is missing or empty`));
    return done();
  }

  log(c.green.bold(`✅ Found critical.min.css, processing...`));
  const sources = [
    "./utils/style/open-critical.html",
    path.join(dist_css, "critical.min.css"),
    "./utils/style/close.html",
    path.join(dist_release, global.selectedVariant, release, `index__${release}.html`),
  ];
  return src(sources)
    .pipe(concat(`index__${release}.html`))
    .pipe(dest(path.join(dist_release, global.selectedVariant, release), { overwrite: true }));
};

module.exports = {
  style: series(scss, postcss),
  exportCss,
  criticalCss,
};

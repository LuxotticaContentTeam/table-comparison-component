/**
 * Pug compiler.
 * To set up a variable, add it on the `pugOps` object or insert in the pug file: `#{gulpFileGlobalVar}`
 * */
const concat = require("gulp-concat");
let { src, dest } = require("gulp"),
  $ = require("gulp-load-plugins")({ pattern: ["gulp-*"] }), // Setting a global variable to include all glup- plugin
  {
    src_asset_pug,
    temp_folder,
    isProd,
    dist_folder,
    projectName,
    dist_ghPages,
    dist_html,
    release,
    dist_release,
    dist_espot,
    src_folder,
    projectNameNormal,
    assetPath,
    buildVersion,
  } = require("./_config.js"),
  browserSync = require("browser-sync").create();
const pug = require("pug");
const views = function views(cb) {
  const includeFunc = (pathToPug, options = {}) => {
    return pug.renderFile(pathToPug, options); //render the pug file
  };

  const html = pug.renderFile(path.join(src_folder, "views/main", global.selectedVariant, "main.pug"), { include: includeFunc });

  let pugOps = {
    pretty: true,
    locals: {
      isProd: isProd,
      brand: global.selectedBrand,
      brands: conf.brands,
      brandHtml: html,
      lang: !isProd ? global.projLanguage.split("-")[0] : null,
      country: !isProd ? global.projLanguage : null,
      projectName: global.selectedVariant + " | " + conf.projectName,
      bannerName: projectNameNormal,
      crossoriginAttr: isProd ? "anonymous" : null, // Set dynamically
      brandExtend: global.selectedBrandExtendedName,
    },
  };

  return src(src_asset_pug).pipe($.pug(pugOps)).pipe(dest(dist_folder));
};

const exportViews = (done) => {
  if (!global.isRelease) return done();
  const source = [`./src/views/main/${global.selectedVariant}/live/live.html`, dist_html];
  return (
    src(source)
      .pipe(concat(`index__${release}.html`))
      // live.html carries @assetPath@ / @buildVersion@ rather than hand-written
      // values: the preview page's <script src> then follows package.json on
      // its own, instead of going stale at the next version bump.
      .pipe($.replace("@assetPath@", assetPath))
      .pipe($.replace("@buildVersion@", buildVersion))
      // .pipe($.if(isProd, $.rename({ basename: `index__${release}` })))
      .pipe(dest(path.join(dist_release, global.selectedVariant, release)))
  );
};
const exportEspot = (done) => {
  if (!global.isRelease) return done();

  return src(dist_espot).pipe(dest(path.join(dist_release, global.selectedVariant, release)));
};
module.exports = {
  views,
  exportViews,
  exportEspot,
};

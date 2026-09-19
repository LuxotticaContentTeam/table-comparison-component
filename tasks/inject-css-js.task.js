/**
 * Inject css or js in the html
 */

const { src, dest } = require("gulp");
($ = require("gulp-load-plugins")({ pattern: ["gulp-*"] })), // Setting a global variable to include all glup- plugin
  (browserSync = require("browser-sync").create()),
  (path = require("path"));

let { dist_folder, dist_js, dist_css, dist_html, dist_json } = require("./_config.js");

module.exports = function inject() {
  const sources = src(
    [
      path.join(dist_css, "**/*.css"),
      // The content json is no longer a script to inject — the bundle fetches
      // it at runtime (src/js/modules/bootstrap.js), in dev from dist/json/ too.
      path.join(dist_js, "critical/*.js"),
      path.join(dist_js, global.selectedBrand, "*.js"),
      path.join(dist_js, "**/*.js"),
    ],
    { read: false }
  );
  return src(dist_html)
    .pipe(
      $.inject(sources, {
        ignorePath: dist_folder,
        addRootSlash: false,
        addPrefix: "http://localhost:347",
      })
    )
    .pipe(dest(dist_folder))
    .pipe(browserSync.stream());
};

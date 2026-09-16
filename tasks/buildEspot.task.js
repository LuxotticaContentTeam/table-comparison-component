/**
 * Inject css or js in the html
 */
const concat = require("gulp-concat");
const { src, dest } = require("gulp");
($ = require("gulp-load-plugins")({ pattern: ["gulp-*"] })), // Setting a global variable to include all glup- plugin
  (streamSeries = require("stream-series")),
  (path = require("path"));

let { dist_folder, dist_js, dist_css, dist_html, dist_vendors, dist_release, dist_json } = require("./_config.js");

module.exports = function buildEspot() {
  const sources = [
    "./utils/style/open.html",
    path.join(dist_css, "**/*.min.css"),
    "./utils/style/close.html",
    path.join(dist_html),
    "./utils/script/open.html",
    path.join(dist_json, "**/*.js"),
    path.join(dist_js, "**/*.min.js"),
    "./utils/script/close.html",
  ];

  return src(sources).pipe(concat("espot.html")).pipe(dest(dist_folder));
};

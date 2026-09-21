/**
 * Build the CoreMedia fragment.
 *
 * The counterpart of buildEspot: where espot.html is self-contained (~70 KB,
 * everything inlined), this one is what goes into a CoreMedia row —
 *
 *   <style>  critical css only, the geometry that stops the page jumping
 *   <div>    the empty skeleton
 *   <script src="…">  one tag, pointing at the bundle on the asset host
 *
 * The bundle then pulls the real stylesheet and the content json
 * (src/js/modules/bootstrap.js). No <style> ends up in the middle of the body.
 */
const concat = require("gulp-concat");
const path = require("path");
const { src, dest } = require("gulp");
const replace = require("gulp-string-replace");

const { dist_folder, dist_css, dist_release, release, assetPath, buildVersion } = require("./_config.js");

const FRAGMENT = "fragment.html";

const buildFragment = () => {
  const sources = [
    "./utils/style/open.html",
    path.join(dist_css, "critical.min.css"),
    "./utils/style/close.html",
    // Explicitly index.html, not the dist_html glob: espot.html has already
    // been written to dist/ by the time this task runs and would be swept in.
    path.join(dist_folder, "index.html"),
    "./utils/script/external.html",
  ];

  return src(sources, { allowEmpty: true })
    .pipe(concat(FRAGMENT))
    .pipe(replace("@assetPath@", assetPath()))
    .pipe(replace("@buildVersion@", buildVersion))
    .pipe(dest(dist_folder));
};

const exportFragment = (done) => {
  if (!global.isRelease) return done();

  return src(path.join(dist_folder, FRAGMENT), { allowEmpty: true }).pipe(dest(path.join(dist_release, global.selectedVariant, release)));
};

module.exports = {
  buildFragment,
  exportFragment,
};

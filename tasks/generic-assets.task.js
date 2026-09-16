/**
 * Move generic assets to dist folder
 */

let { src, dest } = require("gulp"),
  { src_folder, src_generic_assets, dist_generic, dist_folder } = require("./_config.js"),
  browserSync = require("browser-sync").create();

module.exports = function genericAssets() {
  const dist_generic_assets = [];

  src_generic_assets.forEach((el) => {
    dist_generic_assets.push(el.replace(src_folder, dist_folder));
  });

  if (src_generic_assets.length > 0) {
    return src(src_generic_assets, {
      allowEmpty: true,
    })
      .pipe(dest(dist_generic))
      .pipe(browserSync.stream());
  }
};

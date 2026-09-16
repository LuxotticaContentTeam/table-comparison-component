/**
 * Move generic assets to dist folder
 */

const path = require("path");

let { src, dest } = require("gulp"),
  fs = require("fs"),
  c = require("ansi-colors"),
  {
    src_folder,
    src_generic_assets,
    src_generic_assets_brands,
    dist_generic,
    dist_folder,
    isPreview,
    dist_ghPages,
    dist_json,
    src_static_assets,
    dist_static_assets,
  } = require("./_config.js"),
  browserSync = require("browser-sync").create();

module.exports = function staticAsset(done) {
  return src(src_static_assets).pipe(dest(dist_static_assets));
};

/**
 * Move generic assets to dist folder
 *
 * Only the current brand's assets are copied. The task used to pipe
 * src/static/** through wholesale, which is harmless with one brand but means
 * every brand ships every other brand's images and fonts as soon as a second
 * variant exists — in production too, since nothing downstream filters them.
 */

const path = require("path");

let { src, dest } = require("gulp"),
  fs = require("fs"),
  { src_folder, src_static_assets, dist_static_assets, BRANDS } = require("./_config.js");

/**
 * Exclusion globs for the brand-named subfolders under static/ that do not
 * belong to the variant being built. Only folders named after a known brand
 * code are considered, so shared folders (fav/, ...) are always copied.
 * @returns {string[]}
 */
const otherBrandGlobs = () => {
  const currentBrand = global.selectedBrand;
  const brandCodes = Object.keys(BRANDS);
  const globs = [];

  ["images", "fonts"].forEach((kind) => {
    const dir = path.join(src_folder, "static", kind);
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && brandCodes.includes(entry.name) && entry.name !== currentBrand)
      .forEach((entry) => globs.push(`!${path.join(dir, entry.name, "**")}`));
  });

  return globs;
};

module.exports = function staticAsset(done) {
  return src([src_static_assets, ...otherBrandGlobs()]).pipe(dest(dist_static_assets));
};

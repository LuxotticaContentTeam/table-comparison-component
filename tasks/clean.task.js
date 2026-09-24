/**
 * Clean generated assets
 */

const del = require("del"),
  path = require("path"),
  log = require("fancy-log"),
  c = require("ansi-colors"),
  { dist_folder, dist_release, release } = require("./_config.js");

async function clean(cb) {
  await del(dist_folder);
  cb();
}

/**
 * Wipe the release folder this run is about to write.
 *
 * Scoped to release/<VARIANT>/<version> on purpose — never the whole release/
 * tree. Building several brands means running the build once per variant, and
 * release/ is the only place their output sits side by side, so wiping it all
 * would delete the sibling brands a previous run produced. Older versions of
 * the same brand are kept for the same reason: they are deliberate history.
 *
 * Without this, gulp's dest() overwrites file by file and anything not
 * regenerated survives — a renamed bundle, a file from a version that no longer
 * builds — and gets uploaded along with the real deliverables.
 */
async function cleanRelease(cb) {
  if (!global.isRelease) return cb();

  const target = path.join(dist_release, global.selectedVariant, release);
  await del(target);
  log(c.green.bold(`✅ Cleaned ${target} before writing this release`));
  cb();
}

module.exports = { clean, cleanRelease };

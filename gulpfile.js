const { projectLang } = require("./tasks/_config.js");
const log = require("fancy-log");
const { series } = require("gulp");

// Require custom tasks
const prompt = require("./tasks/prompt.task.js");
const { clean, cleanRelease } = require("./tasks/clean.task.js");
const { views, exportViews, exportEspot } = require("./tasks/views.task.js");
const genericAssets = require("./tasks/generic-assets.task.js");
const images = require("./tasks/images.task.js");
const vendors = require("./tasks/vendors.task.js");
const { style, exportCss, criticalCss } = require("./tasks/style.task.js");
const { script, criticalJs, concatScripts } = require("./tasks/script.task.js");
const bs = require("./tasks/browser-sync.task.js");
const inject = require("./tasks/inject-css-js.task.js");
const watcher = require("./tasks/watcher.task.js");
const { createJs, createScss, createJson, createViews, updateProjectConfig } = require("./tasks/createProject.js");
const promptNewProj = require("./tasks/promptNewProj.js");
const staticAsset = require("./tasks/staticAsset.task.js");
const buildEspot = require("./tasks/buildEspot.task.js");
const { buildFragment, exportFragment } = require("./tasks/buildFragment.task.js");
const { json, jsonBuild } = require("./tasks/json.task.js");
const recap = require("./tasks/recap.task.js");
const promptRemove = require("./tasks/promptRemove.task.js");
const { deleteVariant, updateProjectsConfigRemove } = require("./tasks/removeVariant.task.js");
const { checkBoilerJson } = require("./tasks/checkBoiler.task.js");
const { sprite } = require("./tasks/sprite.task.js");

exports.serve = series(
  // Run prompt to ask witch language
  checkBoilerJson,
  prompt,
  clean,
  views,
  genericAssets,
  staticAsset,
  vendors,
  images,
  style,
  json,
  script,
  inject,
  bs,
  recap,
  watcher
);

exports.build = series(
  // Run prompt to ask witch language
  checkBoilerJson,
  prompt,
  clean,
  cleanRelease,
  views,
  exportViews,
  json,
  jsonBuild,
  staticAsset,
  vendors,
  images,
  style,
  exportCss,
  criticalCss,
  script,
  concatScripts,
  criticalJs,
  buildEspot,
  exportEspot,
  buildFragment,
  exportFragment,
  recap
);

exports.removeProject = series(promptRemove, deleteVariant, updateProjectsConfigRemove);

exports.new = series(promptNewProj, updateProjectConfig, createJs, createScss, createJson, createViews);
exports.sprite = series(sprite);

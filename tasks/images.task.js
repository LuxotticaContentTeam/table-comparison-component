/**
  * Compress and move images to dist folder
*/

let 
    { src, dest } = require('gulp'),
    $ = require('gulp-load-plugins')({ pattern: ['gulp-*'] }), // Setting a global variable to include all glup- plugin
    { src_asset_img, dist_img } = require('./_config.js'),
    browserSync = require('browser-sync').create();

module.exports = function images() {
  return src(src_asset_img)
    .pipe($.plumber())
    .pipe($.imagemin({
      progressive: true,
      interlaced: true,
  
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}],
      verbose: true
    }))
    .pipe($.size({showFiles: true}))
    .pipe(dest(dist_img))
    .pipe(browserSync.stream());
}
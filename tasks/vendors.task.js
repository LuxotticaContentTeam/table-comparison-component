/**
 * Copy file from bower folder into the app vendor folder
*/

let 
    { src, dest } = require('gulp'),
    log = require('fancy-log'),
    $ = require('gulp-load-plugins')({ pattern: ['gulp-*'] }), // Setting a global variable to include all glup- plugin
    { dev, prod } = require('../vendor'),
    { dist_vendors, isProd } = require('./_config.js');

module.exports = function vendors(cb) {
    let jsFilter = $.filter('**/*.js', {
      restore: true
    });
    
    let cssFilter = $.filter('**/*.css', {
      restore: true
    });
    
    let vendorSource = isProd ? prod : dev;

    if(vendorSource.length == 0){
        log(`-> No vendors selected for ${isProd ? 'production' : 'development'} environment ...`);
        cb();
        return;
    }
    
    return src(vendorSource, {base: 'bower_components'})
        .pipe(jsFilter)
        .pipe($.concat('vendors.min.js'))
        .pipe($.uglify())
        .pipe(dest(dist_vendors))
        .pipe(jsFilter.restore)
        .pipe(cssFilter)
        .pipe($.concat('vendors.min.css'))
        .pipe(dest(dist_vendors))
        .pipe(cssFilter.restore);
}
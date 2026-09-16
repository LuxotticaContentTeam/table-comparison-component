let 
    { src, dest } = require('gulp'),
    path = require('path'),
    { temp_folder, dist_folder } = require('./_config.js'),
    i18n = require('gulp-html-i18n');


module.exports = function localize() {
    return src( path.join(temp_folder, '/index.html') )
        .pipe(i18n({
            langDir: './lang',
            trace: true,
            renderEngine: 'mustache'
        }))
        .pipe($.rename( path => {
            path.basename = path.basename.replace(/-/, '_')
        }))
        .pipe(dest(dist_folder));
}
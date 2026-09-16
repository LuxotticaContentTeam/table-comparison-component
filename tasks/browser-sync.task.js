/**
 * Init webserver
 */

const
    browserSync = require('browser-sync').create(),
    projectConfiguration = require('../projectConfig.json');
    log = require('fancy-log');

let
    { dist_folder } = require('./_config.js');

module.exports = function bs(cb){

    log(`-> open index.html page`)

    browserSync.init({
        server: {
            baseDir: dist_folder,
            index: `index.html`
        },
        watch: true,
        watchEvents: 'change',
        open: projectConfiguration.serveInNewTab,
        browser: "google chrome",
        port: 347, // => safe for RTR
        snippetOptions: {
            rule: {
                match: /<head[^>]*>/i,
                fn: function(snippet, match) {
                    return match + snippet;
                }
            }
        }
    });

    cb();
};
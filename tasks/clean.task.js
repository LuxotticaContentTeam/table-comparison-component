/**
 * Clean generated assets
 */

const 
    del = require('del'),
    log = require('fancy-log'),
    { dist_folder } = require('./_config.js');

module.exports = async function clean(cb) {
    await del(dist_folder);
    cb();
}
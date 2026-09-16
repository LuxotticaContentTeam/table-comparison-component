const { release } = require("./_config");

module.exports = function recap(done) {
  console.log("\n");
  console.table({
    "Current Language": global.projLanguage ? global.projLanguage : " - ",
    "Current Variant": global.selectedVariant,
    "Current Brand": global.selectedBrand,
    isRelease: global.isRelease ? true : " - ",
    "Release Version": global.isRelease ? release : " - ",
    "Selected Brand Extended Name": global.selectedBrandExtendedName ? global.selectedBrandExtendedName : " - ",
  });
  console.log("\n");
  done();
  return true;
};

const { src, dest } = require("gulp");

// GET OPTION DEFINED ON PACKAGE.JSON
const arg = ((argList) => {
  let arg = {},
    a,
    opt,
    thisOpt,
    curOpt;
  for (a = 0; a < argList.length; a++) {
    thisOpt = argList[a].trim();
    opt = thisOpt.replace(/^\-+/, "");

    if (opt === thisOpt) {
      // argument value
      if (curOpt) arg[curOpt] = opt;
      curOpt = null;
    } else {
      // argument name
      curOpt = opt;
      arg[curOpt] = true;
    }
  }

  return arg;
})(process.argv);

const svgSprite = require("gulp-svg-sprite"),
  config = {
    mode: {
      symbol: {
        // symbol mode to build the SVG
        render: {
          css: false, // CSS output option for icon sizing
          scss: false, // SCSS output option for icon sizing
        },
        dest: "./sprite", // destination folder
        prefix: ".svg--%s", // BEM-style prefix if styles rendered
        sprite: "sprite.svg", //generated sprite name
        example: true, // Build a sample page, please!
      },
    },
  };

const sprite = (done) => {
  src(`${arg.icons}/*.svg`)
    .pipe(svgSprite(config))
    .pipe(dest(`${arg.icons}`));
  done();
};

//BLOG
module.exports = {
  sprite,
};

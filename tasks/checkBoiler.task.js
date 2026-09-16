const { src, dest } = require("gulp");
const { conf } = require("./_config");
// get data from .env file
require("dotenv").config();
const pkg = require("../package.json");
const c = require("ansi-colors"),
  log = require("fancy-log");
const Table = require("cli-table3");

const checkBoilerJson = (done) => {
  if (!process.env.BOILERPLATE) {
    if (conf.projectName === "github-repo-name" || pkg.name === "dev-boilerplate-module" || pkg.version === "0.0.0") {
      console.log("\n");
      log(c.red.bold(`🛑 projectConfig.json or package.json have default values update them!`));
      const table = new Table({
        head: [c.bold.white("File"), c.bold.white("Current"), c.bold.white("Version")],

        colWidths: [20, 20, 20],
      });
      table.push(
        ["projectConfig.json", conf.projectName === "github-repo-name" ? c.red(conf.projectName) : c.green(conf.projectName), "N/A"],
        ["package.json", pkg.name === "dev-boilerplate-module" ? c.red(pkg.name) : c.green(pkg.name), pkg.version === "0.0.0" ? c.red(pkg.version) : c.green(pkg.version)]
      );
      console.log(table.toString());
      console.log("\n");
      throw new Error("Please update projectConfig.json or package.json");
    }
  }

  done();
};

//BLOG
module.exports = {
  checkBoilerJson,
};

const fs = require("fs");
const path = require("path");

async function run(exec, wsdir) {
  await exec('bit tag --persist', { cwd: wsdir });
  await exec('bit export', { cwd: wsdir });
}

module.exports = run;

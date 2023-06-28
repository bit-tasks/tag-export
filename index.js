const core = require("@actions/core");
const exec = require("@actions/exec").exec;
const run = require("./scripts/tag-export");

try {
  const wsDir = core.getInput("ws-dir") || process.env.WSDIR;
  run(exec, wsDir);
} catch (error) {
  core.setFailed(error.message);
}

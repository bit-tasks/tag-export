const core = require("@actions/core");
const exec = require("@actions/exec").exec;
const run = require("./scripts/tag-export");

try {
  const wsDir = core.getInput("ws-dir") || process.env.WSDIR;
  const stdExec = (command, cwd) => {
    return exec(command, [], cwd);
  };
  run(stdExec, wsDir);
} catch (error) {
  core.setFailed(error.message);
}

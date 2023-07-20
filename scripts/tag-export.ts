
import { exec } from "@actions/exec";

const run = async (wsdir: string) => {
  await exec('bit tag -m "CI"', [], { cwd: wsdir });
  await exec('bit export', [], { cwd: wsdir });
}

export default run;

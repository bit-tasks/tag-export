import * as core from "@actions/core";
import { exec } from "@actions/exec";
import run, { ExecFunction } from "./scripts/tag-export";

try {
  const wsDir: string = core.getInput("ws-dir") || process.env.WSDIR || "./";
  const stdExec: ExecFunction = (command: string, options?: {cwd: string}): Promise<number> => exec(command, [], options);
  run(stdExec, wsDir.replace(/^["']|["']$/g, ''));
} catch (error) {
  core.setFailed((error as Error).message);
}

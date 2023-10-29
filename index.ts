import * as core from "@actions/core";
import run from "./scripts/tag-export";

try {
  const wsDir: string = core.getInput("ws-dir") || process.env.WSDIR || "./";
  const persist: boolean =
  core.getInput("persist") === "true" ? true : false;
  run(wsDir, persist);
} catch (error) {
  core.setFailed((error as Error).message);
}

import * as core from "@actions/core";
import run from "./scripts/tag-export";

try {
  const githubToken = process.env.GITHUB_TOKEN;
  const wsDir: string = core.getInput("ws-dir") || process.env.WSDIR || "./";
  const persist: boolean = core.getInput("persist") === "true" ? true : false;
  const build: boolean = core.getInput("build") === "true" ? true : false;
  const increment: string = core.getInput("increment");
  const prereleaseId: string = core.getInput("prerelease-id");
  const incrementBy: number = parseInt(core.getInput("increment-by"));
  const strict: boolean = core.getInput("strict") === "true" ? true : false;

  if (!githubToken) {
    throw new Error("GitHub token not found");
  }

  run(githubToken, wsDir, persist, build, increment, prereleaseId, incrementBy, strict);
} catch (error) {
  core.setFailed((error as Error).message);
}

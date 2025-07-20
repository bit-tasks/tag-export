import { exec } from "@actions/exec";
import { context, getOctokit } from "@actions/github";
import * as core from "@actions/core";

const getLastMergedPullRequest = async (
  octokit: any,
  owner: string,
  repo: string
) => {
  const { data: pullRequests } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
  });

  const lastMergedPR = pullRequests.find((pr: any) => pr.merged_at !== null);
  return lastMergedPR
    ? {
      number: lastMergedPR.number,
      title: lastMergedPR.title,
      labels: lastMergedPR.labels,
    }
    : undefined;
};

function getVersionKeyword(
  text: string
): string | null {
  const keywords = ["patch", "major", "minor"];
  const preReleasePattern = /\[pre-release:(.+?)\]/;

  // Check for pre-release pattern and return formatted string
  const preReleaseMatch = preReleasePattern.exec(text);
  if (preReleaseMatch) {
    return `pre-release:${preReleaseMatch[1]}`; // Return in the format pre-release:<flag>
  }

  return (
    keywords.find(
      (keyword) => text.includes(`[${keyword}]`)
    ) || null
  );
}

function getVersionFromLabel(labels?: any[]): string | null {
  return (
    labels
      ?.map((label) => getVersionKeyword(label.name))
      .find((v) => v) || null
  );
}

function getVersionFromPRTitle(title?: string): string | null {
  return title ? getVersionKeyword(title) : null;
}

const run = async (githubToken: string, wsdir: string, persist: boolean, build: boolean, increment: string, prereleaseId: string, incrementBy: number, strict: boolean) => {
  const { repo, owner } = context?.repo;
  const octokit = getOctokit(githubToken);
  const lastMergedPR = await getLastMergedPullRequest(octokit, owner, repo);
  core.info("Pull Request Number: " + lastMergedPR?.number);
  core.info("Pull Request Total Label Count: " + lastMergedPR?.labels.length);

  const globalVersion =
    getVersionFromLabel(lastMergedPR?.labels) ||
    getVersionFromPRTitle(lastMergedPR?.title);

  const tagMessageText = lastMergedPR?.title;

  // Define global arguments for logging if applicable
  const globalArgs: string[] = [];
  if (process.env.LOG) {
    globalArgs.push(`--log=${process.env.LOG}`);
  }

  // Build the tag command
  const mergeArgs = ["ci", "merge", "-m", `"${tagMessageText}"`, ...globalArgs];

  if (build) {
    mergeArgs.push("--build");
  }

  if (incrementBy) {
    mergeArgs.push(`--increment-by`, incrementBy.toString());
  }

  if (strict) {
    mergeArgs.push("--strict");
  }

  if (globalVersion) {
    if (globalVersion.startsWith("pre-release:")) {
      const preReleaseFlag = globalVersion.split(":")[1]; // Extract flag after 'pre-release:'
      mergeArgs.push("--prerelease-id", preReleaseFlag);
    } else {
      mergeArgs.push(`--${globalVersion}`); // e.g. --major / --minor / --patch
    }
  } else {
    if (increment) {
      mergeArgs.push(`--increment`, increment);
    }

    if (prereleaseId) {
      mergeArgs.push(`--prerelease-id`, prereleaseId);
    }
  }

  if (persist) {
    mergeArgs.push("--persist");
  }

  await exec("bit", mergeArgs, {
    cwd: wsdir,
    env: {
      ...process.env,
      BIT_DISABLE_SPINNER: "false",
    },
  });

};

export default run;

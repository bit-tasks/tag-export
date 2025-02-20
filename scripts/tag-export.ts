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
  text: string,
  fullMatch: boolean = false
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
      (keyword) =>
        (fullMatch && text === keyword) || text.includes(`[${keyword}]`)
    ) || null
  );
}

function getVersionFromLabel(labels?: any[]): string | null {
  return (
    labels
      ?.map((label) => getVersionKeyword(label.name, true))
      .find((v) => v) || null
  );
}

function getVersionFromPRTitle(title?: string): string | null {
  return title ? getVersionKeyword(title) : null;
}

/**
 * @description Return an array of "componentId@<version>" without extra quotes.
 */
function getOverridenVersions(labels?: any[]): string[] {
  if (!labels) return [];
  const versionPattern = /@(major|minor|patch)$/;

  return labels
    .filter((label: { name: string }) => versionPattern.test(label.name))
    .map((label: { name: string; description: string }) => {
      const version = label.name.split("@").pop(); // get major / minor / patch
      return `${label.description}@${version}`; // No extra quotes here
    });
}

const run = async (githubToken: string, wsdir: string, persist: boolean) => {
const { repo, owner } = context?.repo;
  const octokit = getOctokit(githubToken);
  const lastMergedPR = await getLastMergedPullRequest(octokit, owner, repo);
  core.info("Pull Request Number: " + lastMergedPR?.number);
  core.info("Pull Request Total Label Count: " + lastMergedPR?.labels.length);
  
  const version =
    getVersionFromLabel(lastMergedPR?.labels) ||
    getVersionFromPRTitle(lastMergedPR?.title);

  const tagMessageText = lastMergedPR?.title;

  // Define global arguments for logging if applicable
  const globalArgs: string[] = [];
  if (process.env.LOG) {
    globalArgs.push(`--log=${process.env.LOG}`);
  }

  // Build the tag command
  const tagArgs = ["tag", "-m", `"${tagMessageText}"`, ...globalArgs];

  if (process.env.RIPPLE !== "true") {
    tagArgs.push("--build");
  }

  if (version) {
    if (version.startsWith("pre-release:")) {
      const preReleaseFlag = version.split(":")[1]; // Extract flag after 'pre-release:'
      tagArgs.push("--pre-release", preReleaseFlag);
    } else {
      tagArgs.push(`--${version}`); // e.g. --major / --minor / --patch
    }
  }

  if (persist) {
    tagArgs.push("--persist");
  }

  // Get overridden versions as an array
  const overridenComponentVersions = getOverridenVersions(lastMergedPR?.labels);
  core.info("Overriden labels: " + overridenComponentVersions.join(", "));

  // Spread them into the command so each is its own argument
  if (overridenComponentVersions.length > 0) {
    tagArgs.push(...overridenComponentVersions);
  }

  core.info(`command: executing bit ${tagArgs.join(" ")}`);
  await exec("bit", tagArgs, { cwd: wsdir });

  // Export command (reuse globalArgs)
  const exportArgs = ["export", ...globalArgs];
  core.info(`command: executing bit ${exportArgs.join(" ")}`);
  await exec("bit", exportArgs, { cwd: wsdir });

};

export default run;

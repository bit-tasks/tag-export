import { exec } from "@actions/exec";
import * as core from "@actions/core";
import * as github from "@actions/github";

function getVersionFromText(message: string): {
  [key: string]: string | undefined;
} {
  const match =
    /\[version:(?<major>\d+)?\.(?<minor>\d+)?\.(?<patch>\d+)?\]/.exec(message);
  if (!match || !match.groups) {
    return {};
  }

  return {
    major: match.groups.major,
    minor: match.groups.minor,
    patch: match.groups.patch,
  };
}
async function fetchVersionFromLatestCommitPR(): Promise<{
  major?: string;
  minor?: string;
  patch?: string;
}> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GitHub token not found");
  }
  const octokit = github.getOctokit(githubToken);
  const { repo, sha } = github.context.payload;

  if (!repo || !sha) {
    console.log("Repo information or commit SHA is not available.");
    return {};
  }

  // Fetch the commit to get its message
  const { data: commit } = await octokit.rest.git.getCommit({
    owner: repo.owner.login,
    repo: repo.name,
    commit_sha: sha,
  });

  // Extract the PR number from the commit message
  const prNumberMatch = /Merge pull request #(\d+)/.exec(commit.message);
  if (prNumberMatch) {
    const prNumber = prNumberMatch[1];

    // Fetch labels of the PR using the extracted number
    const {
      data: { labels },
    } = await octokit.rest.pulls.get({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: parseInt(prNumber, 10),
    });

    for (const labelObj of labels) {
      const versionData = getVersionFromText(labelObj.name);
      if (versionData.major || versionData.minor || versionData.patch) {
        return versionData; // Return the first version label found
      }
    }
  }

  // Fallback: Check the commit message if no valid version label was found
  const commitVersionData = getVersionFromText(commit.message);
  if (
    commitVersionData.major ||
    commitVersionData.minor ||
    commitVersionData.patch
  ) {
    return commitVersionData; // Return version data from commit message
  }

  return {}; // No version info found in both PR labels and commit message
}

const run = async (wsdir: string) => {
  const versionData = await fetchVersionFromLatestCommitPR();

  let command = 'bit tag -m "CI"';

  // Append version details if they exist
  if (versionData.major) {
    command += ` --major v${versionData.major}`;
  }
  if (versionData.minor) {
    command += ` --minor v${versionData.minor}`;
  }
  if (versionData.patch) {
    command += ` --patch v${versionData.patch}`;
  }

  await exec(command, [], { cwd: wsdir });
  await exec("bit export", [], { cwd: wsdir });
};

export default run;

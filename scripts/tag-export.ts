import { exec } from "@actions/exec";
import { context, getOctokit } from "@actions/github";
import * as core from "@actions/core";

const createTagMessageText = async (
  githubToken: string
) => {
  const { repo, owner } = context?.repo;
  const octokit = getOctokit(githubToken);

  let messageText = "CI";

  const { data: pullRequests } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "closed", // Include closed pull requests
    sort: "updated", // Sort by update time
    direction: "desc", // Sort in descending order (newest first)
  });

  const lastMergedPullRequest = pullRequests.find(
    (pr) => pr.merged_at !== null
  );

  const prTitle = lastMergedPullRequest?.title;
  const prNumber = lastMergedPullRequest?.number;

  core.info("PR title: " + prTitle);
  core.info("PR number: " + prNumber);

  if (prTitle) {
    messageText = prTitle;
  } else if (prNumber) {
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner: owner,
      repo: repo,
      pull_number: prNumber,
    });

    if (commits.length > 0) {
      messageText = commits[commits.length - 1].commit.message;
      core.info("Last commit message: " + messageText);
    }
  }

  core.info("Tag message Text: " + messageText);
  return messageText;
};

function getVersionKeyword(
  text: string,
  fullMatch: boolean = false
): string | null {
  const keywords = ["patch", "major", "minor", "pre-release"];

  return (
    keywords.find(
      (keyword) =>
        (fullMatch && text === keyword) || text.includes(`[${keyword}]`)
    ) || null
  );
}

async function fetchVersionFromLatestCommitPR(): Promise<{ prDetails?: any, commitMessage?: string }> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GitHub token not found");
  }
  const octokit = getOctokit(githubToken);

  const { repo, ref } = context;
  const branch = ref.replace("refs/heads/", "");

  const { data: commit } = await octokit.rest.repos.getCommit({
    owner: repo.owner,
    repo: repo.repo,
    ref: branch,
  });

  const commitMessage = commit?.commit?.message;
  core.info("Commit Message: " + commitMessage);

  if (!repo || !commitMessage) {
    core.info("Repo information or commit message is not available.");
    return { commitMessage };
  }

  const prNumberMatch = /Merge pull request #(\d+)/.exec(commitMessage);
  if (prNumberMatch) {
    const prNumber = prNumberMatch[1];
    core.info("PR Number: " + prNumber);
    const {
      data: { title, labels },
    } = await octokit.rest.pulls.get({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: parseInt(prNumber, 10),
    });

    return { prDetails: { title, labels }, commitMessage };
  }

  return { commitMessage };
}

function getVersionFromLabel(labels?: any[]): string | null {
  return labels?.map(label => getVersionKeyword(label.name, true)).find(v => v) || null;
}

function getVersionFromPRTitle(title?: string): string | null {
  return title ? getVersionKeyword(title) : null;
}

function getVersionFromCommitTitle(message?: string): string | null {
  return message ? getVersionKeyword(message) : null;
}

const run = async (
  githubToken: string,
  wsdir: string,
  persist: boolean
) => {
  const { prDetails, commitMessage } = await fetchVersionFromLatestCommitPR();
  const version = 
    getVersionFromLabel(prDetails?.labels) || 
    getVersionFromPRTitle(prDetails?.title) || 
    getVersionFromCommitTitle(commitMessage);

  const tagMessageText = await createTagMessageText(githubToken);

  // Define global arguments for logging if applicable
  const globalArgs = [];
  if (process.env.LOG) {
    globalArgs.push(`--log=${process.env.LOG}`);
  }

  // Build the tag command with global arguments and specific options
  const tagArgs = ['tag', '-m', `"${tagMessageText}"`, ...globalArgs];
  
  if (process.env.RIPPLE !== "true") {
    tagArgs.push('--build');
  }

  if (version) {
    tagArgs.push(`--${version}`); // Ensure version is prefixed with '--'
  }

  if (persist) {
    tagArgs.push('--persist');
  }

  core.info(`command: executing bit ${tagArgs.join(' ')}`);
  await exec('bit', tagArgs, { cwd: wsdir });

  // Use the same global arguments for the export command
  const exportArgs = ['export', ...globalArgs];

  core.info(`command: executing bit ${exportArgs.join(' ')}`);
  await exec('bit', exportArgs, { cwd: wsdir });
};

export default run;

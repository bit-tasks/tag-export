import { exec } from "@actions/exec";
import { context, getOctokit } from "@actions/github";
import * as core from "@actions/core";

const getLastMergedPullRequest = async (octokit: any, owner: string, repo: string) => {
  const { data: pullRequests } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
  });

  const lastMergedPR = pullRequests.find((pr: any) => pr.merged_at !== null);
  return lastMergedPR ? {
    number: lastMergedPR.number,
    title: lastMergedPR.title,
    labels: lastMergedPR.labels
  } : undefined;
};

const createTagMessageText = async (
  prTitle?: string,
  commits?: any[]
) => {
  let messageText = "CI";
  core.info("PR title: " + prTitle);

  if (prTitle) {
    messageText = prTitle;
  } else if (commits?.length) {
    messageText = commits[commits.length - 1].commit.message;
    core.info("Last commit message: " + messageText);
  }

  core.info("Tag message Text: " + messageText);
  return messageText;
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

function getOverridenVersions(labels?: any[]): string {
  if (!labels) return '';
  
  const versionPattern = /@(major|minor|patch|auto)$/;
  
  return labels
    .filter(label => versionPattern.test(label.name)) // Filter labels matching the version pattern
    .map(label => {
      if (label.name.endsWith('@auto')) {
        return `"${label.description}"`; // Return only the componentId from description
      } else {
        const version = label.name.split('@').pop(); // Get the version part (major, minor, patch)
        return `"${label.description}@${version}"`; // Return componentId@<version>
      }
    })
    .join(' '); // Join the results with spaces
}

async function removeVersionLabels(prDetails: any, prNumber: number, githubToken: string) {
  if (!prDetails?.labels) return;
  
  const octokit = getOctokit(githubToken);
  const versionPattern = /@(major|minor|patch|auto)$/;
  
  const labelsToRemove = prDetails.labels
    .filter((label: { name: string }) => versionPattern.test(label.name))
    .map((label: { name: string }) => label.name);

  if (labelsToRemove.length > 0) {
    for (const label of labelsToRemove) {
      await octokit.rest.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        name: label
      });
    }
  }
}

const getCommits = async (octokit: any, owner: string, repo: string, pullNumber: number) => {
  const { data: commits } = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: pullNumber
  });
  return commits;
};

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

  const { repo, owner } = context?.repo;
  const octokit = getOctokit(githubToken);
  const lastMergedPR = await getLastMergedPullRequest(octokit, owner, repo);

  const commits = lastMergedPR?.number 
    ? await getCommits(octokit, owner, repo, lastMergedPR.number)
    : undefined;
  const tagMessageText = await createTagMessageText(lastMergedPR?.title, commits);

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
    if (version.startsWith("pre-release:")) {
      const preReleaseFlag = version.split(":")[1]; // Extract the flag after 'pre-release:'
      tagArgs.push('--pre-release', preReleaseFlag); // Append pre-release flag
    } else {
      tagArgs.push(`--${version}`); // Ensure version is prefixed with '--'
    }
  }

  if (persist) {
    tagArgs.push('--persist');
  }

  const overridenComponentVersions = getOverridenVersions(prDetails?.labels);
  core.info('Overriden labels: ' + overridenComponentVersions);

  if (overridenComponentVersions) {
    tagArgs.push(overridenComponentVersions);
  }

  core.info(`command: executing bit ${tagArgs.join(' ')}`);
  await exec('bit', tagArgs, { cwd: wsdir });

  // Use the same global arguments for the export command
  const exportArgs = ['export', ...globalArgs];

  core.info(`command: executing bit ${exportArgs.join(' ')}`);
  await exec('bit', exportArgs, { cwd: wsdir });

  if (lastMergedPR?.labels && lastMergedPR.number) {
    await removeVersionLabels(
      { labels: lastMergedPR.labels },
      lastMergedPR.number,
      githubToken
    );
  }
};

export default run;

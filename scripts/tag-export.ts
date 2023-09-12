import { exec } from "@actions/exec";
import * as github from "@actions/github";
import * as core from "@actions/core";

function getVersionKeyword(text: string, fullMatch: boolean = false): string | null {
  const keywords = ["patch", "major", "minor", "pre-release"];

  return (
    keywords.find(
      (keyword) =>
        (fullMatch && text === keyword) ||
        text.includes(`[${keyword}]`)
    ) || null
  );
}

async function fetchVersionFromLatestCommitPR(): Promise<string | null> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GitHub token not found");
  }
  const octokit = github.getOctokit(githubToken);

  const { repo, ref } = github.context;
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
    return null;
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

    // 1. Check PR Labels
    const labelVersion = labels
      .map((label) => getVersionKeyword(label.name, true))
      .find((v) => v);
    if (labelVersion) {
      return labelVersion;
    }

    // 2. Fallback to PR title
    const prTitleVersion = getVersionKeyword(title);
    if (prTitleVersion) {
      return prTitleVersion;
    }
  }

  // 3. Last Fallback: Check the commit message
  return getVersionKeyword(commitMessage);
}

const run = async (wsdir: string) => {
  const version = await fetchVersionFromLatestCommitPR();
  let command = 'bit tag -m "CI" --build';

  if (version) {
    command += ` --${version}`;
  }

  await exec(command, [], { cwd: wsdir });
  await exec("bit export", [], { cwd: wsdir });
};

export default run;

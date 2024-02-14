import { exec } from '@actions/exec'
import { context, getOctokit } from '@actions/github'
import * as core from '@actions/core'

/**
 *
 */ const createTagMessageText = async (
  githubToken: string
): Promise<string> => {
  const { repo, owner } = context.repo
  const octokit = getOctokit(githubToken)

  let messageText = 'CI'

  const { data: pullRequests } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'closed', // Include closed pull requests
    sort: 'updated', // Sort by update time
    direction: 'desc' // Sort in descending order (newest first)
  })

  const lastMergedPullRequest = pullRequests.find(pr => pr.merged_at !== null)

  const prTitle = lastMergedPullRequest?.title
  const prNumber = lastMergedPullRequest?.number

  core.info(`PR title: ${prTitle}`)
  core.info(`PR number: ${prNumber}`)

  if (prTitle) {
    messageText = prTitle
  } else if (prNumber) {
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber
    })

    if (commits.length > 0) {
      messageText = commits[commits.length - 1].commit.message
      core.info(`Last commit message: ${messageText}`)
    }
  }

  core.info(`Tag message Text: ${messageText}`)
  return messageText
}
/**
 * Returns the version keyword found in the given text. If the fullMatch parameter is true, it only returns the keyword if it is an exact match. Otherwise, it returns the keyword if it is found within square brackets in the text. Returns null if no keyword is found.
 * @author Jonathan Stevens (@TGTGamer)
 *
 * @param text function to get the version keyword from a given text
 * @param [fullMatch=false]
 * @returns This function takes in a string and a boolean flag, and returns a string or null. It searches for keywords in the input string and returns the matching keyword if found, otherwise null. The search can be performed in two different ways: if the 'fullMatch' flag is true, it checks for an exact match between the input string and the keywords; otherwise, it checks if the input string includes a specific keyword enclosed in square brackets.
 */

function getVersionKeyword(text: string, fullMatch = false): string | null {
  const keywords = ['patch', 'major', 'minor', 'pre-release']

  return (
    keywords.find(
      keyword =>
        (fullMatch && text === keyword) || text.includes(`[${keyword}]`)
    ) || null
  )
}

/**
 * This function fetches the version from the latest commit in a pull request. It uses the GitHub token stored in the environment variable 'GITHUB_TOKEN' to authenticate with the GitHub API. It retrieves the commit message from the latest commit in the pull request and checks for version information in the pull request labels, title, and commit message. If a version is found, it is returned as a string. If no version is found or if any necessary information is missing, null is returned.
 * @author Jonathan Stevens (@TGTGamer)
 *
 * @async
 * @returns This function fetches the version number from the latest commit of a pull request. It requires the 'GITHUB_TOKEN' environment variable to be set. It returns the version number as a string, or null if the version number is not found.
 */
/**
 * Fetches the version from the latest commit in a pull request. Returns the version as a string or null if no version is found.
 * @author Jonathan Stevens (@TGTGamer)
 *
 * @async
 * @returns This function fetches the version number from the latest commit in a pull request. It first checks the labels of the pull request, then the title, and finally the commit message to find the version number. If no version number is found, it returns null.
 */
async function fetchVersionFromLatestCommitPR(): Promise<string | null> {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) {
    throw new Error('GitHub token not found')
  }
  const octokit = getOctokit(githubToken)

  const { repo, ref } = context
  const branch = ref.replace('refs/heads/', '')

  const { data: commit } = await octokit.rest.repos.getCommit({
    owner: repo.owner,
    repo: repo.repo,
    ref: branch
  })

  const commitMessage = commit?.commit?.message
  core.info(`Commit Message: ${commitMessage}`)

  if (!repo || !commitMessage) {
    core.info('Repo information or commit message is not available.')
    return null
  }

  const prNumberMatch = /Merge pull request #(\d+)/.exec(commitMessage)
  if (prNumberMatch) {
    const prNumber = prNumberMatch[1]
    core.info(`PR Number: ${prNumber}`)
    const {
      data: { title, labels }
    } = await octokit.rest.pulls.get({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: parseInt(prNumber, 10)
    })

    // 1. Check PR Labels
    const labelVersion = labels
      .map(label => getVersionKeyword(label.name, true))
      .find(v => v)
    if (labelVersion) {
      return labelVersion
    }

    // 2. Fallback to PR title
    const prTitleVersion = getVersionKeyword(title)
    if (prTitleVersion) {
      return prTitleVersion
    }
  }

  // 3. Last Fallback: Check the commit message
  return getVersionKeyword(commitMessage)
}

/**
 */
const run = async (
  githubToken: string,
  wsdir: string,
  persist: boolean
): Promise<void> => {
  const version = await fetchVersionFromLatestCommitPR()

  const tagMessageText = await createTagMessageText(githubToken)

  let command = `bit tag -m "${tagMessageText}" --build`

  if (version) {
    command += ` --${version}`
  }

  if (persist) {
    command += ` --persist`
  }

  await exec(command, [], { cwd: wsdir })
  await exec('bit export', [], { cwd: wsdir })
}

export default run

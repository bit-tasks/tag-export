import * as core from '@actions/core'
import run from './scripts/tag-export'

try {
  const githubToken = process.env.GITHUB_TOKEN
  const wsDir: string = process.env.WSDIR!
  const persist: boolean = core.getInput('persist') === 'true' ? true : false

  if (!githubToken) {
    throw new Error('GitHub token not found')
  }

  run(githubToken, wsDir, persist)
} catch (error) {
  core.setFailed((error as Error).message)
}

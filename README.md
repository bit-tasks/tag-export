# Bit Tag and Export for CI/CD Pipelines
Big Tag and Export to Remote Scope

# GitHub Actions

This task executes `bit tag -m "CI" && bit export` inside the workspace directory.

## Inputs

### `ws-dir`

**Optional** The workspace directory path from the root. Default `"Dir specified in Init Task or ./"`.

## Tag version

Specify the version tag for your components using the following methods. You can use any of these version keywords: `major`, `minor`, `patch`, and `pre-release`. 

- **Pull Request Labels:** Use the keyword directly as a label `major` or enclosed within square brackets `[major]`.
- **Pull Request or Commit Title:** Include the version keyword enclosed within square brackets `[major]` within your title text.

**Note:** Once a Pull Request is merged, it's tracked via its `merge commit` in the target branch. Therefore, the `merge commit` should be the last in the commit history for the action to read the version keyword from the Pull Request.

### Git Commit

**Title:** Incorporate the version keyword in the title of your Git commit message.

**Note:** The version based on the latest commit title.

## Example usage

**Note:** Use `bit-task/init@v1` as a prior step in your action before running `bit-tasks/tag-export@v1`.

```yaml
name: Test Bit Tag and Export
on:
  workflow_dispatch:
jobs:
  release:
    runs-on: ubuntu-latest
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      GIT_USER_NAME: ${{ secrets.GIT_USER_NAME }}
      GIT_USER_EMAIL: ${{ secrets.GIT_USER_EMAIL }}
      BIT_CLOUD_ACCESS_TOKEN: ${{ secrets.BIT_CLOUD_ACCESS_TOKEN }} # Either BIT_CLOUD_ACCESS_TOKEN or BIT_CONFIG_USER_TOKEN is needed. Not both.
      BIT_CONFIG_USER_TOKEN: ${{ secrets.BIT_CONFIG_USER_TOKEN }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Initialize Bit
        uses: bit-tasks/init@v1
        with:
          ws-dir: '<WORKSPACE_DIR_PATH>'
      - name: Bit Tag and Export
        uses: bit-tasks/tag-export@v1
```

# Contributor Guide

Steps to create custom tasks in different CI/CD platforms.

## GitHub Actions

Go to the GithHub action task directory and build using NCC compiler. For example;

```
npm install
npm run build
git commit -m "Update task"
git tag -a -m "action release" v1 --force
git push --follow-tags
```

For more information, refer to [Create a javascript action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action)

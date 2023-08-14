# Bit Tag and Export for CI/CD Pipelines
Persist Bit Soft Tags and Export to Remote Scope

# GitHub Actions

This task executes `bit tag -m "CI" && bit export` inside the workspace directory.

## Inputs

### `ws-dir`

**Optional** The workspace directory path from the root. Default `"Dir specified in Init Task or ./"`.

## Tag version

There are three methods to specify the version tag for your components, prioritized in the order listed below:

1. **Pull Request Label:** Attach a label containing the desired version keyword to your Pull Request.
2. **Pull Request Title:** Include the version keyword directly within the Pull Request's title.
3. **Git Commit Title:** Specify the version within the title of the Git commit message.

Accepted version keywords are: `major`, `minor`, `patch`, and `pre-release`.

These can be presented either surrounded by spaces (e.g., `major`) or enclosed in square brackets (e.g., `[major]`).

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

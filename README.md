# Bit Tag and Export for CI/CD Pipelines
Big Tag and Export to Remote Scope

# GitHub Actions

This task executes `bit tag -m "CI" && bit export` inside the workspace directory.

## Inputs

### `ws-dir`

**Optional** The workspace directory path from the root. Default `"Dir specified in Init Task or ./"`.

### `persist`

**Optional** Persist soft tagged components by adding `--persist` flag.

## Tag version

Specify the version tag for your components using the following methods. You can use any of these version keywords: `major`, `minor`, `patch`, and `pre-release`. 

**Priority Order:**
1. Component version labels added/modified by the pull-request task (when `version-label: true` is set)
2. Pull Request Labels
3. Pull Request or Commit Title
4. Default to `patch` version

When using with `bit-tasks/pull-request@v2` and `bit-tasks/tag-export@v2`, component-specific version labels (e.g., `org.scope/component@minor`) take precedence over general PR labels or commit messages. These labels can be:
- Auto-generated as `component-id@auto`
- Manually modified to force specific versions: `@patch`, `@minor`, or `@major`

**Note:** Component version labels support requires both `bit-tasks/pull-request@v2` and `bit-tasks/tag-export@v2` or higher versions.

### Git Commit

**Title:** Incorporate the version keyword in the title of your Git commit message.

**Note:** The version based on the latest commit title.

## Example usage

**Note:** Use `bit-task/init@v2` as a prior step in your action before running `bit-tasks/tag-export@v2`.

```yaml
name: Test Bit Tag and Export
on:
  pull_request:
    branches: 
      - main
    types: [closed]
jobs:
  release:
    runs-on: ubuntu-latest
    if: ${{ github.event.pull_request.merged }}
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      GIT_USER_NAME: ${{ secrets.GIT_USER_NAME }}
      GIT_USER_EMAIL: ${{ secrets.GIT_USER_EMAIL }}
      BIT_CONFIG_ACCESS_TOKEN: ${{ secrets.BIT_CONFIG_ACCESS_TOKEN }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Initialize Bit
        uses: bit-tasks/init@v1
        with:
          ws-dir: '<WORKSPACE_DIR_PATH>'
      - name: Bit Tag and Export
        uses: bit-tasks/tag-export@v2
        with:
          persist: 'false' # Set to 'true' if you use the soft tag flow
```

# Contributor Guide

Steps to create custom tasks in different CI/CD platforms.

## GitHub Actions

Go to the GithHub action task directory and build using NCC compiler. For example;

```
npm install
npm run build
git commit -m "Update task"
git tag -a -m "action release" v2 --force
git push --follow-tags
```

For more information, refer to [Create a javascript action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action)

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

Specify the version tag for your components using the following methods. You can use any of these version keywords: `major`, `minor`, `patch`, and `pre-release`. Component version labels support requires both `bit-tasks/pull-request@v2` and `bit-tasks/tag-export@v2` or higher versions.

**Priority Order:**
1. Component version labels added or modified by the pull-request task (when `version-labels: true` is set).
2. Global version labels `[major]`, `[minor]` and `[patch]` can be added to the Pull Request. **Optional:** You can also add these labels to the Pull Request title e.g "Update about component `[manoj]`.
4. Defaults to `patch` version.

### Global Version Overrides

You can create global version labels by adding the label directly enclosed within square brackets (e.g., `[major]`). Supported global version keywords are: `[major]`, `[minor]`, `[patch]`, and `pre-release:<flag>` (e.g., `pre-release:beta`).

**Note:** The component labels are created at the repository level, allowing you to manually add them to the Pull Request if needed to override specific component versions. If you are creating any component label manually, ensure that both the component version (`component-name@<version>`) and the complete component ID (`org.scope/<component-id>`, e.g., `bit-tasks.test-scope/ui/hello-world`) are added as the `name` and `description` of the Pull Request label.

### Pre-release Tag
 You can specify a pre-release version by using the format `pre-release:<flag>` in your commit message or pull request title.

**Note:** The version is based on the latest commit title.

## Example usage

**Note:** Use `bit-task/init@v2` as a prior step in your action before running `bit-tasks/tag-export@v2`.

```yaml
name: Test Bit Tag and Export
on:
  pull_request:
    branches: 
      - main
    types: [closed]
permissions:
  pull-requests: write  # Ensure write permission for pull requests
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

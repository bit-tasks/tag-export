# Bit Tag and Export for CI/CD Pipelines
Big Tag and Export to Remote Scope

# GitHub Actions

This task executes `bit tag -m "CI" && bit export` inside the workspace directory.

## Inputs

### `ws-dir`

**Optional** The workspace directory path from the root. Default `"Dir specified in Init Task or ./"`.

### `persist`

**Optional** Persist soft tagged components by adding `--persist` flag.

### `build`

**Optional** Build the components before tagging.

### `strict`

**Optional** Enable strict mode for tagging.

### `increment`

**Optional** Type of increment for versioning. Available options:
- `major` - Major version increment
- `premajor` - Pre-major version increment
- `minor` - Minor version increment
- `preminor` - Pre-minor version increment
- `patch` - Patch version increment (default)
- `prepatch` - Pre-patch version increment
- `prerelease` - Pre-release version increment

### `prerelease-id`

**Optional** Pre-release identifier (e.g., "alpha", "beta", "rc").

### `increment-by`

**Optional** Increment by a specific number.

## Tag version

This task executes `bit ci merge` to tag and export components. The versioning logic is based on the **last merged pull request** in the repository.

### Version Detection Priority

The task detects version keywords in the following order:

1. **Pull Request Labels** - Version labels on the last merged PR
2. **Pull Request Title** - Version keywords in the PR title
3. **Input Parameters** - Fallback to the `increment` and `prerelease-id` inputs

### Supported Version Keywords

You can specify version keywords using square brackets in either PR labels or PR title:

- `[major]` - Major version increment
- `[minor]` - Minor version increment  
- `[patch]` - Patch version increment (default)
- `[pre-release:<flag>]` - Pre-release version with custom identifier (e.g., `[pre-release:beta]`, `[pre-release:alpha]`)

### Examples

**Pull Request Labels:**
- Add a label named `[major]` to trigger a major version bump
- Add a label named `[pre-release:rc]` to create a release candidate

**Pull Request Title:**
- "Update component with breaking changes [major]"
- "Add new feature [minor]"
- "Fix bug [patch]"
- "Release candidate [pre-release:beta]"

### Fallback Behavior

If no version keywords are detected in the last merged PR, the task will use the input parameters:
- `increment` parameter (e.g., `major`, `minor`, `patch`)
- `prerelease-id` parameter for pre-release versions

**Note:** The task processes the last merged pull request, not the current one. Make sure to add version keywords to the PR that will be merged before this task runs.

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

# Hotfix Support — Migration Guide for Existing React EKS Repos (GitHub Actions)

> **Audience:** Developers / Ops migrating an existing React EKS repo to support hotfix deployments via GitHub Actions.
>
> **Scope:** This guide covers the changes needed to enable `hotfix/*` branch support in existing GitHub Actions workflows.

---

## 1. Quick Summary

| Step | File | Risk | Effort |
|------|------|------|--------|
| 1 | `.github/workflows/hotfix.yml` (NEW) | None — new file | Copy from template |
| 2 | `.github/workflows/create-release.yml` | Low — 3 targeted changes | ~5 min |
| 3 | `.github/workflows/cd.yml` | Medium — extensive changes | ~30-45 min *(Approach A only)* |
| 4 | Repository secrets & variables | None | ~5 min |

> **Two migration approaches are available** — see [Choose Your Migration Approach](#3-choose-your-migration-approach) below.

---

## 2. Prerequisites

Before starting, make sure you have:

- [ ] Admin access to the repository (for secrets, variables, and branch protection)
- [ ] A GitHub Personal Access Token (PAT) with `repo` scope, stored as `IT_EADI_API_MGMT_GIT_TOKEN`

### 2.1 Verify Repository Secrets

Go to **Settings → Secrets and variables → Actions → Secrets** and verify these exist:

| Secret | Purpose |
|--------|---------|
| `IT_EADI_API_MGMT_GIT_TOKEN` | GitHub PAT with `repo` scope — for releases, tags, PRs, branch protection |
| `AWS_ACCESS_KEY_ID_NON_PROD` | AWS access key for Dev/Test (non-prod EKS cluster) |
| `AWS_SECRET_ACCESS_KEY_NON_PROD` | AWS secret key for Dev/Test (non-prod EKS cluster) |
| `AWS_ACCESS_KEY_ID_ACC` | AWS access key for ACC (acc EKS cluster) |
| `AWS_SECRET_ACCESS_KEY_ACC` | AWS secret key for ACC (acc EKS cluster) |
| `AWS_ACCESS_KEY_ID_PROD` | AWS access key for Prod (prod EKS cluster) |
| `AWS_SECRET_ACCESS_KEY_PROD` | AWS secret key for Prod (prod EKS cluster) |

### 2.2 Set Up Repository Variable

Go to **Settings → Secrets and variables → Actions → Variables** and create:

| Variable | Purpose | Example |
|----------|---------|---------|
| `PR_REVIEWERS` | Comma-separated GitHub usernames for hotfix PR reviewers | `ops-lead-1,ops-lead-2` |

> **Note:** `PR_REVIEWERS` is validated before Prod deployment. The pipeline will **block** if this variable is empty or contains invalid usernames.

---

## 3. Choose Your Migration Approach

### 3.1 Approach A: Incremental Migration (Recommended)

**Best for:** Teams with customized workflows (custom Docker build args, additional deploy steps, project-specific logic).

Make targeted changes to your **existing** workflow files by following Steps 1–3 below.

**Pros:** Minimal risk, preserves customizations, easy to review.
**Cons:** More changes in `cd.yml` (~30-45 min).

---

#### 3.1.1 Step 1: Add the Hotfix Utility Workflow (NEW FILE)

**Create `.github/workflows/hotfix.yml`** by copying from the `itaap-react-eks-template` repo.

No modifications needed — the workflow uses `github.repository` dynamically.

---

#### 3.1.2 Step 2: Update `create-release.yml`

##### 3.1.2.1 Change 1 — Add `hotfix/*` to push trigger branches

```yaml
# BEFORE:
on:
  push:
    branches:
      - main

# AFTER:
on:
  push:
    branches:
      - main
      - 'hotfix/*'
```

##### 3.1.2.2 Change 2 — Skip merge conflict resolution commits

Add a condition to the build job:

```yaml
# BEFORE:
jobs:
  build:
    name: Create Release
    runs-on: [self-hosted, linux, x64, philips-code-hub, ubuntu-latest]
    steps:

# AFTER:
jobs:
  build:
    name: Create Release
    runs-on: [self-hosted, linux, x64, philips-code-hub, ubuntu-latest]
    # Skip merge conflict resolution commits on hotfix branches
    if: ${{ !(startsWith(github.ref, 'refs/heads/hotfix/') && startsWith(github.event.head_commit.message, 'Merge branch')) }}
    steps:
```

##### 3.1.2.3 Change 3 — Use `IT_EADI_API_MGMT_GIT_TOKEN`

Ensure the tag and release steps use `IT_EADI_API_MGMT_GIT_TOKEN`:

```yaml
      - name: Bump version and push tag
        id: tag_version
        uses: mathieudutour/github-tag-action@v6.2
        with:
          github_token: ${{ secrets.IT_EADI_API_MGMT_GIT_TOKEN }}
      - name: Create Release
        id: create_release
        uses: actions/create-release@latest
        env:
          GITHUB_TOKEN: ${{ secrets.IT_EADI_API_MGMT_GIT_TOKEN }}
```

---

#### 3.1.3 Step 3: Update CD Workflow (`cd.yml`)

The CD workflow requires the most changes. The React template has **inline deployment steps** (not reusable workflows), so each job needs individual modification.

##### 3.1.3.1 Change 1 — Add `detect-hotfix` job

Add this as the **first job** in the `jobs:` section:

```yaml
  detect-hotfix:
    runs-on: [self-hosted, linux, x64, philips-code-hub, ubuntu-latest]
    if: ${{ startsWith(github.ref, 'refs/tags/') }}
    outputs:
      is_hotfix: ${{ steps.check.outputs.is_hotfix }}
      hotfix_branch: ${{ steps.check.outputs.hotfix_branch }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check if tag is from a hotfix branch
        id: check
        run: |
          TAG_COMMIT=$(git rev-parse HEAD)
          echo "Tag commit: $TAG_COMMIT"
          
          HOTFIX_BRANCH=$(git branch -r --contains "$TAG_COMMIT" | grep 'origin/hotfix/' | head -1 | tr -d ' ' | sed 's|origin/||')
          
          if [ -n "$HOTFIX_BRANCH" ]; then
            echo "is_hotfix=true" >> "$GITHUB_OUTPUT"
            echo "hotfix_branch=$HOTFIX_BRANCH" >> "$GITHUB_OUTPUT"
            echo "🔥 Hotfix detected: $HOTFIX_BRANCH"
          else
            echo "is_hotfix=false" >> "$GITHUB_OUTPUT"
            echo "hotfix_branch=" >> "$GITHUB_OUTPUT"
            echo "✅ Normal release (from main)"
          fi
```

> **Note:** The React template uses tag ancestry detection (same as Apigee) because `cd.yml` is triggered by `release: published` — branch context is lost.

##### 3.1.3.2 Change 2 — Update Dev-Deployment condition to skip for hotfix

Add `detect-hotfix` to `needs` and update the `if` condition:

```yaml
# BEFORE:
  Dev-Deployment:
    name: DEV Deployment
    ...
    if: ${{ startsWith(github.ref, 'refs/tags/') }}

# AFTER:
  Dev-Deployment:
    name: DEV Deployment
    needs: [detect-hotfix]
    ...
    if: ${{ startsWith(github.ref, 'refs/tags/') && needs.detect-hotfix.outputs.is_hotfix != 'true' }}
```

##### 3.1.3.3 Change 3 — Add pre-deployment safety checks

Add **three** safety check jobs. Copy the full scripts from the updated `cd.yml`:

- `pre-deploy-safety-check` (after Dev, before Test — main releases only)
- `pre-deploy-safety-check-acc` (after Test, before ACC — main releases only)
- `pre-deploy-safety-check-prod` (after ACC, before Prod — main releases only)

Each safety check:
1. Fetches all tags with `--force` (critical for self-hosted runners)
2. Checks each `hotfix/*` branch for unmerged prod deployments
3. Blocks deployment (`exit 1`) if any blockers are found

##### 3.1.3.4 Change 4 — Update Test-Deployment condition

Test must support both normal path (Dev succeeded + safety check passed) and hotfix path (Dev skipped):

```yaml
# BEFORE:
  Test-Deployment:
    name: TEST Deployment
    needs: [Dev-Deployment]
    if: ${{ startsWith(github.ref, 'refs/tags/') }}

# AFTER:
  Test-Deployment:
    name: TEST Deployment
    needs: [detect-hotfix, Dev-Deployment, pre-deploy-safety-check]
    if: |
      always() && startsWith(github.ref, 'refs/tags/') && (
        needs.detect-hotfix.outputs.is_hotfix == 'true' ||
        (needs.Dev-Deployment.result == 'success' && needs.pre-deploy-safety-check.result == 'success')
      )
```

> **Key:** `always()` is required. When upstream jobs are skipped, GitHub Actions evaluates the entire `if` as false by default.

##### 3.1.3.5 Change 5 — Update Acc-Deployment condition

```yaml
# BEFORE:
  Acc-Deployment:
    name: ACC Deployment
    needs: [Test-Deployment]
    if: ${{ startsWith(github.ref, 'refs/tags/') }}

# AFTER:
  Acc-Deployment:
    name: ACC Deployment
    needs: [detect-hotfix, Test-Deployment, pre-deploy-safety-check-acc]
    if: |
      always() && startsWith(github.ref, 'refs/tags/') && (
        (needs.detect-hotfix.outputs.is_hotfix == 'true' && needs.Test-Deployment.result == 'success') ||
        (needs.Test-Deployment.result == 'success' && needs.pre-deploy-safety-check-acc.result == 'success')
      )
```

##### 3.1.3.6 Change 6 — Add environment tagging to ACC

Add this step at the end of Acc-Deployment:

```yaml
      - name: Tag environment deployment
        env:
          GITHUB_TOKEN: ${{ secrets.IT_EADI_API_MGMT_GIT_TOKEN }}
        run: |
          TAG_NAME="acc/${{ github.event.release.tag_name }}"
          git tag "$TAG_NAME"
          git push origin "$TAG_NAME"
          echo "Tagged deployment: $TAG_NAME"
```

##### 3.1.3.7 Change 7 — Add `hotfix-pr-reviewer-validation` job

Add this job after Acc-Deployment. Copy the full script from the updated `cd.yml`.

##### 3.1.3.8 Change 8 — Update Prod-Deployment condition

```yaml
# BEFORE:
  Prod-Deployment:
    name: PROD Deployment
    needs: [Acc-Deployment]
    if: ${{ startsWith(github.ref, 'refs/tags/') }}

# AFTER:
  Prod-Deployment:
    name: PROD Deployment
    needs: [detect-hotfix, Acc-Deployment, hotfix-pr-reviewer-validation, pre-deploy-safety-check-prod]
    if: |
      always() && startsWith(github.ref, 'refs/tags/') && needs.Acc-Deployment.result == 'success' && (
        needs.hotfix-pr-reviewer-validation.result == 'success' ||
        needs.hotfix-pr-reviewer-validation.result == 'skipped'
      ) && (
        needs.pre-deploy-safety-check-prod.result == 'success' ||
        needs.pre-deploy-safety-check-prod.result == 'skipped'
      )
```

##### 3.1.3.9 Change 9 — Add environment tagging to Prod

Add this step at the end of Prod-Deployment:

```yaml
      - name: Tag environment deployment
        env:
          GITHUB_TOKEN: ${{ secrets.IT_EADI_API_MGMT_GIT_TOKEN }}
        run: |
          TAG_NAME="prod/${{ github.event.release.tag_name }}"
          git tag "$TAG_NAME"
          git push origin "$TAG_NAME"
          echo "Tagged deployment: $TAG_NAME"
```

##### 3.1.3.10 Change 10 — Add `hotfix-auto-pr` job

Add this as the **last job** in `cd.yml`. Copy the full script from the updated `cd.yml`.

---

### 3.2 Approach B: Full Replacement (Faster)

**Best for:** Teams whose workflows closely match the standard React EKS template with few or no customizations.

Replace your workflow files with the latest versions from `itaap-react-eks-template`, then update project-specific values.

**Steps:**

#### 3.2.1 Step 1: Copy the latest workflow files from the template repo:

| Template File | Replaces |
|---------------|----------|
| `cd.yml` | `.github/workflows/cd.yml` |
| `create-release.yml` | `.github/workflows/create-release.yml` |
| `hotfix.yml` | `.github/workflows/hotfix.yml` (NEW) |

> **Note:** `ci.yml` (PR checks) does not need changes — it only runs on pull requests and is not part of the deployment chain.

#### 3.2.2 Step 2: Find and replace all project-specific placeholders:

**In `cd.yml`:**

| Placeholder | Replace With | Where |
|-------------|-------------|-------|
| `<GITHUB_REPOSITORY_NAME>` | Your GitHub repo name | env block |
| `<ECR_REPOSITORY_PATH>` | Your ECR repo path | env block |
| `<EKS_APPLICATION_PATH_DEV_ACC_PROD>` | Your EKS app path (Dev/ACC/Prod) | env block |
| `<EKS_APPLICATION_PATH_TEST>` | Your EKS app path (Test) | env block |
| `<EKS_NAMESPACE>` | Your EKS namespace | each deployment job |

#### 3.2.3 Step 3: Transfer project-specific customizations.

> **⚠️ Always diff your old and new files to ensure nothing is missed.**

> **Tip:** Before replacing, save a backup:
> ```bash
> cp .github/workflows/cd.yml .github/workflows/cd.yml.bak
> cp .github/workflows/create-release.yml .github/workflows/create-release.yml.bak
> ```

---

## 4. Create and Deploy Hotfix (Without Release Tags)

If your repo has no release tags (`v*`), find the Prod commit SHA from the last successful CD run, compare with `main` HEAD, and create a hotfix branch from the Prod SHA if they differ:

```bash
git fetch --all --tags
git checkout -b hotfix/<fix-name> <prod-commit-sha>
git push -u origin hotfix/<fix-name>
```

---

## 5. Migration Checklist

### 5.1 New File
- [ ] Created `.github/workflows/hotfix.yml`

### 5.2 `create-release.yml`
- [ ] 2.1 — Added `hotfix/*` to push trigger branches
- [ ] 2.2 — Added merge conflict skip condition
- [ ] 2.3 — Using `IT_EADI_API_MGMT_GIT_TOKEN`

### 5.3 `cd.yml`
- [ ] 3.1 — Added `detect-hotfix` job (tag ancestry)
- [ ] 3.2 — Updated Dev-Deployment condition (skip for hotfix)
- [ ] 3.3 — Added `pre-deploy-safety-check` (before Test, main only)
- [ ] 3.3 — Added `pre-deploy-safety-check-acc` (before ACC, main only)
- [ ] 3.3 — Added `pre-deploy-safety-check-prod` (before Prod, main only)
- [ ] 3.4 — Updated Test-Deployment condition (`always()` + hotfix path)
- [ ] 3.5 — Updated Acc-Deployment condition (`always()` + hotfix path)
- [ ] 3.6 — Added environment tagging to ACC
- [ ] 3.7 — Added `hotfix-pr-reviewer-validation` job
- [ ] 3.8 — Updated Prod-Deployment condition (`always()` + reviewer/safety check)
- [ ] 3.9 — Added environment tagging to Prod
- [ ] 3.10 — Added `hotfix-auto-pr` job

### 5.4 Repository Configuration
- [ ] Verified `IT_EADI_API_MGMT_GIT_TOKEN` secret
- [ ] Configured `PR_REVIEWERS` variable with valid GitHub usernames

---

## 6. Verification

After completing all changes:

1. **Push to main** and verify the normal pipeline runs: Dev → Test → ACC → Prod
2. **Test hotfix flow:**
   - Go to **Actions → "Create Hotfix Branch"** → Run workflow
   - Enter a test hotfix name (e.g., `test-migration`)
   - Verify the branch is created from the latest release tag
   - Push a small commit to the hotfix branch
   - Verify `create-release.yml` creates a release tag
   - Verify `cd.yml` skips Dev and deploys Test → ACC → Prod
   - Verify the auto-PR is created with correct reviewers
   - Merge the PR and verify the fix is included in the next main deployment

> **⚠️ Note on `git fetch --force`:** The safety checks use `git fetch --all --tags --force --prune`. The `--force` flag is critical on self-hosted runners because without it, `git fetch` will **not overwrite** existing local tags.

---

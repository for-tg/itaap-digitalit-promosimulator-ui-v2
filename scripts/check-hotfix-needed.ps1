<#
.SYNOPSIS
    Check if a hotfix deployment is needed for this React EKS application.

.DESCRIPTION
    Compares the latest production release tag against the current main branch
    to determine if main has moved ahead (commits exist that aren't in prod).
    If so, provides instructions for both automated (GitHub Actions) and manual hotfix creation.

.PARAMETER RepoPath
    Path to the local git repository. Defaults to current directory.

.PARAMETER Force
    Skip confirmation prompts and just show the analysis.

.EXAMPLE
    .\scripts\check-hotfix-needed.ps1
    .\scripts\check-hotfix-needed.ps1 -RepoPath "C:\repos\my-react-app"
    .\scripts\check-hotfix-needed.ps1 -Force

.NOTES
    Requires git CLI. Run from the repository root or specify -RepoPath.
    This script is for React EKS Template projects using GitHub Actions.
#>

param(
    [string]$RepoPath = ".",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Push-Location $RepoPath
try {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  HOTFIX DEPLOYMENT CHECK" -ForegroundColor Cyan
    Write-Host "  React EKS Template — GitHub Actions" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    # Fetch latest from remote
    Write-Host "  Fetching latest from remote..." -ForegroundColor Gray
    git fetch --all --tags --prune 2>&1 | Out-Null

    # Find the latest release tag (semver: v1.0.0, v1.0.1, etc.)
    $allTags = git tag -l "v*" --sort=-version:refname 2>&1
    if (-not $allTags) {
        Write-Host "  No release tags (v*) found." -ForegroundColor Yellow
        Write-Host "  This project may not have been deployed yet." -ForegroundColor Yellow
        Write-Host "============================================" -ForegroundColor Cyan
        exit 0
    }

    $latestTag = ($allTags | Select-Object -First 1).Trim()
    Write-Host "  Latest release tag: $latestTag" -ForegroundColor White

    # Find prod environment tags
    $prodTags = git tag -l "prod/*" --sort=-version:refname 2>&1
    if ($prodTags) {
        $latestProdTag = ($prodTags | Select-Object -First 1).Trim()
        Write-Host "  Latest prod tag:    $latestProdTag" -ForegroundColor White
    } else {
        Write-Host "  Latest prod tag:    (none)" -ForegroundColor Yellow
    }

    # Check how many commits main is ahead of the latest release tag
    $commitsAhead = git rev-list --count "$latestTag..origin/main" 2>&1
    $commitsAhead = [int]$commitsAhead.Trim()

    Write-Host ""
    Write-Host "  Commits on main since $latestTag`: $commitsAhead" -ForegroundColor White

    # Check for active hotfix branches
    $hotfixBranches = git branch -r --list "origin/hotfix/*" 2>&1 | ForEach-Object { $_.Trim() }
    if ($hotfixBranches) {
        Write-Host ""
        Write-Host "  Active hotfix branches:" -ForegroundColor Yellow
        foreach ($branch in $hotfixBranches) {
            Write-Host "    - $branch" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan

    if ($commitsAhead -eq 0) {
        Write-Host "  ✅ Production is up to date with main." -ForegroundColor Green
        Write-Host "  No hotfix needed — you can hotfix from the latest tag." -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Cyan
        exit 0
    }

    Write-Host "  ⚠️  Main is $commitsAhead commit(s) ahead of production." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  If you deploy from main, ALL $commitsAhead commits will go to prod." -ForegroundColor Yellow
    Write-Host "  To deploy ONLY a targeted fix, use the hotfix workflow:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  ─────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "  OPTION A: Use GitHub Actions UI (recommended)" -ForegroundColor Green
    Write-Host ""
    Write-Host "    1. Go to Actions → 'Create Hotfix Branch' → Run workflow" -ForegroundColor White
    Write-Host "    2. Select environment: prod" -ForegroundColor White
    Write-Host "    3. Enter a descriptive name (e.g., fix-header-alignment)" -ForegroundColor White
    Write-Host "    4. Click 'Run workflow'" -ForegroundColor White
    Write-Host "    5. Pull the created branch, make your fix, push" -ForegroundColor White
    Write-Host "    6. Push triggers: create-release → cd.yml → Test → ACC → Prod" -ForegroundColor White
    Write-Host ""
    Write-Host "  ─────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "  OPTION B: Manual (if Actions UI is unavailable)" -ForegroundColor Green
    Write-Host ""
    Write-Host "    git fetch --all --tags" -ForegroundColor White
    Write-Host "    git checkout -b hotfix/<name> $latestTag" -ForegroundColor White
    Write-Host "    # ... make your fix ..." -ForegroundColor Gray
    Write-Host "    git push origin hotfix/<name>" -ForegroundColor White
    Write-Host ""
    Write-Host "  ─────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "============================================" -ForegroundColor Cyan

} finally {
    Pop-Location
}

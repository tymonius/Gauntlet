param(
    [string]$RepoPath = "C:\Users\tymon\Gauntlet",
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

function Run-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)

    & git @Args

    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Args -join ' ')"
    }
}

Write-Host ""
Write-Host "=== Gauntlet Repository Sync ===" -ForegroundColor Cyan

# Make sure Git exists.
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or is not available in PATH."
}

# Make sure the target directory exists.
if (-not (Test-Path $RepoPath)) {
    throw "Repository directory does not exist: $RepoPath"
}

Set-Location $RepoPath

# Make sure this is actually a Git repository.
if (-not (Test-Path ".git")) {
    throw "$RepoPath is not a Git repository."
}

# Determine the current branch.
$Branch = (& git branch --show-current).Trim()

if (-not $Branch) {
    throw "The repository is in detached HEAD state. Check out a branch first."
}

Write-Host "Repository: $RepoPath"
Write-Host "Branch:     $Branch"
Write-Host ""

# Make sure origin exists.
$Origin = (& git remote get-url origin 2>$null)

if (-not $Origin) {
    throw "This repository does not have an 'origin' remote."
}

Write-Host "Remote:     $Origin"
Write-Host ""

# Stage every local change, including new files and deletions.
Write-Host "[1/4] Checking local changes..." -ForegroundColor Yellow
Run-Git add -A

$HasChanges = $false
& git diff --cached --quiet

if ($LASTEXITCODE -eq 1) {
    $HasChanges = $true
}
elseif ($LASTEXITCODE -ne 0) {
    throw "Unable to determine whether staged changes exist."
}

# Commit local changes before rebasing against GitHub.
if ($HasChanges) {
    if ([string]::IsNullOrWhiteSpace($Message)) {
        $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $Message = "Local sync $Timestamp"
    }

    Write-Host "[2/4] Committing local changes..." -ForegroundColor Yellow
    Run-Git commit -m $Message
}
else {
    Write-Host "[2/4] No local changes to commit." -ForegroundColor DarkGray
}

# Get anything that changed on GitHub.
Write-Host "[3/4] Syncing with GitHub..." -ForegroundColor Yellow
Run-Git fetch origin

# Rebase local commits on top of the current remote branch.
$RemoteBranchExists = $false
& git show-ref --verify --quiet "refs/remotes/origin/$Branch"

if ($LASTEXITCODE -eq 0) {
    $RemoteBranchExists = $true
}

if ($RemoteBranchExists) {
    Run-Git rebase "origin/$Branch"
}
else {
    Write-Host "Remote branch origin/$Branch does not exist yet; it will be created." -ForegroundColor DarkGray
}

# Push the resulting branch.
Write-Host "[4/4] Pushing to GitHub..." -ForegroundColor Yellow
Run-Git push -u origin $Branch

Write-Host ""
Write-Host "Sync complete." -ForegroundColor Green
Write-Host ""

Run-Git status --short --branch
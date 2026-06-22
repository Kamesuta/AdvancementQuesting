param(
    [Parameter(Mandatory)]
    [string]$WorktreePath
)

$ErrorActionPreference = 'Stop'

$base = $env:CLAUDE_PROJECT_DIR
if (-not $base) { $base = (git rev-parse --show-toplevel) }
$base = Resolve-Path $base
$wtPath = Resolve-Path $WorktreePath

# Symlink web/public (atlas images are gitignored)
$publicTarget = Join-Path $base "web/public"
$publicLink = Join-Path $wtPath "web/public"
if (Test-Path $publicLink) { Remove-Item -Recurse -Force $publicLink }
New-Item -ItemType SymbolicLink -Path $publicLink -Target $publicTarget | Out-Null

# Install npm dependencies
Push-Location (Join-Path $wtPath "web")
try { npm install } finally { Pop-Location }

Write-Host ""
Write-Host "Worktree setup complete: $wtPath" -ForegroundColor Green

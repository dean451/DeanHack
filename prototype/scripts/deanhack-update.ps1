# Update the play copy and launch it on native Windows: pull master, serve the demo scene on 5173.
# The live UnNetHack engine build is Unix-only; use deanhack-update.sh inside WSL for that.
# Run it from the play copy (the checkout on master):  .\prototype\scripts\deanhack-update.ps1
$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Port = 5173
Set-Location $Root

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne 'master') {
    Write-Error "Refusing to update: this checkout is on '$branch', not master (is this the play copy?)."
}

git pull --ff-only origin master
if ($LASTEXITCODE) { exit $LASTEXITCODE }

Set-Location (Join-Path $Root 'prototype')
npm ci
if ($LASTEXITCODE) { exit $LASTEXITCODE }

Write-Host 'Skipping the live engine build (needs WSL). Demo room only.'

# Free the port so the server restarts cleanly.
Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host "Stopping the server on port $Port"; Stop-Process -Id $_.OwningProcess -Force }

Write-Host "Starting on http://127.0.0.1:$Port/ (use a private window if your ad blocker blocks boomerang.js)"
npm run dev -- --port $Port --strictPort

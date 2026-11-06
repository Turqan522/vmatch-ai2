$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$localNode = Join-Path $PSScriptRoot '.tools\node-v22.23.4-win-x64'
if (Test-Path (Join-Path $localNode 'node.exe')) {
    $env:Path = "$localNode;$env:Path"
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required. Install Node.js, then run this script again.'
}
if (-not (Test-Path 'node_modules')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& npm.cmd run dev -- --host 127.0.0.1

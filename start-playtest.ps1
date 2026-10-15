param([ValidateRange(1024,65535)][int]$Port = 3011)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath './package.json')) { throw 'Ashwatch package.json is missing.' }
$taskNodeVersion = [version]((node --version).TrimStart('v'))
if ($taskNodeVersion.Major -lt 24) { throw 'Use Node.js 24 or newer for this verified playtest setup.' }
if (-not (Test-Path -LiteralPath './node_modules/next')) {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
foreach ($taskScript in @('test', 'typecheck', 'lint', 'build')) {
    npm run $taskScript
    if ($LASTEXITCODE -ne 0) { throw "Ashwatch $taskScript failed." }
}
Write-Host "Open http://127.0.0.1:$Port/ashwatch. Keep this terminal open; Ctrl+C stops the server."
npm start -- --hostname 127.0.0.1 --port $Port

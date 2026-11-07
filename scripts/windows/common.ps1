# Shared by the Windows Server setup and launcher. PowerShell 5.1 or newer.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-WindowsRuntime {
    param([string]$Component)
    if ($env:OS -ne 'Windows_NT') { throw 'Run this script in PowerShell on Windows Server.' }
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Install Node.js LTS from https://nodejs.org/ and reopen PowerShell. For WhatsApp, use Node 22.22.2 or newer 22.x.' }
    $version = [version]((& node.exe -p 'process.versions.node').Trim())
    if ($LASTEXITCODE -ne 0) { throw 'Node.js did not start successfully.' }
    if ($version -lt [version]'22.0.0' -or ($version.Major % 2) -ne 0) { throw 'Use a supported Node.js LTS version (22 or newer). For WhatsApp, use Node 22.22.2 or newer 22.x.' }
    if ($Component -ne 'Web' -and ($version.Major -ne 22 -or $version -lt [version]'22.22.2')) { throw 'This OpenWA service requires Node 22.22.2 or newer 22.x. Install that runtime and reopen PowerShell.' }
}

function Select-AppComponent {
    param([string]$Action)
    while ($true) {
        Write-Host ''
        Write-Host ('41 Real Estate - ' + $Action) -ForegroundColor Cyan
        Write-Host '  1. Real Estate app only'
        Write-Host '  2. WhatsApp service only'
        Write-Host '  3. Both'
        Write-Host '  0. Exit'
        switch (Read-Host 'Choose 1, 2, 3 or 0') {
            '1' { return 'Web' }
            '2' { return 'WhatsApp' }
            '3' { return 'Both' }
            '0' { return '' }
            default { Write-Host 'Please choose one of the listed numbers.' -ForegroundColor Yellow }
        }
    }
}

function Read-PrivateValue {
    param([string]$Prompt)
    $secure = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Invoke-ProjectNpm {
    param([string]$Directory, [string[]]$NpmArguments)
    Push-Location -LiteralPath $Directory
    try {
        & npm.cmd @NpmArguments
        if ($LASTEXITCODE -ne 0) { throw ('npm failed in ' + $Directory + '. Resolve the error above and rerun setup.') }
    }
    finally { Pop-Location }
}

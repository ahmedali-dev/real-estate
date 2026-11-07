#Requires -Version 5.1
<#
.SYNOPSIS
Installs and configures the Real Estate app, WhatsApp service, or both.
.EXAMPLE
.\init-windows.ps1
.EXAMPLE
.\init-windows.ps1 -Component Both -Start
#>
[CmdletBinding()]
param(
    [ValidateSet('Web','WhatsApp','Both')][string]$Component,
    [ValidateRange(0,65534)][int]$WebPort = 0,
    [switch]$Start
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts\windows\common.ps1')
try {
    if (-not $Component) { $Component = Select-AppComponent 'first-time setup' }
    if (-not $Component) { return }
    Assert-WindowsRuntime $Component
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm.cmd is missing. Reinstall Node.js with npm included.' }
    $web = $Component -ne 'WhatsApp'
    $whatsapp = $Component -ne 'Web'
    if ($web) {
        Write-Host 'Installing web application dependencies...' -ForegroundColor Cyan
        Invoke-ProjectNpm -Directory $PSScriptRoot -NpmArguments @('ci','--include=dev','--no-audit','--no-fund')
    }
    if ($whatsapp) {
        Write-Host 'Installing isolated WhatsApp dependencies (browser download may take a few minutes)...' -ForegroundColor Cyan
        Invoke-ProjectNpm -Directory (Join-Path $PSScriptRoot 'services\openwa') -NpmArguments @('ci','--no-audit','--no-fund')
    }
    Write-Host ''
    Write-Host 'Existing nonempty configuration values and secrets are preserved.'
    $siteUrl = Read-Host 'Public website URL (HTTPS; leave blank to keep existing or use localhost)'
    $mongo = ''
    $cloudinary = ''
    if ($web) {
        $mongo = Read-PrivateValue 'MongoDB replica-set/Atlas URI (leave blank to keep existing)'
        $cloudinary = Read-PrivateValue 'Cloudinary URL for image uploads (optional; blank keeps existing)'
    }
    $payload = @{ component=$Component; webPort=$WebPort; siteUrl=$siteUrl; mongodbUri=$mongo; cloudinaryUrl=$cloudinary } | ConvertTo-Json -Compress
    $savedOutputEncoding = $OutputEncoding
    try {
        $OutputEncoding = New-Object System.Text.UTF8Encoding $false
        $payload | & node.exe (Join-Path $PSScriptRoot 'scripts\windows\configure.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'Configuration is incomplete. Follow the message above and rerun setup.' }
    }
    finally { $OutputEncoding = $savedOutputEncoding; $payload = $null; $mongo = $null; $cloudinary = $null }
    if ($web) {
        Write-Host 'Building the production website...' -ForegroundColor Cyan
        $previousNodeEnvironment = [Environment]::GetEnvironmentVariable('NODE_ENV', 'Process')
        try {
            $env:NODE_ENV = 'production'
            Invoke-ProjectNpm -Directory $PSScriptRoot -NpmArguments @('run','build','--','--webpack')
        }
        finally { [Environment]::SetEnvironmentVariable('NODE_ENV', $previousNodeEnvironment, 'Process') }
    }
    Write-Host ''
    Write-Host 'Setup complete. Use .\start-windows.ps1 to select what to run.' -ForegroundColor Green
    if ($Start) { & (Join-Path $PSScriptRoot 'start-windows.ps1') -Component $Component }
}
catch {
    $failure = $_
    $failureMessage = $failure.Exception.Message
    if ($failure.InvocationInfo -and $failure.InvocationInfo.ScriptName) {
        $failureMessage += [Environment]::NewLine + ('File: {0}, line {1}' -f $failure.InvocationInfo.ScriptName, $failure.InvocationInfo.ScriptLineNumber)
    }
    $failureMessage += [Environment]::NewLine + ('Error ID: {0}' -f $failure.FullyQualifiedErrorId)
    Write-Error -Message $failureMessage -ErrorAction Continue
    exit 1
}

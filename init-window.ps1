#Requires -Version 5.1
# Compatibility alias. The main setup script is init-windows.ps1.
[CmdletBinding()]
param(
    [ValidateSet('Web','WhatsApp','Both')][string]$Component,
    [ValidateRange(0,65534)][int]$WebPort = 0,
    [switch]$Start
)
$setupScript = Join-Path $PSScriptRoot 'init-windows.ps1'
if (-not (Test-Path -LiteralPath $setupScript)) {
    Write-Error 'Missing init-windows.ps1. Copy the complete repository, including scripts\windows, before running setup.'
    exit 1
}
& $setupScript @PSBoundParameters
if (-not $?) { exit 1 }

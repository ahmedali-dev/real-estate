#Requires -Version 5.1
<#
.SYNOPSIS
Starts the Real Estate app, WhatsApp service, or both in the current console.
.EXAMPLE
.\start-windows.ps1
.EXAMPLE
.\start-windows.ps1 -Component Web
.EXAMPLE
.\start-windows.ps1 -Component Both -WebPort 3001
#>
[CmdletBinding()]
param(
    [ValidateSet('Web','WhatsApp','Both')][string]$Component,
    [ValidateRange(0,65534)][int]$WebPort = 0,
    [ValidateSet('127.0.0.1','0.0.0.0','localhost')][string]$BindAddress = '127.0.0.1',
    [switch]$Check
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts\windows\common.ps1')
try {
    if (-not $Component) { $Component = Select-AppComponent 'start services' }
    if (-not $Component) { return }
    Assert-WindowsRuntime $Component
    $runnerArgs = @((Join-Path $PSScriptRoot 'scripts\windows\run.mjs'),$Component,'--host',$BindAddress)
    if ($WebPort -gt 0) { $runnerArgs += @('--web-port',[string]$WebPort) }
    if ($Check) { $runnerArgs += '--check' }
    & node.exe @runnerArgs
    if ($LASTEXITCODE -ne 0) { throw 'Startup stopped. Review the error above; run .\init-windows.ps1 if dependencies or configuration are missing.' }
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

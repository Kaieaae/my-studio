$ErrorActionPreference = "Stop"

$launcher = Join-Path $PSScriptRoot "open-slab-builder.bat"
if (-not (Test-Path -LiteralPath $launcher)) {
    throw "Local launcher was not found: $launcher"
}

$protocolRoot = "Registry::HKEY_CURRENT_USER\Software\Classes\slabbuilder"
$commandKey = Join-Path $protocolRoot "shell\open\command"

New-Item -Path $protocolRoot -Force | Out-Null
(Get-Item -LiteralPath $protocolRoot).SetValue("", "URL:Slab Builder Launcher")
(Get-Item -LiteralPath $protocolRoot).SetValue("URL Protocol", "")

New-Item -Path (Join-Path $protocolRoot "shell") -Force | Out-Null
New-Item -Path (Join-Path $protocolRoot "shell\open") -Force | Out-Null
New-Item -Path $commandKey -Force | Out-Null

$command = '"' + $launcher + '" "%1"'
(Get-Item -LiteralPath $commandKey).SetValue("", $command)

Write-Host "Setup completed."
Write-Host "Protocol: slabbuilder://open"
Write-Host "Launcher: $launcher"
Write-Host ""
Write-Host "When the browser asks to open Slab Builder Launcher, choose Allow."

# Crée un raccourci Bureau "WTT Patch Notes" (icône + épinglable à la barre des tâches)
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$png  = Join-Path $root 'WTT.png'
$ico  = Join-Path $root 'WTT.ico'
$bat  = Join-Path $root 'start.bat'
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk  = Join-Path $desktop 'WTT Patch Notes.lnk'

if (-not (Test-Path $bat)) {
  Write-Host 'start.bat introuvable.' -ForegroundColor Red
  pause
  exit 1
}

if (-not (Test-Path $png)) {
  Write-Host 'WTT.png introuvable.' -ForegroundColor Red
  pause
  exit 1
}

Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::FromFile($png)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create($ico)
$icon.Save($stream)
$stream.Close()
$bitmap.Dispose()
$icon.Dispose()

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnk)
$shortcut.TargetPath = "$env:SystemRoot\System32\cmd.exe"
$shortcut.Arguments = "/c `"cd /d `"$root`" && start.bat`""
$shortcut.WorkingDirectory = $root
$shortcut.WindowStyle = 7
$shortcut.IconLocation = "$ico,0"
$shortcut.Description = 'WTT Patch Notes — générateur de patch notes'
$shortcut.Save()

Write-Host ''
Write-Host '  Raccourci cree sur le Bureau : WTT Patch Notes' -ForegroundColor Green
Write-Host ''
Write-Host '  Barre des taches :'
Write-Host '    1. Clic droit sur "WTT Patch Notes" (Bureau)'
Write-Host '    2. Epingler a la barre des taches'
Write-Host ''
Write-Host '  Si absent : lance le raccourci une fois, puis clic droit'
Write-Host '  sur l''icone WTT dans la barre > Epingler.'
Write-Host ''
pause

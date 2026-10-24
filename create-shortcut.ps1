$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$RepoDir = (Get-Item $PSScriptRoot).FullName
$ShortcutPath = Join-Path $DesktopPath 'Jang Play.lnk'

$WscriptPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$SilentLauncher = Join-Path $RepoDir 'local-site\start-silent.vbs'
$IconPath = Join-Path $RepoDir 'local-site\ps-neon.ico'

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $WscriptPath
$Shortcut.Arguments = "`"$SilentLauncher`""
$Shortcut.WorkingDirectory = (Join-Path $RepoDir 'local-site')
$Shortcut.IconLocation = "$IconPath,0"
$Shortcut.Description = 'Jang Play - Thư viện trò chơi của Jang'
$Shortcut.Save()

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   DA TAO THANH CONG SHORTCUT 'Jang Play' NGOAI DESKTOP!" -ForegroundColor Green
Write-Host "   Icon: $IconPath" -ForegroundColor DarkGray
Write-Host "   Target: $WscriptPath" -ForegroundColor DarkGray
Write-Host "   Launcher: $SilentLauncher" -ForegroundColor DarkGray
Write-Host "========================================================" -ForegroundColor Cyan

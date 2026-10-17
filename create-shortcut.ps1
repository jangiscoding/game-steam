$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$RepoDir = (Get-Item $PSScriptRoot).FullName
$ShortcutPath = Join-Path $DesktopPath 'Jang Play.lnk'

$PywPath = 'C:\Program Files\Python311\pythonw.exe'
if (-not (Test-Path $PywPath)) {
    $cmd = Get-Command pythonw -ErrorAction SilentlyContinue
    if ($cmd) { $PywPath = $cmd.Source }
}
if (-not (Test-Path $PywPath)) {
    $PywPath = 'pythonw.exe'
}

$ServePy = Join-Path $RepoDir 'local-site\serve.py'
$IconPath = Join-Path $RepoDir 'local-site\ps-neon.ico'

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $PywPath
$Shortcut.Arguments = "`"$ServePy`""
$Shortcut.WorkingDirectory = (Join-Path $RepoDir 'local-site')
$Shortcut.IconLocation = "$IconPath,0"
$Shortcut.Description = 'Jang Play - Thư viện trò chơi của Jang'
$Shortcut.Save()

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   DA TAO THANH CONG SHORTCUT 'Jang Play' NGOAI DESKTOP!" -ForegroundColor Green
Write-Host "   Icon: $IconPath" -ForegroundColor DarkGray
Write-Host "   Target: $PywPath" -ForegroundColor DarkGray
Write-Host "========================================================" -ForegroundColor Cyan

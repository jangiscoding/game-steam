$code = @"
using System;
using System.Runtime.InteropServices;

public class ShellNotifier {
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    public static void Refresh() {
        SHChangeNotify(0x08000000, 0x1000, IntPtr.Zero, IntPtr.Zero);
    }
}
"@

Add-Type -TypeDefinition $code
[ShellNotifier]::Refresh()

$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath 'Jang Play.lnk'
if (Test-Path $ShortcutPath) {
    (Get-Item $ShortcutPath).LastWriteTime = Get-Date
}

Write-Host "Shell notified successfully!"

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir
launcher = scriptDir & "\start.bat"
WshShell.Run "cmd.exe /c """ & launcher & """", 0, False

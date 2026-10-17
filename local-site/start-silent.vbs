Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

pyExe = "C:\Program Files\Python311\pythonw.exe"
If Not fso.FileExists(pyExe) Then
    pyExe = "pythonw.exe"
End If

WshShell.Run """" & pyExe & """ """ & scriptDir & "\serve.py""", 0, False

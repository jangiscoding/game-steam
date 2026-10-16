@echo off
where py >nul 2>&1
if %errorlevel% equ 0 (
    py -3 "%~dp0serve.py" %*
) else (
    python "%~dp0serve.py" %*
)
pause

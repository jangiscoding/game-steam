@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>&1
if %errorlevel% equ 0 (
    py -3 "%~dp0serve.py" %*
    goto :server_stopped
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    python "%~dp0serve.py" %*
    goto :server_stopped
)

echo.
echo [Jang Play] Khong tim thay Python.
echo Hay cai Python 3 tu https://www.python.org/downloads/ va chon "Add Python to PATH".
pause
exit /b 1

:server_stopped
if not %errorlevel% equ 0 (
    echo.
    echo [Jang Play] Server da dung do loi. Ma loi: %errorlevel%
    pause
)

@echo off
setlocal

:: Clear any old messages
set "msg="

:: Ask for the commit message
set /p msg="Enter commit message (or press Enter for 'Routine update'): "

:: If nothing was typed, use the default
if not defined msg set "msg=Routine update"

echo.
echo [1/3] Staging files...
git add .

echo [2/3] Committing: "%msg%"
git commit -m "%msg%"

echo [3/3] Pushing to Azure...
git push origin main

:: Check if the push was successful and trigger the correct pop-up
if %errorlevel% equ 0 (
    echo.
    echo ✅ ZOOMING!
    powershell -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Push to Azure successful. ZOOMING!', 'ShipIt Success', 'OK', 'Information')"
) else (
    echo.
    echo ❌ Push failed! Check your terminal.
    powershell -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Push failed! Check your terminal for merge conflicts or errors.', 'ShipIt Error', 'OK', 'Error')"
)

endlocal
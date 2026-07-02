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

echo.
echo ✅ ZOOMING!
endlocal
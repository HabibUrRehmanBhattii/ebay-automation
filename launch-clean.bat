@echo off
REM Clean launcher for eBay Automation
REM Double-click this or point your desktop shortcut to it.
REM It will run the updated start-debug.ps1 which launches the app.

cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "start-debug.ps1"
exit

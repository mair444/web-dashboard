@echo off
REM set "MASTERLIST_FOLDER=C:\Users\L1183029\TotalEnergies\PROC - CMM TEAM (Contract Management & Methods)-3.0 Contract Committee - CC Master List"
set "MASTERLIST_FOLDER=C:\MasterTracker_Demo"
set PORT=4000
cd /d "%~dp0"
:loop
node server.js
timeout /t 5 /nobreak >nul
goto loop
@echo off
set "SRV=%~dp0run-server.bat"
set "VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MasterTrack.vbs"

> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>> "%VBS%" echo sh.Run Chr(34) ^& "%SRV%" ^& Chr(34), 0, False

echo Installed. Starting MasterTrack now...
wscript "%VBS%"
timeout /t 4 /nobreak >nul
start http://localhost:4000
echo.
echo Done. From now on MasterTrack starts automatically when you log in.
pause
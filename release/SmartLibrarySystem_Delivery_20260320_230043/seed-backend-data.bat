@echo off
setlocal
cd /d "%~dp0"
call "%~dp0backend-library\seed-backend-data.bat" %*
endlocal

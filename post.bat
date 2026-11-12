@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Zainstaluj Node.js LTS ze strony nodejs.org i uruchom ten plik ponownie. & pause & exit /b 1)
if not exist node_modules\three (echo Instaluje zaleznosci... & call npm install)
if not exist node_modules\playwright (echo Pobieram przegladarke i ffmpeg - jednorazowo... & call npm run reel:setup)
echo.
echo  KARUZELA 5 slajdow. Podaj miesien (np. naramienny)
echo  albo dni planu (np. 1-7), albo wpisz: lista
set /p M=^> 
if /i "%M%"=="lista" (call npm run --silent post -- --list & pause & exit /b 0)
call npm run --silent post -- "%M%"
echo.
echo Slajdy sa w folderze posts.
start "" posts
pause

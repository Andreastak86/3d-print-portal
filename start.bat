@echo off
REM Starter 3D Print Portal i produksjonsmodus.
REM Bygger automatisk første gang (eller hvis .next mangler).
cd /d "%~dp0"

if not exist ".env.local" (
  echo Fant ikke .env.local - kopierer fra .env.example
  copy .env.example .env.local >nul
)

if not exist ".next\BUILD_ID" (
  echo Bygger portalen ^(forste gang tar dette litt tid^)...
  call npm run build || goto :error
)

echo.
echo  3D Print Portal kjorer!
echo  Pa denne PC-en:     http://localhost:3000
echo  Fra andre enheter:  http://^<denne-PC-ens-IP^>:3000
echo  Lukk dette vinduet for a stoppe portalen.
echo.
call npm start
goto :eof

:error
echo Bygging feilet. Se feilmeldingen over.
pause

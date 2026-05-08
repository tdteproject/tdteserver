@echo off
setlocal
echo ==============================================
echo       PDT App Environment Switcher
echo ==============================================

set MODE=%1
if "%MODE%"=="" (
    echo Usage: switch-env.bat [local^|cloud]
    echo Defaulting to LOCAL mode...
    set MODE=local
)

echo.
echo [1/3] Terminating any existing backend or tunnel processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq pdt-backend*" >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1

echo [2/3] Setting Environment to: [ %MODE% ]
set APP_ENV=%MODE%

echo [3/3] Starting backend server...
pushd "%~dp0.."
title pdt-backend
npm run dev
popd

endlocal

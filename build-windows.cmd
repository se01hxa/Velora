@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 goto failed

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 or later is required. Install Node.js and open a new terminal.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Check your Node.js installation.
  exit /b 1
)

echo [1/3] Installing locked dependencies...
call npm ci --no-audit --no-fund
if errorlevel 1 goto failed

echo [2/3] Downloading the Electron runtime...
call node node_modules\electron\install.js
if errorlevel 1 goto failed

echo [3/3] Building the Windows installer...
call npm run dist
if errorlevel 1 goto failed

echo Build complete. Installer output: "%~dp0..\release"
exit /b 0

:failed
set "LUMA_BUILD_EXIT=%errorlevel%"
if "%LUMA_BUILD_EXIT%"=="0" set "LUMA_BUILD_EXIT=1"
echo Build failed. See the error above. Exit code: %LUMA_BUILD_EXIT%
exit /b %LUMA_BUILD_EXIT%

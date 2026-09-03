@echo off
setlocal EnableExtensions

if /I "%~1"=="--help" goto :usage

set "PROJECT_ROOT=%~dp0"
set "WEB_DIR=%PROJECT_ROOT%web"
set "DEV_HOST=127.0.0.1"
set "DEV_PORT=4000"

cd /d "%WEB_DIR%" || goto :bad_directory

where node.exe >nul 2>nul || goto :missing_node
where npm.cmd >nul 2>nul || goto :missing_node

rem A newly installed wasm-pack may not be visible until the terminal restarts.
if exist "%USERPROFILE%\.cargo\bin\wasm-pack.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

if not exist "node_modules\.bin\vite.cmd" (
  echo [Stabileo] Installing frontend dependencies...
  call npm ci || goto :failed
)

if /I "%~1"=="--rebuild-wasm" goto :build_wasm
if not exist "src\lib\wasm\dedaliano_engine.js" goto :build_wasm
if not exist "src\lib\wasm\dedaliano_engine_bg.wasm" goto :build_wasm
goto :start_dev

:build_wasm
where wasm-pack.exe >nul 2>nul || goto :missing_wasm_pack
echo [Stabileo] Building the Rust/WASM solver...
call npm run wasm || goto :failed

:start_dev
echo [Stabileo] Starting http://%DEV_HOST%:%DEV_PORT% ...
echo [Stabileo] Press Ctrl+C to stop the local server.
call npm run dev -- --host %DEV_HOST% --port %DEV_PORT% --strictPort --open
set "RUN_EXIT=%ERRORLEVEL%"
endlocal & exit /b %RUN_EXIT%

:usage
echo Usage:
echo   run-local.bat                 Start the local app.
echo   run-local.bat --rebuild-wasm  Rebuild the Rust/WASM solver, then start.
exit /b 0

:missing_node
echo [Stabileo] ERROR: Node.js or npm was not found in PATH.
goto :failed

:missing_wasm_pack
echo [Stabileo] ERROR: WASM output is missing and wasm-pack was not found in PATH.
echo Install it with: cargo install wasm-pack
goto :failed

:bad_directory
echo [Stabileo] ERROR: Cannot open "%WEB_DIR%".

:failed
echo.
echo [Stabileo] Local startup failed. Review the error above.
pause
endlocal & exit /b 1

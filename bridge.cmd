@echo off
setlocal DisableDelayedExpansion
if not defined DSH_PTY_CONSOLE_EXECUTABLE exit /b 127
set "ELECTRON_RUN_AS_NODE=1"
"%DSH_PTY_CONSOLE_EXECUTABLE%" %*
exit /b %errorlevel%

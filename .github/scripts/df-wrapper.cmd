@echo off
rem Windows entrypoint for DarkFactory. The binary owns every subcommand.
rem cmd.exe cannot detect an interactive terminal, so a bare df enters chat.
setlocal EnableExtensions

if not defined DF_BIN set "DF_BIN=%~dp0df-bin.exe"
if not exist "%DF_BIN%" (
    echo df: DarkFactory binary is not executable: %DF_BIN% 1>&2
    exit /b 127
)

if "%~1"=="" goto chat
"%DF_BIN%" %*
exit /b %ERRORLEVEL%

:chat
"%DF_BIN%" chat
exit /b %ERRORLEVEL%

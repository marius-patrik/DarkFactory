@echo off
rem df on PATH for cmd.exe and PowerShell, with the contract df-wrapper.sh implements: the
rem DarkFactory binary is %DF_BIN%, or df-bin.exe beside this wrapper; a bare `df` is `df chat`;
rem and a DarkFactory subcommand is passed to the DarkFactory binary.
rem
rem Two parts of the POSIX wrapper have no counterpart here, and neither is papered over. cmd.exe
rem cannot tell a terminal from a pipe, so a bare `df` is always treated as a person at a prompt.
rem And there is no /bin/df to hand an unrecognised argument to, so an argument this wrapper does
rem not implement is refused by name rather than silently captured from another tool that also
rem answers to `df`.
setlocal EnableExtensions

if not defined DF_BIN set "DF_BIN=%~dp0df-bin.exe"

if not exist "%DF_BIN%" (
    echo df: DarkFactory binary is not executable: %DF_BIN% 1>&2
    exit /b 127
)

if "%~1"=="" goto chat
if /I "%~1"=="chat" goto darkfactory
if /I "%~1"=="run" goto darkfactory
if /I "%~1"=="providers" goto darkfactory
if /I "%~1"=="models" goto darkfactory
if /I "%~1"=="accounts" goto darkfactory
if /I "%~1"=="account" goto darkfactory
if /I "%~1"=="login" goto darkfactory
if /I "%~1"=="logout" goto darkfactory
if /I "%~1"=="ask" goto darkfactory
if /I "%~1"=="help" goto darkfactory
goto unsupported

:chat
"%DF_BIN%" chat
exit /b %ERRORLEVEL%

:darkfactory
"%DF_BIN%" %*
exit /b %ERRORLEVEL%

:unsupported
echo df: %~1 is not a df command. 1>&2
echo df: commands: chat run providers models accounts account login logout ask help 1>&2
exit /b 2

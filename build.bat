@echo off

echo Compiling compiler
CALL tsc
if %errorlevel% neq 0 exit /b %errorlevel%

CALL node build\js\test
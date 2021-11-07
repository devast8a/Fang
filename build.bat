@echo off

echo Compiling grammar
CALL nearleyc src\parser\grammar\grammar.ne -o src\parser\grammar\grammar.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo Compiling compiler
CALL tsc
if %errorlevel% neq 0 exit /b %errorlevel%

CALL node build\js\test
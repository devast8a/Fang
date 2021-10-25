@echo off

echo Compiling grammar
CALL nearleyc src\parser\grammar\grammar.ne -o src\parser\grammar\grammar.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo Compiling compiler
CALL tsc
if %errorlevel% neq 0 exit /b %errorlevel%

REM CALL node build\js\test

echo Compiling test.fang
CALL node build\js\cli examples/test.fang -o build/test.c
if %errorlevel% neq 0 exit /b %errorlevel%

echo ================================================================================
type build\test.c
echo ================================================================================

echo Running C compiler
CALL cc build\test.c -o build\test.exe
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running test.exe
build\test.exe
if %errorlevel% neq 0 exit /b %errorlevel%
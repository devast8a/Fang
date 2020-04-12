@echo off

echo Compiling grammar
CALL nearleyc src\grammar.ne -o src\grammar.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo Compiling compiler
CALL tsc
if %errorlevel% neq 0 exit /b %errorlevel%

echo Compiling test.fang
CALL node build\js\compile test.fang -o build\test.c
if %errorlevel% neq 0 exit /b %errorlevel%
CALL cc build\test.c -o build\test.exe
if %errorlevel% neq 0 exit /b %errorlevel%

echo Running test.exe
build\test.exe
if %errorlevel% neq 0 exit /b %errorlevel%

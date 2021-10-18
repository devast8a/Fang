@echo off

echo Compiling grammar
CALL nearleyc src\parser\grammar\grammar.ne -o src\parser\grammar\grammar.ts
if %errorlevel% neq 0 exit /b %errorlevel%

echo Compiling compiler
CALL tsc
if %errorlevel% neq 0 exit /b %errorlevel%

CALL node build\js\test

REM echo Compiling test.fang
REM CALL node build\js\cli examples/multiples-of-3-or-5.fang -o build/test.c
REM if %errorlevel% neq 0 exit /b %errorlevel%
REM 
REM echo ================================================================================
REM type build\test.c
REM echo ================================================================================
REM 
REM echo Running C compiler
REM CALL cc build\test.c -o build\test.exe
REM if %errorlevel% neq 0 exit /b %errorlevel%
REM 
REM echo Running test.exe
REM build\test.exe
REM if %errorlevel% neq 0 exit /b %errorlevel%
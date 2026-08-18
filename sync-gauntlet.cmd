@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo.
echo ========================================
echo        Gauntlet Repository Sync
echo ========================================
echo.

set "GIT=C:\Program Files\Git\cmd\git.exe"

if not exist "%GIT%" (
    echo ERROR: Git was not found at:
    echo %GIT%
    pause
    exit /b 1
)

echo Git: "%GIT%"
echo.

REM Verify this is a Git repository
"%GIT%" rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERROR: This file is not inside a Git repository.
    pause
    exit /b 1
)

REM Determine current branch
for /f "delims=" %%B in ('"%GIT%" branch --show-current') do set "BRANCH=%%B"

if "%BRANCH%"=="" (
    echo ERROR: Repository is in detached HEAD state.
    pause
    exit /b 1
)

echo Branch: %BRANCH%
echo.

REM Stage all local changes
echo [1/4] Staging local changes...
"%GIT%" add -A
if errorlevel 1 goto :error

REM Check whether anything needs committing
"%GIT%" diff --cached --quiet
if errorlevel 2 goto :error
if errorlevel 1 goto :commit

echo [2/4] No local changes to commit.
goto :fetch

:commit
echo [2/4] Committing local changes...

if "%~1"=="" (
    "%GIT%" commit -m "Local sync %date% %time%"
) else (
    "%GIT%" commit -m "%~1"
)

if errorlevel 1 goto :error

:fetch
echo.
echo [3/4] Fetching latest changes from GitHub...
"%GIT%" fetch origin
if errorlevel 1 goto :error

REM Check whether this branch already exists remotely
"%GIT%" show-ref --verify --quiet "refs/remotes/origin/%BRANCH%"

if errorlevel 1 (
    echo Remote branch origin/%BRANCH% does not exist yet.
    echo It will be created when pushed.
    goto :push
)

echo Rebasing local branch onto origin/%BRANCH%...
"%GIT%" rebase "origin/%BRANCH%"

if errorlevel 1 (
    echo.
    echo ========================================
    echo             MERGE CONFLICT
    echo ========================================
    echo.
    echo Git found conflicting local and remote changes.
    echo Nothing has been discarded.
    echo.
    echo Resolve the conflicts, then run:
    echo.
    echo   "C:\Program Files\Git\cmd\git.exe" add -A
    echo   "C:\Program Files\Git\cmd\git.exe" rebase --continue
    echo.
    echo Or cancel with:
    echo.
    echo   "C:\Program Files\Git\cmd\git.exe" rebase --abort
    echo.
    pause
    exit /b 1
)

:push
echo.
echo [4/4] Pushing to GitHub...
"%GIT%" push -u origin "%BRANCH%"
if errorlevel 1 goto :error

echo.
echo ========================================
echo              SYNC COMPLETE
echo ========================================
echo.

"%GIT%" status --short --branch

echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo              SYNC FAILED
echo ========================================
echo.
echo Git reported an error.
echo No automatic cleanup was attempted.
echo.
pause
exit /b 1
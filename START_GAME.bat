@echo off
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 launch.py
  goto end
)
where python >nul 2>nul
if not errorlevel 1 (
  python launch.py
  goto end
)
echo Python 3 is required. Install it from python.org, then try again.
:end
pause

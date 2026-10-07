@echo off
rem Starts the Face Puppet server and opens it in its OWN Edge instance, built for streaming:
rem  - a separate profile (kept in .presenter-profile), so it is independent of your normal Edge windows
rem    where you can join Discord/Meet without the two fighting over settings
rem  - background/occlusion throttling switched off, so the picture keeps animating when another window
rem    (like your Discord call) is on top of it. Without this Edge freezes hidden windows.
rem  - app mode: a plain window with no tabs or address bar, which is cleaner for OBS Window Capture
cd /d "%~dp0"

set EDGE="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE% set EDGE="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

start "Face Puppet server" /min python -m http.server 8000
timeout /t 2 /nobreak >nul

start "" %EDGE% --user-data-dir="%~dp0.presenter-profile" --app=http://localhost:8000/ ^
  --disable-features=CalculateNativeWinOcclusion ^
  --disable-backgrounding-occluded-windows ^
  --disable-renderer-backgrounding ^
  --disable-background-timer-throttling ^
  --no-first-run --no-default-browser-check

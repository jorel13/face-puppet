@echo off
rem Starts the local server for Face Puppet and opens it in your default browser.
rem Keep this window open while you stream. Close it to stop the server.
cd /d "%~dp0"
start "" http://localhost:8000/
python -m http.server 8000

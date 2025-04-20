@echo off
:: Opens two new Command Prompt windows.

:: install the backend Flask server
start cmd /k "cd backend && pip install -r requirements.txt"

:: install the frontend Node server
start cmd /k "cd frontend && npm install"

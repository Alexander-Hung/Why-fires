@echo off
:: Opens two new Command Prompt windows.

:: Launch the backend Flask server
start cmd /k "cd backend && python app.py"

:: Launch the frontend Node server
start cmd /k "cd frontend && npm start"

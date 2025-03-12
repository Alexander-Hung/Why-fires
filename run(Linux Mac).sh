#!/usr/bin/env bash

# Detect OS using 'uname'
OS=$(uname)

if [ "$OS" = "Darwin" ]; then
  # macOS: Use AppleScript to open new Terminal tabs/windows
  osascript -e 'tell application "Terminal" to do script "cd \"'$PWD'/backend\" && python app.py"'
  osascript -e 'tell application "Terminal" to do script "cd \"'$PWD'/frondend\" && node app.js"'

elif [ "$OS" = "Linux" ]; then
  # Linux: Use gnome-terminal (or x-terminal-emulator) if installed
  gnome-terminal -- bash -c "cd backend && python app.py; exec bash"
  gnome-terminal -- bash -c "cd frondend && node app.js; exec bash"

else
  echo "Unsupported OS. Please open two terminals manually:"
  echo "  1) cd backend && python app.py"
  echo "  2) cd frondend && node app.js"
fi

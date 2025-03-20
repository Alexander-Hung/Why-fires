#!/usr/bin/env bash
#
# setup.sh
# Use this script to set up both backend and frontend requirements.

# Exit on errors
set -e

echo "Creating or activating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Installing Node.js dependencies for the frontend..."
cd frontend
npm install

echo "Setup complete!"

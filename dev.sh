#!/usr/bin/env bash
# dev.sh — Start backend + frontend dev servers concurrently
set -e

# Check for .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — add your ANTHROPIC_API_KEY before continuing."
  exit 1
fi

# Check for Python venv
if [ ! -d .venv ]; then
  echo "Creating Python virtual environment..."
  python -m venv .venv
fi

source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate

# Install Python deps
pip install -e ".[dev]" -q

# Install frontend deps
if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo ""
echo "Starting Obscura..."
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""

# Run both concurrently
trap 'kill %1 %2 2>/dev/null' EXIT

uvicorn backend.main:app --reload --port 8000 &
cd frontend && npm run dev &

wait

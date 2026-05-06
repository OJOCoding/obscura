@echo off
REM dev.bat — Start Obscura backend + frontend on Windows

IF NOT EXIST .env (
  copy .env.example .env
  echo Created .env from .env.example — add your ANTHROPIC_API_KEY before continuing.
  pause
  exit /b 1
)

IF NOT EXIST .venv (
  echo Creating Python virtual environment...
  python -m venv .venv
)

call .venv\Scripts\activate.bat

pip install -e ".[dev]" -q

IF NOT EXIST frontend\node_modules (
  echo Installing frontend dependencies...
  cd frontend
  npm install
  cd ..
)

echo.
echo Starting Obscura...
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.

start "Obscura Backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn backend.main:app --reload --port 8000"
start "Obscura Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers starting in separate windows.
pause

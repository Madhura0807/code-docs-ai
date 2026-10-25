@echo off
echo Starting Code Docs AI...
echo.

REM Set Groq API Key (replace with your actual key)
set GROQ_API_KEY=your_groq_api_key_here

REM Start Backend
echo Starting FastAPI backend on http://localhost:8000...
start "Code Docs AI Backend" cmd /k "cd /d %~dp0 && .venv\Scripts\python backend\main.py"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo Starting Next.js frontend on http://localhost:3000...
start "Code Docs AI Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo Code Docs AI is starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window (backend and frontend will continue running)...
pause >nul

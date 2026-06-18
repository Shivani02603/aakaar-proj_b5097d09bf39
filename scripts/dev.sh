#!/bin/bash
set -euo pipefail

echo "Starting backend in the background..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting frontend dev server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Development servers started. Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both servers."

trap 'kill $BACKEND_PID $FRONTEND_PID; echo "Servers stopped."' INT TERM
wait
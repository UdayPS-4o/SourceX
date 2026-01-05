#!/bin/bash

# Kill running instances if any (optional, be careful)
pkill -f "node src/main.js"

# Ensure backend/logs directory exists
mkdir -p backend/logs

echo "Starting Server and Monitor..."

# Start Server
nohup node backend/src/main.js server > backend/logs/server.log 2>&1 &
SERVER_PID=$!
echo "Server started (PID: $SERVER_PID). Logs: backend/logs/server.log"

# Start Monitor
nohup node backend/src/main.js monitor > backend/logs/monitor.log 2>&1 &
MONITOR_PID=$!
echo "Monitor started (PID: $MONITOR_PID). Logs: backend/logs/monitor.log"

echo "Both processes running in background."

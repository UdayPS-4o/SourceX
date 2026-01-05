#!/bin/bash

# Kill running instances if any (optional, be careful)
pkill -f "node src/main.js"

echo "Starting Server and Monitor..."

# Start Server
nohup node src/main.js server > logs/server.log 2>&1 &
SERVER_PID=$!
echo "Server started (PID: $SERVER_PID). Logs: logs/server.log"

# Start Monitor
nohup node src/main.js monitor > logs/monitor.log 2>&1 &
MONITOR_PID=$!
echo "Monitor started (PID: $MONITOR_PID). Logs: logs/monitor.log"

echo "Both processes running in background."

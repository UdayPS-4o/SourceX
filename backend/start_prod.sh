#!/bin/bash

# Kill running instances if any (optional, be careful)
pkill -f "node src/main.js"

# Ensure backend/logs directory exists
mkdir -p backend/logs

echo "Starting Server and Monitor..."

# Start Server (Requires Sudo for Port 80)
sudo PORT=80 nohup node backend/src/main.js server > backend/logs/server.log 2>&1 &
SERVER_PID=$!
echo "Server started with SUDO (PID: $SERVER_PID). Logs: backend/logs/server.log"

# Ensure backend/logs directory exists
mkdir -p backend/logs

echo "Starting Server and Monitor (Port 80)..."

# Start Server (Requires Sudo for Port 80)
# We use 'sudo -b' (background) or just sudo inside nohup?
# "nohup sudo ..." works better.
sudo PORT=80 nohup node backend/src/main.js server > backend/logs/server.log 2>&1 &
SERVER_PID=$!
echo "Server started with SUDO (PID: $SERVER_PID). Logs: backend/logs/server.log"

# Start Monitor (Normal user is fine, but for consistency lets keep it separate or same?)
# Monitor doesn't need port 80, so run as normal user to avoid permission issues with other files?
# But if they share code/db, usually fine. Let's run monitor as normal user to be safe.
nohup node backend/src/main.js monitor > backend/logs/monitor.log 2>&1 &
MONITOR_PID=$!
echo "Monitor started (PID: $MONITOR_PID). Logs: backend/logs/monitor.log"

echo "✅ Deployment Complete. Server is on Port 80."

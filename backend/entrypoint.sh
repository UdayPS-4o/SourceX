#!/bin/sh

# Ensure logs directory exists
mkdir -p logs

# Start monitor in background, redirecting stdout/stderr to monitor.log
# We use stdbuf/unbuffer if available to avoid buffering, but node is usually okay.
# Using '>>' to append if container restarts? Or '>' to truncate?
# User wants "sync.log as well as sync log".
# monitor.log will capture the console output of the monitor process.
echo "[Entrypoint] Starting Monitor..."
npm run monitor > logs/monitor.log 2>&1 &

# Start API Server
echo "[Entrypoint] Starting Server..."
exec npm start

#!/bin/bash

echo "Stopping sourcex processes..."
pkill -f "node backend/src/main.js"
echo "Stopped."

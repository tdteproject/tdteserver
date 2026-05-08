#!/bin/bash

echo "=============================================="
echo "      PDT App Environment Switcher"
echo "=============================================="

MODE=${1:-local}

echo ""
echo "[1/3] Terminating any existing tunnel processes..."
pkill -f cloudflared || true
# Note: we do not pkill node globally on mac/linux to avoid killing unrelated apps. 
# They will be stopped via standard Ctrl+C.

echo "[2/3] Setting Environment to: [ $MODE ]"
export APP_ENV=$MODE

echo "[3/3] Starting backend server..."
cd "$(dirname "$0")/.."
npm run dev

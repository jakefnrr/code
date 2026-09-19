#!/bin/bash
echo "Starting GreenChat..."
echo ""

# Start the server in the background
/Users/jake/.nvm/versions/node/v26.9.0/bin/node server.js &
SERVER_PID=$!

sleep 2

echo ""
echo "================================"
echo "  GreenChat is running!"
echo "================================"
echo ""
echo "Local:  http://localhost:3000"
echo ""

# Start localtunnel to get a public URL
echo "Creating public URL (no signup needed)..."
echo ""
/Users/jake/.nvm/versions/node/v26.9.0/bin/npx localtunnel --port 3000 2>&1 &
TUNNEL_PID=$!

echo ""
echo "Share the URL below with anyone in the world:"
echo "(They just open it in their browser)"
echo ""
echo "Press Ctrl+C to stop everything."
echo ""

# Wait for Ctrl+C
trap "kill $SERVER_PID $TUNNEL_PID 2>/dev/null; exit" INT TERM
wait

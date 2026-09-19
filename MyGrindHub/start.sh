#!/bin/bash
cd "$(dirname "$0")/.."
echo "Starting Grind Hub server..."
echo "Open http://localhost:8080/MyGrindHub/index.html in your browser"
echo "Press Ctrl+C to stop."
python3 -m http.server 8080

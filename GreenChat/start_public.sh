#!/bin/bash -e
cd "$(dirname "$0")"
mkdir -p logs
SERVER_PID_FILE=logs/server.pid
TUNNEL_PID_FILE=logs/tunnel.pid
URL_FILE=logs/public_url.txt

ensure_cloudflared() {
  if [ -x ./cloudflared/cloudflared ]; then
    return
  fi
  echo "Downloading cloudflared binary (one-time)..."
  mkdir -p cloudflared
  ARCH=$(uname -m)
  case "$ARCH" in
    arm64) CFGZ=cloudflared-darwin-arm64.tgz ;;
    amd64|x86_64) CFGZ=cloudflared-darwin-amd64.tgz ;;
    *)
      echo "Unsupported architecture: $ARCH"
      exit 1
      ;;
  esac
  curl -sL --max-time 120 -o cloudflared/$CFGZ "https://github.com/cloudflare/cloudflared/releases/latest/download/$CFGZ"
  tar -xzf cloudflared/$CFGZ -C cloudflared
  chmod +x cloudflared/cloudflared
  rm -f cloudflared/$CFGZ
}
ensure_cloudflared

server_pids() {
  lsof -tiTCP:8123 -sTCP:LISTEN 2>/dev/null || true
}

stop() {
  if [ -f "$TUNNEL_PID_FILE" ]; then
    kill "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null || true
    rm -f "$TUNNEL_PID_FILE"
  fi
  for pid in $(server_pids); do
    kill "$pid" 2>/dev/null || true
  done
  rm -f "$SERVER_PID_FILE"
  echo "Stopped."
}

if [ "$1" = "stop" ]; then
  stop
  exit 0
fi

stop

if [ -n "$(server_pids)" ]; then
  echo "GreenChat server already running."
else
  nohup python3 greenchat_server.py > logs/server.log 2>&1 &
  echo $! > "$SERVER_PID_FILE"
  echo "Started GreenChat server (pid $(cat "$SERVER_PID_FILE"))."
fi
sleep 1

./cloudflared/cloudflared tunnel --no-autoupdate --url http://localhost:8123 > logs/tunnel.log 2>&1 &
echo $! > "$TUNNEL_PID_FILE"
echo "Starting public tunnel... (up to ~30 seconds)"

URL=""
for i in $(seq 1 40); do
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" logs/tunnel.log | head -1 || true)
  if [ -n "$URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Could not detect the public URL yet. Check logs/tunnel.log."
  tail -20 logs/tunnel.log
  exit 1
fi

printf '%s\n' "$URL" > "$URL_FILE"
echo ""
echo "=============================================="
echo "  GreenChat is now LIVE for the whole world!"
echo "  Share this link: $URL"
echo ""
echo "  Sign up once, then add friends by name or"
echo "  their 3-digit code. Works on any device."
echo "=============================================="
echo ""
echo "Local-only URL: http://localhost:8123"
echo ""
echo "Notes:"
echo "  - Keep this Mac on, awake, and online."
echo "  - The tunnel link changes if you restart."
echo "  - Restart anytime with: bash start_public.sh"
echo "  - Take it down with:   bash start_public.sh stop"

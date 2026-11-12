#!/usr/bin/env bash
# Runs the image hardened as in production and checks pages, static files and logging.
set -euo pipefail

image=$1
base=http://127.0.0.1:8000

cleanup() {
  docker logs smoke || true
  docker rm -f smoke >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name smoke \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  -p 127.0.0.1:8000:8000 \
  "$image"

curl -fsS --retry 20 --retry-all-errors --retry-delay 1 -o /dev/null "$base/"
for path in /game /about /favicon.ico /static/css/style.css; do
  curl -fsS -o /dev/null "$base$path"
done

card=$(curl -fsS "$base/game" | sed -n 's|.*\(/static/images/[^"]*\).*|\1|p')
curl -fsS -D - -o /dev/null "$base$card" | grep -qi '^cache-control:.*immutable'

if docker logs smoke 2>&1 | grep -q '"GET '; then
  echo "requests were logged" >&2
  exit 1
fi

echo "smoke test passed"

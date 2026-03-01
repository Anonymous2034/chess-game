#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="195.201.28.115"
REMOTE_DIR="/opt/grandmasters"
SSH_KEY="$HOME/.ssh/hetzner_omnex"

echo "==> Syncing server/ to ${REMOTE_HOST}:${REMOTE_DIR}/"
rsync -avz --delete \
  --exclude node_modules \
  --exclude dist \
  -e "ssh -i ${SSH_KEY}" \
  "$(dirname "$0")/" "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> Building and starting containers"
ssh -i "${SSH_KEY}" "${REMOTE_HOST}" "cd ${REMOTE_DIR} && docker compose build && docker compose up -d"

echo "==> Deploy complete"

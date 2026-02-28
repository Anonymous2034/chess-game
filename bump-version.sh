#!/bin/bash
# Bump cache version in sw.js, index.html CSS and JS references
# Usage: ./bump-version.sh [version_number]
#   e.g. ./bump-version.sh 156

set -e
cd "$(dirname "$0")"

if [ -z "$1" ]; then
  # Auto-detect current version from sw.js and increment
  CURRENT=$(grep -oP 'grandmasters-v\K\d+' sw.js)
  NEW=$((CURRENT + 1))
else
  NEW="$1"
fi

echo "Bumping to v${NEW}..."

# sw.js cache name
sed -i '' "s/grandmasters-v[0-9]*/grandmasters-v${NEW}/" sw.js

# index.html CSS and JS version params
sed -i '' "s/style\.css?v=[0-9]*/style.css?v=${NEW}/" index.html
sed -i '' "s/main\.js?v=[0-9]*/main.js?v=${NEW}/" index.html

echo "Done. Updated:"
grep 'CACHE_NAME' sw.js
grep 'style.css' index.html | head -1 | xargs
grep 'main.js' index.html | head -1 | xargs

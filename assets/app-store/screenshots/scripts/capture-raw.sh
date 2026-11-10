#!/usr/bin/env bash
set -euo pipefail

# Captures only the running app. It never seeds, signs in, or changes data.
# Usage: ./capture-raw.sh <simulator-udid> <screen-name>
udid=${1:?"simulator UDID required"}
screen=${2:?"screen name required (dashboard|expenses|reports|vehicle|reminders|documents|garage)"}
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/raw"
xcrun simctl io "$udid" screenshot --type=png "$root/raw/${screen}.png"
sips -g pixelWidth -g pixelHeight -g hasAlpha "$root/raw/${screen}.png"

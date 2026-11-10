#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
target=${1:?"target required: iphone or ipad"}
case "$target" in iphone) expected="1206 2622";; ipad) expected="2064 2752";; *) exit 64;; esac
set -- $expected; width=$1; height=$2
files=("$root/final/$target"/*.png)
[[ ${#files[@]} -eq 7 ]] || { echo "Expected exactly seven $target PNGs" >&2; exit 1; }
for file in "${files[@]}"; do
  metadata=$(sips -g pixelWidth -g pixelHeight -g hasAlpha "$file")
  echo "$metadata"
  grep -q "pixelWidth: $width" <<<"$metadata" && grep -q "pixelHeight: $height" <<<"$metadata" || { echo "Wrong dimensions: $file" >&2; exit 1; }
  grep -q "hasAlpha: no" <<<"$metadata" || { echo "Transparency found: $file" >&2; exit 1; }
done

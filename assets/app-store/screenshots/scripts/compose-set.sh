#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
target=${1:?"target required: iphone or ipad"}
case "$target" in
  iphone) width=1206; height=2622 ;;
  ipad) width=2064; height=2752 ;;
  *) echo "target must be iphone or ipad" >&2; exit 64 ;;
esac
mkdir -p "$root/final/$target"
names=(dashboard expenses reports vehicle reminders documents garage)
headlines=("Your car. Everything in one place." "Know exactly what your car costs." "Turn expenses into insights." "All your vehicle details, organized." "Stay ahead of maintenance." "Keep important documents close." "Manage vehicles together.")
for i in "${!names[@]}"; do
  raw="$root/raw/${names[$i]}-${target}.png"
  [[ -f "$raw" ]] || { echo "Missing authentic raw capture: $raw" >&2; exit 1; }
  swift "$root/scripts/compose.swift" "$raw" "$root/final/$target/$(printf '%02d' $((i+1)))-${names[$i]}.png" "${headlines[$i]}" "$width" "$height"
done

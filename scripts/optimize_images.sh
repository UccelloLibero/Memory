#!/bin/bash
# Turns full-size images in originals/ into small square card images in static/images/.
# Runs automatically on git commit (see .githooks/pre-commit), or by hand:
#   ./scripts/optimize_images.sh          only new or changed images
#   ./scripts/optimize_images.sh --all    redo every image
# Prints the path of each image it writes. Uses sips, which is built into macOS.

set -euo pipefail

SIZE=600      # Cards display at up to 170px; 600px stays sharp on 3x screens
QUALITY=80    # JPEG quality

FORCE=false
[ "${1:-}" = "--all" ] && FORCE=true

cd "$(dirname "$0")/.."
mkdir -p static/images

# Images listed here keep their whole picture instead of being cropped square
FIT_LIST=scripts/fit_images.txt
should_fit() {
    [ -f "$FIT_LIST" ] && grep -qx "$1" "$FIT_LIST"
}

shopt -s nullglob nocaseglob
for src in originals/*.{jpg,jpeg,png,heic,webp}; do
    name="$(basename "${src%.*}").jpg"
    out="static/images/$name"

    # Skip images that are already up to date (changing the fit list also counts as a change)
    if ! $FORCE && [ "$out" -nt "$src" ] && { [ ! -f "$FIT_LIST" ] || [ "$out" -nt "$FIT_LIST" ]; }; then
        continue
    fi

    if should_fit "$(basename "${src%.*}")"; then
        # Scale the longer side to SIZE and keep the whole picture
        sips -s format jpeg -s formatOptions "$QUALITY" -Z "$SIZE" "$src" --out "$out" > /dev/null
        echo "$out"
        continue
    fi

    width=$(sips -g pixelWidth "$src" | awk '/pixelWidth/ {print $2}')
    height=$(sips -g pixelHeight "$src" | awk '/pixelHeight/ {print $2}')

    # Scale the shorter side to SIZE, then crop the center square (matches the card's cover crop)
    if [ "$width" -lt "$height" ]; then
        sips -s format jpeg -s formatOptions "$QUALITY" --resampleWidth "$SIZE" "$src" --out "$out" > /dev/null
    else
        sips -s format jpeg -s formatOptions "$QUALITY" --resampleHeight "$SIZE" "$src" --out "$out" > /dev/null
    fi
    sips --cropToHeightWidth "$SIZE" "$SIZE" "$out" > /dev/null

    echo "$out"
done

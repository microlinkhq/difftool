#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SOURCE=app/icon.svg
TIGHT_VIEWBOX='-1.16 -7.56 46 46'
PADDED_VIEWBOX='-14.16 -20.56 72 72'
BACKGROUND='#ffffff'
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

for tool in rsvg-convert magick; do
  command -v "$tool" >/dev/null || { echo "missing $tool (brew install librsvg imagemagick)" >&2; exit 1; }
done

grep -q "viewBox=\"$TIGHT_VIEWBOX\"" "$SOURCE" || { echo "$SOURCE viewBox changed; update TIGHT_VIEWBOX" >&2; exit 1; }
sed "s/viewBox=\"$TIGHT_VIEWBOX\"/viewBox=\"$PADDED_VIEWBOX\"/" "$SOURCE" > "$WORK/padded.svg"

for size in 16 32 48; do
  rsvg-convert -w "$size" -h "$size" "$SOURCE" -o "$WORK/favicon-$size.png"
done
magick "$WORK"/favicon-16.png "$WORK"/favicon-32.png "$WORK"/favicon-48.png app/favicon.ico

padded_png() {
  rsvg-convert -w "$1" -h "$1" -b "$BACKGROUND" "$WORK/padded.svg" -o "$2"
  magick "$2" -strip -define png:exclude-chunks=date,time "$2"
}

padded_png 180 app/apple-icon.png
padded_png 192 public/icon-192.png
padded_png 512 public/icon-512.png

echo "icons written from $SOURCE"

#!/bin/bash
# Pimped.io Hospital Pixel Art Asset Downloader & Organizer
# Run: chmod +x download-assets.sh && ./download-assets.sh

set -e

ASSETS_DIR="/Users/chetdholakiya/pimped/assets"

# Create directory structure
mkdir -p "$ASSETS_DIR/soppycraft-hospital"
mkdir -p "$ASSETS_DIR/silverteacup-hospital"
mkdir -p "$ASSETS_DIR/thirdangle-hospital"
mkdir -p "$ASSETS_DIR/opengameart-medical-items"
mkdir -p "$ASSETS_DIR/opengameart-medicine-pack"
mkdir -p "$ASSETS_DIR/opengameart-hospital-topdown"
mkdir -p "$ASSETS_DIR/opengameart-hospital-room"
mkdir -p "$ASSETS_DIR/opengameart-doctors-office"
mkdir -p "$ASSETS_DIR/opengameart-medical-examiner"

echo "=== Downloading Itch.io Packs ==="

# 1. Soppycraft Hospital Top-Down Pixel Pack (Free - name your price at $0)
# Must be downloaded manually from: https://soppycraft.itch.io/top-down-hospital
# Click "Download Now" > "No thanks, just take me to the downloads" > "Download"
# File: topdown_hospital_Assets.zip (51 kB)
echo "[INFO] Soppycraft pack must be downloaded manually from:"
echo "       https://soppycraft.itch.io/top-down-hospital"
echo "       Save to: $ASSETS_DIR/soppycraft-hospital/"

# 2. SilverTeaCup Hospital Isometric (Free - name your price at $0)
# Must be downloaded manually from: https://silverteacup.itch.io/asset-pack-hospital-isometric-pixelart
# File: Assets Pixel Art - Hospital.zip (117 kB)
echo "[INFO] SilverTeaCup pack must be downloaded manually from:"
echo "       https://silverteacup.itch.io/asset-pack-hospital-isometric-pixelart"
echo "       Save to: $ASSETS_DIR/silverteacup-hospital/"

# 3. ThirdAngle Hospital Pack - PAID ($4.99) - SKIPPED
echo "[SKIP] ThirdAngle Hospital Pack costs \$4.99 - not free"
echo "       https://thirdangle.itch.io/hospital-pack"

echo ""
echo "=== Downloading OpenGameArt Packs (CC0 / Free) ==="

# 4. 32px Medical Items
echo "Downloading 32px Medical Items..."
curl -L -o "$ASSETS_DIR/opengameart-medical-items/medical_items_32x32.zip" \
  "https://opengameart.org/sites/default/files/medical_items_32x32.zip"
curl -L -o "$ASSETS_DIR/opengameart-medical-items/medical_items_sheet.png" \
  "https://opengameart.org/sites/default/files/medical_items_sheet_0.png"
cd "$ASSETS_DIR/opengameart-medical-items" && unzip -o medical_items_32x32.zip && cd -
echo "  Done: bandage, first-aid kit, surgical mask, pill (32x32)"

# 5. Medicine Pack 16x16
echo "Downloading Medicine Pack 16x16..."
curl -L -o "$ASSETS_DIR/opengameart-medicine-pack/medicine_pack.png" \
  "https://opengameart.org/sites/default/files/medicine_pack.png"
echo "  Done: medicine pack sprites (16x16)"

# 6. Hospital TopDown perspective 2D pixel art
echo "Downloading Hospital TopDown 2D pixel art..."
curl -L -o "$ASSETS_DIR/opengameart-hospital-topdown/PixelArt.zip" \
  "https://opengameart.org/sites/default/files/PixelArt.zip"
cd "$ASSETS_DIR/opengameart-hospital-topdown" && unzip -o PixelArt.zip && cd -
echo "  Done: hospital top-down pixel art (corridors, rooms, equipment)"

# 7. Hospital Room (SVG)
echo "Downloading Hospital Room SVG..."
curl -L -o "$ASSETS_DIR/opengameart-hospital-room/hospital.svg" \
  "https://opengameart.org/sites/default/files/hostpital.svg"
echo "  Done: hospital room vector art"

# 8. Futuristic Doctor's Office
echo "Downloading Futuristic Doctor's Office..."
curl -L -o "$ASSETS_DIR/opengameart-doctors-office/inside.zip" \
  "https://opengameart.org/sites/default/files/inside.zip"
cd "$ASSETS_DIR/opengameart-doctors-office" && unzip -o inside.zip && cd -
echo "  Done: futuristic doctor's office tileset"

# 9. Medical Examiner sprites (male + female) - doctor/nurse walking animations
echo "Downloading Medical Examiner sprites..."
curl -L -o "$ASSETS_DIR/opengameart-medical-examiner/lablady_spritesheet_BOXED.png" \
  "https://opengameart.org/sites/default/files/lablady_spritesheet_BOXED_0.png"
curl -L -o "$ASSETS_DIR/opengameart-medical-examiner/labman_sheet_0.png" \
  "https://opengameart.org/sites/default/files/labman_sheet_0.png"
curl -L -o "$ASSETS_DIR/opengameart-medical-examiner/labman_sheet_1.png" \
  "https://opengameart.org/sites/default/files/labman_sheet_1.png"
echo "  Done: medical examiner character sprites (male + female, walking animations)"

echo ""
echo "=== Moving Playwright browser downloads (if they exist) ==="
# Check common Playwright download locations
for dir in "$HOME/Downloads" "/tmp" "$HOME/.cache/playwright-mcp"; do
  if [ -f "$dir/topdown_hospital_Assets.zip" ] || [ -f "$dir/topdown-hospital-Assets.zip" ]; then
    cp "$dir"/topdown*hospital*.zip "$ASSETS_DIR/soppycraft-hospital/" 2>/dev/null && echo "  Moved Soppycraft zip from $dir"
  fi
  if [ -f "$dir/Assets Pixel Art - Hospital.zip" ] || [ -f "$dir/Assets-Pixel-Art---Hospital.zip" ]; then
    cp "$dir"/Assets*Pixel*Art*Hospital*.zip "$ASSETS_DIR/silverteacup-hospital/" 2>/dev/null && echo "  Moved SilverTeaCup zip from $dir"
  fi
done

echo ""
echo "=== Unzipping itch.io packs (if present) ==="
if ls "$ASSETS_DIR/soppycraft-hospital/"*.zip 1>/dev/null 2>&1; then
  cd "$ASSETS_DIR/soppycraft-hospital" && unzip -o *.zip && cd -
  echo "  Extracted Soppycraft pack"
fi
if ls "$ASSETS_DIR/silverteacup-hospital/"*.zip 1>/dev/null 2>&1; then
  cd "$ASSETS_DIR/silverteacup-hospital" && unzip -o *.zip && cd -
  echo "  Extracted SilverTeaCup pack"
fi

echo ""
echo "=== Summary ==="
echo "Assets directory: $ASSETS_DIR"
echo ""
find "$ASSETS_DIR" -type f | sort | while read f; do
  size=$(du -h "$f" | cut -f1)
  echo "  $size  ${f#$ASSETS_DIR/}"
done
echo ""
echo "Total size:"
du -sh "$ASSETS_DIR"
echo ""
echo "Done! Assets organized in $ASSETS_DIR"
echo ""
echo "LICENSES:"
echo "  - Soppycraft: Free for personal/commercial use, no redistribution of pack"
echo "  - SilverTeaCup: Free (name your price), check itch.io page for terms"
echo "  - OpenGameArt items: CC0 (public domain)"
echo "  - Medical Examiner sprites: Check OGA page for specific license"
echo "  - Futuristic Doctor's Office: Check OGA page for specific license"

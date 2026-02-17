#!/bin/bash
set -e

# Configuration
MODEL_BASE="https://hf-mirror.com"
DEST_BASE="public/assets/models/onnx-community"
MODEL_ID="lama-fp16-onnx"
TARGET_DIR="$DEST_BASE/$MODEL_ID"

echo "Downloading LaMa Inpainting Model..."
echo "Target: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

# File list for LaMa
FILES=(
    "config.json"
    "preprocessor_config.json"
    "model.onnx"
    "model_quantized.onnx"
)

for FILE in "${FILES[@]}"; do
    if [ ! -s "$TARGET_DIR/$FILE" ]; then
        echo "   [GET] $FILE"
        curl -L "$MODEL_BASE/onnx-community/$MODEL_ID/resolve/main/$FILE" -o "$TARGET_DIR/$FILE" || echo "   [WARN] Failed to download $FILE (might not exist)"
    else
        echo "   [SKIP] $FILE exists"
    fi
done

echo "LaMa Download Complete."

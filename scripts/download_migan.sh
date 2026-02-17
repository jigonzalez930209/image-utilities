#!/bin/bash
set -e

# Configuration
MODEL_BASE="https://hf-mirror.com"
DEST_BASE="public/assets/models/anyisalin"
MODEL_ID="migan-onnx"
TARGET_DIR="$DEST_BASE/$MODEL_ID"

echo "Downloading MI-GAN (Mobile Inpainting GAN) ONNX Model..."
echo "Target: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

# File list for MI-GAN
# Repo: anyisalin/migan-onnx
# config.json is in root
# model.onnx is in onnx/ subdirectory

# 1. Download config.json
if [ ! -s "$TARGET_DIR/config.json" ]; then
    echo "   [GET] config.json"
    curl -L "https://hf-mirror.com/anyisalin/$MODEL_ID/resolve/main/config.json" -o "$TARGET_DIR/config.json" --fail || echo "   [WARN] Failed to download config.json"
else
    echo "   [SKIP] config.json exists"
fi

# 2. Download preprocessor_config.json (might not exist, but let's try)
if [ ! -s "$TARGET_DIR/preprocessor_config.json" ]; then
    echo "   [GET] preprocessor_config.json"
    # Try root
    curl -L "https://hf-mirror.com/anyisalin/$MODEL_ID/resolve/main/preprocessor_config.json" -o "$TARGET_DIR/preprocessor_config.json" --fail --silent || echo "   [INFO] No preprocessor_config.json found (optional)"
else
    echo "   [SKIP] preprocessor_config.json exists"
fi

# 3. Download model.onnx (from onnx/ subdirectory)
if [ ! -s "$TARGET_DIR/model.onnx" ]; then
    echo "   [GET] model.onnx (from onnx/)"
    curl -L "https://hf-mirror.com/anyisalin/$MODEL_ID/resolve/main/onnx/model.onnx" -o "$TARGET_DIR/model.onnx" --fail || echo "   [WARN] Failed to download model.onnx"
else
    echo "   [SKIP] model.onnx exists"
fi

# 4. Download migan_pipeline.onnx if preferred (also in onnx/)
# Let's check both or stick to model.onnx if standard


echo "MI-GAN Download Complete."

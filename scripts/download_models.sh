#!/bin/bash

# Ultimate script to download required AI models for local execution.
# Uses hf-mirror.com to bypass persistent 401 errors on some machines.

BASE_DIR="public/assets/models"

download_file() {
    local url=$1
    local target=$2
    
    mkdir -p "$(dirname "$target")"
    
    if [ -f "$target" ] && [ $(stat -c%s "$target") -gt 1000 ]; then
        echo "   [SKIP] Valid $(basename "$target") already exists"
    else
        echo "   [GET] $(basename "$target")"
        # Try mirror first since it's more reliable in this environment
        curl -L --no-netrc -f "$url" -o "$target"
        
        if [ $? -ne 0 ]; then
             echo "   [ERROR] Failed to download $(basename "$target") from $url"
        fi
    fi
}

# 1. MobileNet (Auto-fix) - ID in code: Xenova/mobilenet_v1_1.0_224_quantized
echo "--- Ensuring MobileNet V1 ---"
# Using onnx-community which is the same as Xenova's but easier to mirror
MODEL_ID="Xenova/mobilenet_v1_1.0_224_quantized"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/onnx-community/mobilenet_v1_1.0_224/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model_quantized.onnx" "$DIR/onnx/model_quantized.onnx"

# 2. Swin2SR (Upscale - Classic x2) - ID in code: caidas/swin2SR-classical-sr-x2-64
echo "--- Ensuring Swin2SR Classic ---"
MODEL_ID="caidas/swin2SR-classical-sr-x2-64"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/Xenova/swin2SR-classical-sr-x2-64/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model_quantized.onnx" "$DIR/onnx/model_quantized.onnx"

# 3. Swin2SR (Upscale - Lightweight x2)
echo "--- Ensuring Swin2SR Lightweight ---"
MODEL_ID="Xenova/swin2SR-lightweight-x2-64"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/Xenova/swin2SR-lightweight-x2-64/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model_quantized.onnx" "$DIR/onnx/model_quantized.onnx"

# 4. Swin2SR (Upscale - Realworld Pro x4)
echo "--- Ensuring Swin2SR Realworld ---"
MODEL_ID="Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model_quantized.onnx" "$DIR/onnx/model_quantized.onnx"

# 5. Swin2SR (Upscale - Compressed Restore x4)
echo "--- Ensuring Swin2SR Compressed ---"
MODEL_ID="Xenova/swin2SR-compressed-sr-x4-48"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/Xenova/swin2SR-compressed-sr-x4-48/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model_quantized.onnx" "$DIR/onnx/model_quantized.onnx"

# 6. BiRefNet (RMBG v2.0 - Background Removal) - ID: onnx-community/BiRefNet-ONNX
echo "--- Ensuring BiRefNet ---"
MODEL_ID="onnx-community/BiRefNet-ONNX"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/onnx-community/BiRefNet-ONNX/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model.onnx" "$DIR/onnx/model.onnx"

# 7. SAM 2.1 Tiny (Segmentation) - ID: onnx-community/sam2.1-hiera-tiny-ONNX
echo "--- Ensuring SAM 2.1 ---"
MODEL_ID="onnx-community/sam2.1-hiera-tiny-ONNX"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/onnx-community/sam2.1-hiera-tiny-ONNX/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model.onnx" "$DIR/onnx/model.onnx"

# 8. Depth Anything V2 Small - ID: onnx-community/depth-anything-v2-small
echo "--- Ensuring Depth Anything V2 ---"
MODEL_ID="onnx-community/depth-anything-v2-small"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/onnx-community/depth-anything-v2-small/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model_quantized.onnx" "$DIR/onnx/model_quantized.onnx"

# 9. LaMa-Next (Inpainting) - ID: onnx-community/lama-fp16-onnx
echo "--- Ensuring LaMa ---"
MODEL_ID="onnx-community/lama-fp16-onnx"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/onnx-community/lama-fp16-onnx/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/onnx/model.onnx" "$DIR/onnx/model.onnx"

# 10. RMBG-1.4 (Previous Background Removal) - ID: Xenova/RMBG-1.4
echo "--- Ensuring RMBG-1.4 ---"
MODEL_ID="Xenova/RMBG-1.4"
DIR="$BASE_DIR/$MODEL_ID"
MIRROR_BASE="https://hf-mirror.com/Xenova/RMBG-1.4/resolve/main"

download_file "$MIRROR_BASE/config.json" "$DIR/config.json"
download_file "$MIRROR_BASE/preprocessor_config.json" "$DIR/preprocessor_config.json"
download_file "$MIRROR_BASE/onnx/model.onnx" "$DIR/onnx/model.onnx"

echo "--- Script finished. ---"

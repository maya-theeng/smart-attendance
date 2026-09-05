"""
Utility functions for image conversion and preprocessing.
"""

import base64
import io
import numpy as np
from PIL import Image


def base64_to_pil(base64_string: str) -> Image.Image:
    """
    Convert a base64-encoded image string to a PIL Image.
    Handles both raw base64 and data URI format (data:image/...;base64,...).
    """
    # Strip data URI prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",", 1)[1]

    image_bytes = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_bytes))

    # Convert to RGB if necessary (handles RGBA, grayscale, etc.)
    if image.mode != "RGB":
        image = image.convert("RGB")

    return image


def pil_to_base64(pil_image: Image.Image, format: str = "JPEG") -> str:
    """
    Convert a PIL Image to a base64-encoded string.
    """
    buffer = io.BytesIO()
    pil_image.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def preprocess_face(face_crop: np.ndarray, target_size: int = 160) -> np.ndarray:
    """
    Resize and normalize a face crop for FaceNet input.
    
    Args:
        face_crop: numpy array of the cropped face (H, W, C)
        target_size: target dimension (FaceNet expects 160x160)
    
    Returns:
        Preprocessed numpy array ready for the model
    """
    from PIL import Image as PILImage

    if isinstance(face_crop, np.ndarray):
        img = PILImage.fromarray(face_crop.astype(np.uint8))
    else:
        img = face_crop

    img = img.resize((target_size, target_size), PILImage.BILINEAR)
    arr = np.array(img, dtype=np.float32)

    # Normalize to [-1, 1] range (standard for FaceNet)
    arr = (arr - 127.5) / 128.0

    return arr

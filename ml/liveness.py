import cv2
import numpy as np
import logging
from PIL import Image

logger = logging.getLogger(__name__)


def _compute_lbp_entropy(gray: np.ndarray) -> float:
    rows, cols = gray.shape
    lbp = np.zeros_like(gray, dtype=np.uint8)
    radius, n_points = 1, 8

    for i in range(radius, rows - radius):
        for j in range(radius, cols - radius):
            center = gray[i, j]
            binary = 0
            for k in range(n_points):
                angle = 2 * np.pi * k / n_points
                ni = int(i - round(radius * np.sin(angle)))
                nj = int(j + round(radius * np.cos(angle)))
                ni = np.clip(ni, 0, rows - 1)
                nj = np.clip(nj, 0, cols - 1)
                if gray[ni, nj] >= center:
                    binary |= (1 << k)
            lbp[i, j] = binary

    hist, _ = np.histogram(lbp.ravel(), bins=256, range=(0, 256))
    hist = hist.astype(np.float64) / (hist.sum() + 1e-10)
    entropy = -np.sum(hist * np.log2(hist + 1e-10))
    return float(entropy)


def detect_screen_spoof(
    pil_frame: Image.Image,
    bbox: dict
) -> tuple:
   
    try:
        x, y, w, h = int(bbox["x"]), int(bbox["y"]), int(bbox["w"]), int(bbox["h"])
        img_w, img_h = pil_frame.size

        frame_np = np.array(pil_frame)
        frame_bgr = cv2.cvtColor(frame_np, cv2.COLOR_RGB2BGR)

        # TIGHT BEZEL RING (12% padding)
        # Sample pixels in a NARROW ring immediately surrounding the face bbox.
        # This samples the actual phone/tablet bezel — not the distant background.
        # Phone bezel: dark (mean < 55), uniform (std < 25), much darker than the face.
        # Real background: varied colors, often similar luminance to the face.
        tight_pad_x = max(6, int(w * 0.12))
        tight_pad_y = max(6, int(h * 0.12))

        # Inner face region (the MTCNN detected face)
        fx1 = max(0, x);       fy1 = max(0, y)
        fx2 = min(img_w, x+w); fy2 = min(img_h, y+h)

        # Outer ring boundary
        ox1 = max(0, x - tight_pad_x);     oy1 = max(0, y - tight_pad_y)
        ox2 = min(img_w, x+w + tight_pad_x); oy2 = min(img_h, y+h + tight_pad_y)

        bezel_score = 1.0  # default: no spoof signal
        border_mean_val = -1.0
        border_std_val  = -1.0

        if fx2 > fx1 and fy2 > fy1 and ox2 > ox1 and oy2 > oy1:
            face_region = frame_bgr[fy1:fy2, fx1:fx2]
            outer_region = frame_bgr[oy1:oy2, ox1:ox2]

            # Build a boolean mask for the ring (outer minus inner)
            ring_mask = np.ones(outer_region.shape[:2], dtype=bool)
            iy1 = fy1 - oy1; iy2 = iy1 + (fy2 - fy1)
            ix1 = fx1 - ox1; ix2 = ix1 + (fx2 - fx1)
            if 0 <= iy1 < iy2 <= ring_mask.shape[0] and 0 <= ix1 < ix2 <= ring_mask.shape[1]:
                ring_mask[iy1:iy2, ix1:ix2] = False

            ring_pixels = outer_region[ring_mask]  # shape (N, 3) — BGR

            if len(ring_pixels) >= 30:
                # Weighted BGR → luminance
                ring_lum = (
                    0.114 * ring_pixels[:, 0].astype(np.float32) +
                    0.587 * ring_pixels[:, 1].astype(np.float32) +
                    0.299 * ring_pixels[:, 2].astype(np.float32)
                )
                border_mean_val = float(np.mean(ring_lum))
                border_std_val  = float(np.std(ring_lum))

                face_gray_mean = float(np.mean(cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)))

                # Phone/tablet bezel signature:
                #   Very dark (mean < 55) AND very uniform (std < 28)
                #   AND face is significantly brighter than the border (screen emits light)
                if (border_mean_val < 55 and
                        border_std_val < 28 and
                        (face_gray_mean - border_mean_val) > 35):
                    darkness   = max(0.0, 1.0 - border_mean_val / 55.0)
                    uniformity = max(0.0, 1.0 - border_std_val  / 28.0)
                    bezel_score = 1.0 - (darkness * uniformity)  # closer to 0 = strong bezel

        # SCREEN BACKLIGHT (face luminance + saturation)
        # Phone/laptop screens are self-illuminated:
        # high mean luminance (Y > 155) AND relatively uniform (Y std < 40)
        #OR very high V (brightness) combined with high S (saturation)
        # Real faces under room light: Y mean 80–145, natural variation.
        backlight_score = 1.0
        y_mean_val = -1.0

        if fx2 > fx1 and fy2 > fy1:
            face_region = frame_bgr[fy1:fy2, fx1:fx2]
            if face_region.size > 0:
                face_ycrcb = cv2.cvtColor(face_region, cv2.COLOR_BGR2YCrCb)
                face_hsv   = cv2.cvtColor(face_region, cv2.COLOR_BGR2HSV)

                y_mean_val = float(np.mean(face_ycrcb[:, :, 0]))
                y_std      = float(np.std(face_ycrcb[:, :, 0]))
                s_mean     = float(np.mean(face_hsv[:, :, 1]))
                v_mean     = float(np.mean(face_hsv[:, :, 2]))

                # Strong backlight evidence
                if (y_mean_val > 160 and y_std < 40) or (v_mean > 195 and s_mean > 140):
                    backlight_score = 0.05
                # Moderate brightness (could be screen or bright room light)
                elif y_mean_val > 145:
                    backlight_score = max(0.35, 1.0 - (y_mean_val - 145) / 60.0)

        # LBP MICRO-TEXTURE ON FACE CROP
        # Screen-rendered faces look "smooth" — webcam→JPEG→LCD→webcam double-compression
        # flattens micro-textures. LBP entropy < 5.2 suggests screen origin.
        lbp_score = 1.0
        lbp_entropy_val = -1.0

        if fx2 > fx1 and fy2 > fy1:
            face_region = frame_bgr[fy1:fy2, fx1:fx2]
            if face_region.size > 0:
                face_small = cv2.resize(face_region, (60, 60))
                face_gray  = cv2.cvtColor(face_small, cv2.COLOR_BGR2GRAY)
                lbp_entropy_val = _compute_lbp_entropy(face_gray)

                if lbp_entropy_val >= 5.8:
                    lbp_score = 1.0   # complex texture → real skin
                elif lbp_entropy_val <= 4.2:
                    lbp_score = 0.0   # very smooth → screen/print
                else:
                    lbp_score = (lbp_entropy_val - 4.2) / 1.6

        # COMBINE: weighted combination with hard veto
        combined = (0.45 * bezel_score) + (0.35 * backlight_score) + (0.20 * lbp_score)

        # Hard veto: if bezel is unambiguously detected, cap the score
        if bezel_score < 0.25:
            combined = min(combined, 0.32)
        # Hard veto: if both backlight AND LBP agree it's a screen
        if backlight_score < 0.15 and lbp_score < 0.35:
            combined = min(combined, 0.38)

        is_live = combined >= 0.55

        details = {
            "method": "screen_context",
            "bezel_score": round(bezel_score, 3),
            "backlight_score": round(backlight_score, 3),
            "lbp_score": round(lbp_score, 3),
            "border_mean": round(border_mean_val, 1),
            "border_std": round(border_std_val, 1),
            "face_y_mean": round(y_mean_val, 1),
            "lbp_entropy": round(lbp_entropy_val, 3),
        }
        logger.info(
            f"Screen-spoof: is_live={is_live}, score={combined:.4f} | "
            f"bezel={bezel_score:.3f} backlight={backlight_score:.3f} lbp={lbp_score:.3f}"
        )
        return is_live, float(combined), details

    except Exception as e:
        logger.error(f"Screen spoof check failed: {e}", exc_info=True)
        return True, 1.0, {"method": "screen", "error": str(e)}


def detect_liveness(pil_crop: Image.Image) -> tuple:
    try:
        img_np = np.array(pil_crop)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        img_bgr = cv2.resize(img_bgr, (80, 80))
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        #LBP entropy
        lbp_entropy = _compute_lbp_entropy(gray)
        if lbp_entropy >= 6.0:
            lbp_score = 1.0
        elif lbp_entropy <= 4.0:
            lbp_score = 0.0
        else:
            lbp_score = (lbp_entropy - 4.0) / 2.0

        # Specular fraction (screens have large glare patches)
        specular_fraction = float(np.sum(gray > 220) / gray.size)
        if specular_fraction <= 0.04:
            specular_score = 1.0
        elif specular_fraction >= 0.15:
            specular_score = 0.0
        else:
            specular_score = 1.0 - (specular_fraction - 0.04) / 0.11

        # Gradient depth-of-field variation 
        gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        grad = np.sqrt(gx**2 + gy**2)
        h2, w2 = gray.shape[0] // 2, gray.shape[1] // 2
        q_means = np.array([
            np.mean(grad[:h2, :w2]), np.mean(grad[:h2, w2:]),
            np.mean(grad[h2:, :w2]), np.mean(grad[h2:, w2:]),
        ])
        qcv = float(np.std(q_means) / (np.mean(q_means) + 1e-10))
        if qcv >= 0.12:
            depth_score = 1.0
        elif qcv <= 0.04:
            depth_score = 0.0
        else:
            depth_score = (qcv - 0.04) / 0.08

        # Skin chrominance 
        ycrcb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
        min_chrom = min(float(np.std(ycrcb[:, :, 1])), float(np.std(ycrcb[:, :, 2])))
        if min_chrom >= 1.0:
            chrom_score = 1.0
        elif min_chrom <= 0.4:
            chrom_score = 0.2
        else:
            chrom_score = 0.2 + 0.8 * ((min_chrom - 0.4) / 0.6)

        combined_score = (
            0.40 * lbp_score +
            0.20 * specular_score +
            0.25 * depth_score +
            0.15 * chrom_score
        )
        if lbp_score < 0.2:
            combined_score = min(combined_score, 0.35)
        if specular_score < 0.2:
            combined_score = min(combined_score, 0.40)

        is_live = combined_score >= 0.50

        details = {
            "lbp_entropy": round(lbp_entropy, 4),
            "specular_fraction": round(specular_fraction, 4),
            "quadrant_cv": round(qcv, 4),
            "cr_std": round(float(np.std(ycrcb[:, :, 1])), 2),
            "cb_std": round(float(np.std(ycrcb[:, :, 2])), 2),
            "scores": {
                "lbp": round(lbp_score, 2),
                "specular": round(specular_score, 2),
                "depth": round(depth_score, 2),
                "chrom": round(chrom_score, 2),
            }
        }
        logger.info(f"Single-frame liveness: is_live={is_live}, score={combined_score:.4f}, details={details}")
        return is_live, float(combined_score), details

    except Exception as e:
        logger.error(f"Liveness detection failed: {e}", exc_info=True)
        # Fail open — don't lock out real users due to processing errors
        return True, 0.60, {"error": str(e)}

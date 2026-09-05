import logging
import numpy as np
import torch
from PIL import Image
from typing import Optional

logger = logging.getLogger(__name__)

#Global singleton instance
_face_service_instance = None

def get_face_service():
    global _face_service_instance
    if _face_service_instance is None:
        _face_service_instance = FaceRecognitionService()
    return _face_service_instance


class FaceRecognitionService:
    def __init__(self, device: str = None, recognition_threshold: float = 0.65):
        from facenet_pytorch import MTCNN, InceptionResnetV1

        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        self.recognition_threshold = recognition_threshold

        logger.info(f"Loading MTCNN + FaceNet models on {self.device}...")

        # MTCNN for face detection
        # keep_all=True returns ALL detected faces (for group photos)
        # min_face_size: minimum face pixel size to detect
        self.mtcnn = MTCNN(
            keep_all=True,
            device=self.device,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],  # Detection confidence thresholds for 3 stages
            post_process=True,  # Normalize face crops to [-1, 1]
            image_size=160,  # Output face crop size (FaceNet expects 160x160)
        )

        # MTCNN for single-face registration (returns best face only)
        self.mtcnn_single = MTCNN(
            keep_all=False,
            device=self.device,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            post_process=True,
            image_size=160,
        )

        # FaceNet (InceptionResnetV1) for generating 512-d embeddings
        # pretrained='vggface2' — trained on VGGFace2 dataset (better for diverse faces)
        self.facenet = InceptionResnetV1(
            pretrained="vggface2"
        ).eval().to(self.device)

        logger.info("Face recognition models loaded successfully.")

    def detect_faces(self, image: Image.Image) -> dict:
        try:
            # MTCNN returns aligned face tensors and bounding boxes
            faces, probs = self.mtcnn(image, return_prob=True)
            boxes, _ = self.mtcnn.detect(image)

            if faces is None or boxes is None:
                return {"faces": None, "boxes": None, "probs": None, "count": 0}

            return {
                "faces": faces,
                "boxes": boxes,
                "probs": probs if isinstance(probs, np.ndarray) else np.array([probs]),
                "count": len(boxes),
            }
        except Exception as e:
            logger.error(f"Face detection failed: {e}")
            return {"faces": None, "boxes": None, "probs": None, "count": 0}

    def get_embeddings(self, face_tensors: torch.Tensor) -> np.ndarray:
        with torch.no_grad():
            if face_tensors.dim() == 3:
                face_tensors = face_tensors.unsqueeze(0)
            
            face_tensors = face_tensors.to(self.device)
            embeddings = self.facenet(face_tensors)

        return embeddings.cpu().numpy()

    def register_face(self, image: Image.Image) -> Optional[list]:
        try:
            # Use single-face MTCNN (returns best face only)
            face_tensor = self.mtcnn_single(image)

            if face_tensor is None:
                raise ValueError("No face detected in the image. Please ensure the face is clearly visible.")

            # Generate embedding
            with torch.no_grad():
                face_tensor = face_tensor.unsqueeze(0).to(self.device)
                embedding = self.facenet(face_tensor)

            # Convert to list of floats for JSON storage
            embedding_list = embedding.cpu().numpy().flatten().tolist()

            logger.info(f"Face registered successfully. Embedding dimension: {len(embedding_list)}")
            return embedding_list

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Face registration failed: {e}")
            raise ValueError(f"Face registration failed: {str(e)}")

    def recognize_faces(self, image: Image.Image, known_encodings: list) -> list:
        # Detect all faces
        detection = self.detect_faces(image)

        if detection["count"] == 0:
            return []

        faces = detection["faces"]
        boxes = detection["boxes"]

        #Generate embeddings for all detected faces
        embeddings = self.get_embeddings(faces)

        #Build known embeddings matrix for efficient comparison
        from ml.liveness import detect_liveness
        
        width, height = image.size

        if not known_encodings:
            # No known faces to match against — return all as unknown
            results = []
            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = box.astype(int).tolist()
                bbox = {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1}
                
                # Crop face and detect liveness
                x1_c = max(0, x1)
                y1_c = max(0, y1)
                x2_c = min(width, x2)
                y2_c = min(height, y2)
                face_crop = image.crop((x1_c, y1_c, x2_c, y2_c))
                is_live, liveness_score, liveness_details = detect_liveness(face_crop)
                
                results.append({
                    "student_id": None,
                    "name": "Unknown",
                    "confidence": 0.0,
                    "bbox": bbox,
                    "matched": False,
                    "is_live": is_live,
                    "liveness_score": round(liveness_score, 4),
                    "liveness_details": liveness_details
                })
            return results

        known_matrix = np.array([enc["encoding"] for enc in known_encodings])
        known_ids = [enc["student_id"] for enc in known_encodings]
        known_names = [enc["name"] for enc in known_encodings]

        #Match each detected face against known encodings
        results = []
        for i, (embedding, box) in enumerate(zip(embeddings, boxes)):
            x1, y1, x2, y2 = box.astype(int).tolist()
            bbox = {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1}

            # Crop face and detect liveness
            x1_c = max(0, x1)
            y1_c = max(0, y1)
            x2_c = min(width, x2)
            y2_c = min(height, y2)
            face_crop = image.crop((x1_c, y1_c, x2_c, y2_c))
            is_live, liveness_score, liveness_details = detect_liveness(face_crop)

            # Compute cosine similarity with all known faces
            similarities = self._cosine_similarity_batch(embedding, known_matrix)
            best_idx = np.argmax(similarities)
            best_score = float(similarities[best_idx])

            if best_score >= self.recognition_threshold:
                results.append({
                    "student_id": known_ids[best_idx],
                    "name": known_names[best_idx],
                    "confidence": round(best_score, 4),
                    "bbox": bbox,
                    "matched": True,
                    "is_live": is_live,
                    "liveness_score": round(liveness_score, 4),
                    "liveness_details": liveness_details
                })
            else:
                results.append({
                    "student_id": None,
                    "name": "Unknown",
                    "confidence": round(best_score, 4),
                    "bbox": bbox,
                    "matched": False,
                    "is_live": is_live,
                    "liveness_score": round(liveness_score, 4),
                    "liveness_details": liveness_details
                })

        logger.info(
            f"Recognition complete: {detection['count']} faces detected, "
            f"{sum(1 for r in results if r['matched'])} matched, "
            f"{sum(1 for r in results if not r['is_live'])} spoof(s) detected"
        )
        return results

    @staticmethod
    def _cosine_similarity_batch(embedding: np.ndarray, known_matrix: np.ndarray) -> np.ndarray:

        # Normalize vectors
        emb_norm = embedding / (np.linalg.norm(embedding) + 1e-10)
        known_norms = known_matrix / (np.linalg.norm(known_matrix, axis=1, keepdims=True) + 1e-10)

        # Dot product = cosine similarity (since vectors are normalized)
        similarities = np.dot(known_norms, emb_norm)

        return similarities

    def get_face_count(self, image: Image.Image) -> int:
        #Quick utility to count faces in an image without generating embeddings.
        detection = self.detect_faces(image)
        return detection["count"]

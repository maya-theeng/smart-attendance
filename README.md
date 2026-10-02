# Smart Attendance System 🎓

An automated, AI-driven Facial Recognition Attendance Management System designed for academic institutions following the Tribhuvan University (TU) curriculum structure.

The system replaces manual roll-calling with real-time biometric verification using state-of-the-art deep learning models, robust anti-spoofing / liveness detection, and an interactive multi-role web portal.

---

## Key Features

* **AI Face Recognition**:
  * **Face Detection**: Multi-task Cascaded Convolutional Networks (**MTCNN**) for both single-face enrollment and group-photo multi-face detection.
  * **Embeddings**: **FaceNet** (`InceptionResnetV1` pre-trained on VGGFace2) extracting 512-dimensional biometric feature vectors.
  * **Vectorized Cosine Similarity Matching**: Efficient dot-product batch matching ($\ge 0.65$ confidence threshold).
* **Multi-Layer Anti-Spoofing & Liveness**:
  * **LBP Texture Analysis**: Computes Local Binary Patterns entropy to detect printed paper photo attacks.
  * **Screen Bezel Ring Detection**: Analyzes luminance uniformity and bezel dark edges to detect phones/tablets shown to the camera.
  * **Glare / Specular Reflection Check**: Identifies glass/screen reflective hot spots.
* **Role-Based Portals**:
  * **Admin Portal**: Analytics dashboard, monthly trends, student/teacher enrollment, webcam biometric enrollment, live multi-face attendance scanning, syllabus/course manager, and automated email warning triggers.
  * **Teacher Portal**: Assigned subject schedule, live attendance scanning, student records, and class logs.
  * **Student Portal**: Real-time personal attendance percentage, per-subject breakdown, and absentee warning notifications.
* **Automated Email Notifications**:
  * Sends automated email alerts to students with low attendance or multiple consecutive absences via SMTP.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons, Chart.js, React-Router v7 |
| **Backend** | Python 3.12, Django 6.0, Django REST Framework, Token Authentication |
| **Machine Learning** | PyTorch, `facenet-pytorch`, OpenCV, NumPy, SciPy, Pillow |
| **Database** | MySQL (`smart_attendance` database) |
| **Timezone** | `Asia/Kathmandu` (Nepal Standard Time) |

